# app/infrastructure/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def make_session_factory(db_url: str):
    engine = create_engine(db_url, future=True)
    return sessionmaker(
        bind=engine, 
        expire_on_commit=False, 
        autoflush=False, 
        future=True
    ), engine
