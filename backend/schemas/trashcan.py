from pydantic import BaseModel
from datetime import datetime

class TrashcanBase(BaseModel):
    name: str
    location_lat: float
    location_lon: float
    max_height_cm: float
    full_threshold_cm: float

class TrashcanRequest(TrashcanBase):
    pass

class TrashcanUpdate(TrashcanBase):
    pass

class TrashcanResponse(TrashcanBase):
    id: str

    class Config:
        from_attributes = True  # Read from SQLAlchemy models

class TrashcanMetricCreate(BaseModel):
    time: datetime
    device_id: str
    distance_cm: float

class TrashcanMetricResponse(TrashcanMetricCreate):
    fill_percentage: float

    class Config:
        from_attributes = True