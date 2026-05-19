from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from models.trashcan import Trashcan

from core.config import settings

engine = create_engine(
    settings.DATABASE_URL
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)

    # Set up TimescaleDB extension and hypertables
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb"))
        conn.execute(
            text(
                "SELECT create_hypertable('trashcan_metrics', 'time', if_not_exists => TRUE)"
            )
        )
        conn.commit()

def seed_initial_trashcans():
    """
    Insert four predefined trashcans if they don't already exist.
    Call this after create_tables() once at startup or during initialization.
    """

    bins = [
        {"id": "can-001", "name": "Park Bin 1", "location_lat": 47.4979, "location_lon": 19.0402, "max_height_cm": 180.0, "full_threshold_cm": 5.0},
        {"id": "can-002", "name": "Park Bin 2", "location_lat": 47.4980, "location_lon": 19.0405, "max_height_cm": 120.0, "full_threshold_cm": 4.0},
        {"id": "can-003", "name": "Square Bin 1", "location_lat": 47.4985, "location_lon": 19.0410, "max_height_cm": 200.0, "full_threshold_cm": 5.0},
        {"id": "can-004", "name": "Square Bin 2", "location_lat": 47.4986, "location_lon": 19.0412, "max_height_cm": 200.0, "full_threshold_cm": 5.0},
    ]

    db = SessionLocal()
    try:
        for b in bins:
            existing = db.query(Trashcan).filter(Trashcan.id == b["id"]).first()
            if not existing:
                db.add(Trashcan(**b))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()