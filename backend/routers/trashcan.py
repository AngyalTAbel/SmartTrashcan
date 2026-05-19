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
    # Mock prediction logic
    # In a real app, this would use a linear regression or ML model
    return {
        "device_id": device_id,
        "predicted_full_timestamp": (datetime.now(timezone.utc) + timedelta(hours=5)).timestamp(),
        "message": "Predicted to be full in approximately 5 hours."
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
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    metrics = (
        db.query(TrashcanMetric)
        .filter(
            TrashcanMetric.device_id == device_id,
            TrashcanMetric.time > cutoff,
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
                    ((trashcan.max_height_cm - metric.distance_cm) / trashcan.max_height_cm) * 100.0,
                ),
            ),
        }
        for metric in metrics
    ]