# app/infrastructure/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def make_session_factory(db_url: str):
    engine_kwargs = {"future": True}
    if db_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    engine = create_engine(db_url, **engine_kwargs)
    return sessionmaker(
        bind=engine, 
        expire_on_commit=False, 
        autoflush=False, 
        future=True
    ), engine
