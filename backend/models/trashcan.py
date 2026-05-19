from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from db.database import Base

class Trashcan(Base):
    __tablename__ = "trashcans"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    location_lat: Mapped[float] = mapped_column(Float)
    location_lon: Mapped[float] = mapped_column(Float)
    max_height_cm: Mapped[float] = mapped_column(Float)
    full_threshold_cm: Mapped[float] = mapped_column(Float)

    metrics: Mapped[list["TrashcanMetric"]] = relationship(
        "TrashcanMetric", back_populates="trashcan", cascade="all, delete-orphan"
    )

class TrashcanMetric(Base):
    __tablename__ = "trashcan_metrics"

    # or maybe use this instead of the two primary keys
    #id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("trashcans.id"), primary_key=True)
    distance_cm: Mapped[float] = mapped_column(Float)

    trashcan: Mapped["Trashcan"] = relationship("Trashcan", back_populates="metrics")