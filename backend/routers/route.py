from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from models.trashcan import Trashcan, TrashcanMetric
from sqlalchemy import func
import math
from typing import List
from core.config import settings
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import requests

router = APIRouter(
    prefix="/routes",
    tags=["routes"]
)

@router.get("/optimize")
def get_optimized_route(db: Session = Depends(get_db)):
    # Lekérjük a DB-ből a szűrt, teli kukákat
    bins_to_empty = get_bins_to_empty(db) 
    
    # Kiszámoljuk a sorrendet
    optimized_locations = calculate_optimal_route(bins_to_empty, settings.DEPOT_LAT, settings.DEPOT_LNG)
    
    # Visszaküldjük a frontendnek
    return {
        "status": "success",
        "total_points": len(optimized_locations),
        "route": optimized_locations # Ez egy sorba rendezett [{lat, lng}, ...] lista
    }

def get_bins_to_empty(db: Session):
    # Minden kuka legutolsó (MAX) mérési időpontja
    latest_reading_times = (
        db.query(
            TrashcanMetric.device_id,
            func.max(TrashcanMetric.time).label("max_time")
        )
        .group_by(TrashcanMetric.device_id)
        .subquery()
    )

    # Összekötjük a Kukát, a legfrissebb mérést, és szűrünk a cm-re
    bins_to_collect = (
        db.query(Trashcan)
        .join(TrashcanMetric, Trashcan.id == TrashcanMetric.device_id)
        .join(
            latest_reading_times,
            (TrashcanMetric.device_id == latest_reading_times.c.device_id) & 
            (TrashcanMetric.time == latest_reading_times.c.max_time)
        )
        .filter(TrashcanMetric.distance_cm <= (Trashcan.full_threshold_cm + 10))
        .all()
    )
    
    return bins_to_collect

# --- 1. LÉPÉS: LÉGVONALBELI TÁVOLSÁG (IDŐBEN) MÁTRIX KÉSZÍTÉSE ---
def create_distance_matrix(locations: List[dict]):
    """
    Lekéri a valós úthálózaton mért utazási idő mátrixot az OSRM API-n keresztül.
    locations: [{'lat': 47.1, 'lng': 19.1}, ...]
    Visszatérési érték: Egy N x N-es mátrix, ahol az értékek másodpercben vannak megadva.
    """
    if not locations:
        return []

    # 1. Koordináták összefűzése OSRM formátumba: "lng,lat;lng,lat;lng,lat"
    # FIGYELEM: Az OSRM-nek a 'lng' kell előre!
    coord_string = ";".join([f"{loc['lng']},{loc['lat']}" for loc in locations])
    
    # 2. OSRM Table API URL összeállítása (driving = autós útvonal)
    url = f"http://router.project-osrm.org/table/v1/driving/{coord_string}?annotations=duration"
    
    try:
        # Lekérjük az adatokat az API-tól
        response = requests.get(url, timeout=10)
        response_json = response.json()
        
        if response_json.get("code") == "Ok":
            # A durations egy N x N-es mátrix másodpercben (float)
            # Az OR-Tools-nak egészek (int) kellenek, ezért kerekítünk
            raw_matrix = response_json["durations"]
            
            integer_matrix = []
            for row in raw_matrix:
                # Ha az OSRM valamiért None-t adna vissza (pl. elérhetetlen pont), nullázzuk
                integer_matrix.append([int(cell) if cell is not None else 0 for cell in row])
                
            return integer_matrix
        else:
            raise Exception(f"OSRM API hiba: {response_json.get('code')}")
            
    except Exception as e:
        print(f"Nem sikerült elérni az OSRM-et ({e}), biztonsági mentésként légvonalat használunk...")
        # Ide beteheted a régi légvonalbeli függvényedet fallback-nek, ha az API lehalna
        return create_fallback_air_distance_matrix(locations)

# Fallback légvonalbeli mérésre, ha az úthálózaton mért nem működik
def create_fallback_air_distance_matrix(locations: List[dict]):
    """
    Kiszámolja a pontok közötti légvonalbeli távolságot.
    locations: [{'lat': 47.1, 'lng': 19.1}, ...]
    Mivel az OR-Tools egészekkel (int) dolgozik, a távolságot méterben kapjuk meg, 
    és kerekítjük.
    """
    matrix = []
    for i in range(len(locations)):
        row = []
        for j in range(len(locations)):
            if i == j:
                row.append(0)
            else:
                # Egyszerűsített Haversine képlet a méterben vett távolsághoz
                R = 6371000 # Föld sugara méterben
                lat1, lng1 = math.radians(locations[i]['lat']), math.radians(locations[i]['lng'])
                lat2, lng2 = math.radians(locations[j]['lat']), math.radians(locations[j]['lng'])
                
                dlat = lat2 - lat1
                dlng = lng2 - lng1
                
                a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                distance = int(R * c)
                
                row.append(distance)
        matrix.append(row)
    return matrix

# --- 2. LÉPÉS: AZ OR-TOOLS TSP OPTIMALIZÁLÓ ---
def solve_tsp(distance_matrix: List[List[int]], depot_index: int = 0):
    """
    Megoldja az Utazó Ügynök (TSP) problémát a megadott mátrix alapján.
    Visszatér az optimális indexek sorrendjével.
    """
    if not distance_matrix or len(distance_matrix) <= 1:
        return [0]

    # Manager létrehozása: (Helyszínek száma, Járművek száma, Kiindulási pont)
    manager = pywrapcp.RoutingIndexManager(len(distance_matrix), 1, depot_index)
    routing = pywrapcp.RoutingModel(manager)

    # Távolság callback regisztrálása
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)

    # Költségfüggvény beállítása (a távolságot minimalizáljuk)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Keresési paraméterek beállítása
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    # Megoldás
    solution = routing.SolveWithParameters(search_parameters)

    # Útvonal kinyerése a megoldásból
    if solution:
        route = []
        index = routing.Start(0)
        while not routing.IsEnd(index):
            route.append(manager.IndexToNode(index))
            index = solution.Value(routing.NextVar(index))
        route.append(manager.IndexToNode(index)) # Visszatérés a depóba
        return route
    else:
        return []
    
# --- 3. LÉPÉS: AZ ÖSSZEKÖTÉS A FŐ FÜGGVÉNYBEN ---
def calculate_optimal_route(bins_from_db, depot_lat: float, depot_lng: float):
    """
    A DB-ből lekért SQLAlchemy objektumokat és a depót összefésüli,
    majd kiszámolja az optimális sorrendet.
    """
    # Összerakjuk a koordináták listáját. A 0. elem FIXEN a depó (pl. a telephely)
    locations = [{'lat': depot_lat, 'lng': depot_lng}]
    
    # Hozzáadjuk a teli kukák koordinátáit
    for b in bins_from_db:
        locations.append({'lat': b.location_lat, 'lng': b.location_lon})
        
    # 1. Mátrix generálás
    matrix = create_distance_matrix(locations)
    
    # 2. Optimalizálás (indexeket kapunk vissza, pl: [0, 2, 1, 3, 0])
    optimal_indices = solve_tsp(matrix, depot_index=0)
    
    # 3. Az indexek alapján sorba rendezzük a valódi helyszín adatokat
    ordered_route = []
    for idx in optimal_indices:
        ordered_route.append(locations[idx])
        
    return ordered_route
