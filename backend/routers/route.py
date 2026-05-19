from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from models.trashcan import Trashcan, TrashcanMetric
from sqlalchemy import func

router = APIRouter(
    prefix="/routes",
    tags=["routes"]
)

@router.get("/optimize")
def optimize_route(db: Session = Depends(get_db)):
    # Simple optimization: find all bins that are more than 80% full or distance < threshold + 10
    # and return them as a route.
    
    trashcans = db.query(Trashcan).all()
    route = []
    
    for t in trashcans:
        latest_metric = (
            db.query(TrashcanMetric)
            .filter(TrashcanMetric.device_id == t.id)
            .order_by(TrashcanMetric.time.desc())
            .first()
        )
        
        is_critical = False
        if latest_metric:
            # fill_percent = ((t.max_height_cm - latest_metric.distance_cm) / t.max_height_cm) * 100
            if latest_metric.distance_cm <= (t.full_threshold_cm + 10):
                is_critical = True
        
        if is_critical:
            route.append({
                "id": t.id,
                "name": t.name,
                "location_lat": t.location_lat,
                "location_lon": t.location_lon
            })
            
    # In a real TSP solver, we'd sort these by distance. 
    # For now, just return them as they are.
    
    return {"route": route}
