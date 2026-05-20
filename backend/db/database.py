from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

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
                "SELECT create_hypertable('trashcan_metrics', 'time', if_not_exists => TRUE, migrate_data => TRUE)"
            )
        )
        conn.commit()

def seed_initial_trashcans():
    """
    Insert four predefined trashcans if they don't already exist.
    Call this after create_tables() once at startup or during initialization.
    """

    bins = [
        {"id": "can-001", "name": "Hősök tere Bin", "location_lat": 47.5148, "location_lon": 19.0777, "max_height_cm": 180.0, "full_threshold_cm": 10.0},
        {"id": "can-002", "name": "Deák Ferenc tér Bin", "location_lat": 47.4975, "location_lon": 19.0541, "max_height_cm": 180.0, "full_threshold_cm": 10.0},
        {"id": "can-003", "name": "Széll Kálmán tér Bin", "location_lat": 47.5068, "location_lon": 19.0247, "max_height_cm": 180.0, "full_threshold_cm": 10.0},
        {"id": "can-004", "name": "Gellért-hegy Bin", "location_lat": 47.4870, "location_lon": 19.0435, "max_height_cm": 180.0, "full_threshold_cm": 10.0},
    ]

    from models.trashcan import Trashcan

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