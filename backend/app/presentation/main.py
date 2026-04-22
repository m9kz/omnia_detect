from contextlib import asynccontextmanager

from app.core.di import injector
from app.infrastructure.train_job_runner import TrainJobRunner
from app.presentation.routes.auth import router as auth_router
from app.presentation.routes.dataset import router as dataset_router
from app.presentation.routes.images import router as images_router
from app.presentation.routes.jobs import router as jobs_router
from app.presentation.routes.model import router as model_router
from app.presentation.routes.train import router as train_router
from fastapi import FastAPI
from fastapi_injector import InjectorMiddleware, attach_injector


@asynccontextmanager
async def lifespan(_: FastAPI):
    runner = injector.get(TrainJobRunner)
    runner.start()
    runner.resume_pending_jobs()
    try:
        yield
    finally:
        runner.stop()

def create_app() -> FastAPI:
    app = FastAPI(title="Image Detection API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(InjectorMiddleware, injector=injector)
    attach_injector(app, injector)

    app.include_router(auth_router)
    app.include_router(images_router)
    app.include_router(train_router)
    app.include_router(dataset_router)
    app.include_router(model_router)
    app.include_router(jobs_router)
    return app

app = create_app()
