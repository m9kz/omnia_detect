from fastapi import FastAPI
from fastapi_injector import InjectorMiddleware, attach_injector
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.di import injector

from app.presentation.routes.images import router as images_router
# from app.presentation.routes.identity import router as identity_router
from app.presentation.routes.train import router as train_router
from app.presentation.routes.dataset import router as dataset_router
from app.presentation.routes.model import router as model_router

def create_app() -> FastAPI:
    app = FastAPI(title="Image Detection API", version="0.1.0")

    app.add_middleware(InjectorMiddleware, injector=injector)
    attach_injector(app, injector)
    
    app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")
    app.include_router(images_router)
    # app.include_router(identity_router)
    app.include_router(train_router)
    app.include_router(dataset_router)
    app.include_router(model_router)
    return app

app = create_app()
