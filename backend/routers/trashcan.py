import uuid
from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, BackgroundTasks, status
from sqlalchemy.orm import Session

from db.database import get_db, SessionLocal
from schemas.trashcan import TrashcanResponse, TrashcanRequest, TrashcanUpdate, TrashcanMetricResponse
from models.trashcan import Trashcan, TrashcanMetric

router = APIRouter(
    prefix="/trashcans",
    tags=["trashcans"]
)

@router.post("", response_model=TrashcanResponse)
def create_trashcan(
    request: TrashcanRequest,
    db: Session = Depends(get_db)
):
    existing_trashcan = db.query(Trashcan).filter(Trashcan.id == request.id).first()
    if existing_trashcan:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Trashcan already exists"
        )
    
    trashcan = Trashcan(
        id=request.id,
        name=request.name,
        location_lat=request.location_lat,
        location_lon=request.location_lon,
        max_height_cm=request.max_height_cm,
        full_threshold_cm=request.full_threshold_cm,
    )

    db.add(trashcan)
    db.commit()
    db.refresh(trashcan)

    return trashcan

@router.put("/{trashcan_id}", response_model=TrashcanResponse)
def update_trashcan(
    trashcan_id: str,
    request: TrashcanUpdate,
    db: Session = Depends(get_db),
):
    trashcan = db.query(Trashcan).filter(Trashcan.id == trashcan_id).first()
    if trashcan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trashcan not found",
        )

    trashcan.name = request.name
    trashcan.location_lat = request.location_lat
    trashcan.location_lon = request.location_lon
    trashcan.max_height_cm = request.max_height_cm
    trashcan.full_threshold_cm = request.full_threshold_cm

    db.commit()
    db.refresh(trashcan)
    return trashcan

@router.delete("/{trashcan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trashcan(trashcan_id: str, db: Session = Depends(get_db)):
    trashcan = db.query(Trashcan).filter(Trashcan.id == trashcan_id).first()
    if trashcan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trashcan not found",
        )

    db.delete(trashcan)
    db.commit()
    return None

@router.get("", response_model=list[TrashcanResponse])
def get_all_trashcans(db: Session = Depends(get_db)):
    trashcans = db.query(Trashcan).order_by(Trashcan.name.asc()).all()
    
    results = []
    for t in trashcans:
        latest_metric = (
            db.query(TrashcanMetric)
            .filter(TrashcanMetric.device_id == t.id)
            .order_by(TrashcanMetric.time.desc())
            .first()
        )
        
        # Create response object manually or use from_orm if possible
        # Since we added extra fields not in DB model, we map them
        res = TrashcanResponse.from_orm(t)
        if latest_metric:
            res.current_distance = latest_metric.distance_cm
            res.last_updated = latest_metric.time
        results.append(res)
        
    return results

@router.get("/{device_id}/prediction")
def get_prediction(device_id: str, db: Session = Depends(get_db)):
    trashcan = db.query(Trashcan).filter(Trashcan.id == device_id).first()
    if not trashcan:
        raise HTTPException(status_code=404, detail="Trashcan not found")

    # Megkeressük a legutolsó MANUÁLIS ürítést (amit a gombbal végeztek)
    # A manuális ürítésnek nincs 'topic'-ja az adatbázisban.
    last_manual_empty = (
        db.query(TrashcanMetric)
        .filter(
            TrashcanMetric.device_id == device_id,
            TrashcanMetric.topic == None
        )
        .order_by(TrashcanMetric.time.desc())
        .first()
    )

    if last_manual_empty:
        start_time = last_manual_empty.time
    else:
        # Ha nincs manuális, keresünk egy 90% feletti üres pontot fallback-nek
        last_auto_empty = (
            db.query(TrashcanMetric)
            .filter(
                TrashcanMetric.device_id == device_id,
                TrashcanMetric.distance_cm >= trashcan.max_height_cm * 0.9
            )
            .order_by(TrashcanMetric.time.desc())
            .first()
        )
        start_time = last_auto_empty.time if last_auto_empty else (datetime.now(timezone.utc) - timedelta(hours=3))

    # Csak az utolsó ürítés óta eltelt adatokat nézzük
    metrics = (
        db.query(TrashcanMetric)
        .filter(TrashcanMetric.device_id == device_id, TrashcanMetric.time >= start_time)
        .order_by(TrashcanMetric.time.asc())
        .all()
    )

    if len(metrics) < 5:
        return {
            "device_id": device_id,
            "predicted_full_timestamp": None,
            "message": "Collecting initial data for trend analysis (need 5 points)..."
        }

    # Ellenőrizzük, hogy elegendő idő telt-e el a pontok között (min. 30 másodperc)
    time_span = (metrics[-1].time - metrics[0].time).total_seconds()
    if time_span < 30:
        return {
            "device_id": device_id,
            "predicted_full_timestamp": None,
            "message": "Waiting for more data to establish a stable trend..."
        }

    # Egyszerű lineáris regresszió...
    x = [m.time.timestamp() for m in metrics]
    y = [m.distance_cm for m in metrics]
    n = len(x)
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_xx = sum(xi * xi for xi in x)

    denominator = (n * sum_xx - sum_x**2)
    if denominator == 0:
        return {"device_id": device_id, "predicted_full_timestamp": None, "message": "Stable level detected."}

    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n

    if slope >= 0:
        return {"device_id": device_id, "predicted_full_timestamp": None, "message": "Bin level is not rising."}

    target_time = (trashcan.full_threshold_cm - intercept) / slope
    current_time = datetime.now(timezone.utc).timestamp()
    
    if target_time < current_time:
        return {
            "device_id": device_id, 
            "predicted_full_timestamp": current_time + 300, 
            "message": "Should be full any moment now!"
        }

    return {
        "device_id": device_id,
        "predicted_full_timestamp": target_time,
        "message": f"Predicted to be full at {datetime.fromtimestamp(target_time, tz=timezone.utc).strftime('%H:%M')} UTC."
    }

@router.get("/{device_id}/history", response_model=list[TrashcanMetricResponse])
def get_device_history(
    device_id: str,
    hours: int = 24,
    db: Session = Depends(get_db)
):
    trashcan = db.query(Trashcan).filter(Trashcan.id == device_id).first()
    if trashcan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trashcan not found"
        )
    
    # Megkeressük a legutolsó MANUÁLIS ürítést gombbal
    last_manual_empty = (
        db.query(TrashcanMetric)
        .filter(
            TrashcanMetric.device_id == device_id,
            TrashcanMetric.topic == None
        )
        .order_by(TrashcanMetric.time.desc())
        .first()
    )

    if last_manual_empty:
        cutoff = last_manual_empty.time
    else:
        # Fallback az auto ürítésre
        last_auto_empty = (
            db.query(TrashcanMetric)
            .filter(
                TrashcanMetric.device_id == device_id,
                TrashcanMetric.distance_cm >= trashcan.max_height_cm * 0.9
            )
            .order_by(TrashcanMetric.time.desc())
            .first()
        )
        cutoff = last_auto_empty.time if last_auto_empty else (datetime.now(timezone.utc) - timedelta(hours=hours))
    
    metrics = (
        db.query(TrashcanMetric)
        .filter(
            TrashcanMetric.device_id == device_id,
            TrashcanMetric.time >= cutoff,
        )
        .order_by(TrashcanMetric.time.asc())
        .all()
    )

    return [
        {
            "time": metric.time,
            "device_id": metric.device_id,
            "distance_cm": metric.distance_cm,
            "fill_percentage": max(
                0.0,
                min(
                    100.0,
                    ((trashcan.max_height_cm - metric.distance_cm) / (trashcan.max_height_cm - trashcan.full_threshold_cm)) * 100.0,
                ),
            ),
        }
        for metric in metrics
    ]

@router.post("/{device_id}/empty", status_code=status.HTTP_201_CREATED)
def empty_trashcan(device_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    trashcan = db.query(Trashcan).filter(Trashcan.id == device_id).first()
    if trashcan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trashcan not found"
        )
    
    # Töröljük az utolsó 10 másodperc méréseit, hogy elkerüljük a "stale" adatokat
    # amik még a szimulátor resetelése előtt érkeztek/érkezhettek
    now = datetime.now(timezone.utc)
    db.query(TrashcanMetric).filter(
        TrashcanMetric.device_id == device_id,
        TrashcanMetric.time >= now - timedelta(seconds=10)
    ).delete()

    # Új mérés hozzáadása, ami azt jelzi, hogy a kuka üres (távolság = max magasság)
    new_metric = TrashcanMetric(
        time=now,
        device_id=device_id,
        distance_cm=trashcan.max_height_cm
    )
    
    db.add(new_metric)
    db.commit()

    # MQTT üzenet küldése a szimulátornak, hogy nullázza a belső állapotát
    def notify_simulator():
        import paho.mqtt.publish as publish
        try:
            publish.single(f"trashcan/public/{device_id}/empty", payload="reset", hostname="mosquitto")
        except Exception as e:
            print(f"Failed to notify simulator: {e}")

    background_tasks.add_task(notify_simulator)

    return {"message": f"Trashcan {device_id} emptied successfully"}