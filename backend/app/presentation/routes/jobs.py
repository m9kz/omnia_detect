from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi_injector import Injected

from app.application.use_cases.create_train_job import CreateTrainJobUseCase
from app.domain.entities.user import User
from app.domain.exceptions.base import NotFoundException
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
        model_name=job.model_name,
        message=job.message,
        error=job.error,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )


@router.post("/train", status_code=202, response_model=TrainJobItemSchema)
def create_train_job(
    payload: TrainJobCreateRequestSchema,
    current_user: User = Depends(require_authenticated_user),
    use_case: CreateTrainJobUseCase = Injected(CreateTrainJobUseCase),
):
    job = use_case.execute(
        user_id=current_user.id,
        dataset_id=payload.dataset_id,
        epochs=payload.epochs,
        imgsz=payload.imgsz,
        model_name=payload.model_name,
    )

    return _to_job_schema(job)


@router.get("", response_model=list[TrainJobItemSchema])
def list_jobs(
    current_user: User = Depends(require_authenticated_user),
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    items: list[TrainJobItemSchema] = []
    with uow as u:
        for job in u.jobs.list_for_user(current_user.id, limit=100):
            items.append(_to_job_schema(job))
    return items


@router.get("/{job_id}", response_model=TrainJobItemSchema)
def get_job(
    job_id: UUID,
    current_user: User = Depends(require_authenticated_user),
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    with uow as u:
        job = u.jobs.get_for_user(job_id, current_user.id)
        if not job:
            raise NotFoundException("Job not found")

    return _to_job_schema(job)
