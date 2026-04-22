from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi_injector import Injected

from app.application.use_cases.create_train_job import CreateTrainJobUseCase
from app.infrastructure.repositories.repo_sqlite import SqlAlchemyUnitOfWork
from app.presentation.dependencies.auth import require_authenticated_user
from app.presentation.schemas.train_job_create_request import TrainJobCreateRequestSchema
from app.presentation.schemas.train_job_item import TrainJobItemSchema

router = APIRouter(
    prefix="/api/jobs",
    tags=["jobs"],
    dependencies=[Depends(require_authenticated_user)],
)


def _to_job_schema(job) -> TrainJobItemSchema:
    return TrainJobItemSchema(
        id=job.id,
        dataset_id=job.dataset_id,
        status=job.status,
        progress=job.progress,
        current_epoch=job.current_epoch,
        total_epochs=job.total_epochs,
        epochs=job.epochs,
        imgsz=job.imgsz,
        base_weights=job.base_weights,
        base_model_id=job.base_model_id,
        model_id=job.model_id,
        message=job.message,
        error=job.error,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )


@router.post("/train", status_code=202, response_model=TrainJobItemSchema)
def create_train_job(
    payload: TrainJobCreateRequestSchema,
    use_case: CreateTrainJobUseCase = Injected(CreateTrainJobUseCase),
):
    try:
        job = use_case.execute(
            dataset_id=payload.dataset_id,
            epochs=payload.epochs,
            imgsz=payload.imgsz,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return _to_job_schema(job)


@router.get("", response_model=list[TrainJobItemSchema])
def list_jobs(
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    items: list[TrainJobItemSchema] = []
    with uow as u:
        for job in u.jobs.list(limit=100):
            items.append(_to_job_schema(job))
    return items


@router.get("/{job_id}", response_model=TrainJobItemSchema)
def get_job(
    job_id: UUID,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    with uow as u:
        job = u.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

    return _to_job_schema(job)
