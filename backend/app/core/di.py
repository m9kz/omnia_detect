# ------------------------------------------------
from pathlib import Path

from app.application.ports.train_job_dispatcher import TrainJobDispatcher
from app.application.use_cases.build_dataset import BuildDatasetUseCase
from app.application.use_cases.create_train_job import CreateTrainJobUseCase
from app.application.use_cases.detect import DetectUseCase
from app.application.use_cases.get_image import GetImageUseCase
from app.application.use_cases.login import LoginUseCase
from app.application.use_cases.refresh_session import RefreshSessionUseCase
from app.application.use_cases.reload import ReloadModelUseCase
from app.application.use_cases.train import TrainModelUseCase
from app.application.use_cases.update import UpdateWeightsUseCase
from app.application.use_cases.upload import UploadImageUseCase
from app.application.use_cases.verify_access_token import VerifyAccessTokenUseCase
from app.core.config import settings
from app.domain.entities.user import User
from app.domain.services.auth_service import AuthService
from app.domain.services.dataset_builder import DatasetBuilderService
from app.domain.value_objects.weights_path import WeightsPath
from app.infrastructure.db import make_session_factory
from app.infrastructure.model_detector import ModelDetector
from app.infrastructure.model_loader import ModelLoader
from app.infrastructure.model_swapper import InMemoryModelSwapper
from app.infrastructure.repositories.dataset_store import LocalDatasetStore
from app.infrastructure.repositories.file.weights import FileWeightsRepository
from app.infrastructure.repositories.image_store import LocalImageStore
from app.infrastructure.train_job_runner import TrainJobRunner
from app.infrastructure.repositories.repo_sqlite import (
    SessionFactory,
    SqlAlchemyUnitOfWork,
    mapper_registry,
)
from app.infrastructure.trainer import ModelTrainer
from app.infrastructure.zip_write import ZipDatasetWriter
from app.shared.security.jwt import JwtCodec
from fastapi_injector import request_scope
from injector import Injector, Module, provider, singleton


class AppModule(Module):
    def __init__(self):
        self._session_factory, self._engine = make_session_factory(settings.DB_URL)
        mapper_registry.metadata.create_all(self._engine)   

    @provider
    @singleton
    def session_factory(self) -> SessionFactory:
        return self._session_factory

    @provider
    @request_scope
    def uow(self, session_factory: SessionFactory) -> SqlAlchemyUnitOfWork:
        return SqlAlchemyUnitOfWork(session_factory)
    
    @provider
    @singleton
    def weights_repo(self) -> FileWeightsRepository:
        return FileWeightsRepository()
    
    @provider
    @singleton
    def image_store(self) -> LocalImageStore:
        return LocalImageStore(settings.MEDIA_DIR)
    
    @provider
    @singleton
    def dataset_store(self) -> LocalDatasetStore:
        return LocalDatasetStore("data/datasets")
    
    @provider
    @singleton
    def detector(self) -> ModelDetector:
        return ModelDetector()

    @provider
    @singleton
    def jwt_codec(self) -> JwtCodec:
        return JwtCodec(settings.AUTH_SECRET_KEY.encode("utf-8"))

    @provider
    @singleton
    def configured_user(self) -> User:
        return User(
            id=settings.AUTH_USER_ID,
            login=settings.AUTH_LOGIN,
            name=settings.AUTH_DISPLAY_NAME,
        )

    @provider
    @singleton
    def auth_service(self, jwt_codec: JwtCodec) -> AuthService:
        return AuthService(
            jwt_codec=jwt_codec,
            issuer=settings.AUTH_ISSUER,
            access_token_ttl_seconds=settings.AUTH_ACCESS_TOKEN_TTL_SECONDS,
            refresh_token_ttl_seconds=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS,
        )

    @provider
    @singleton
    def trainer(self) -> ModelTrainer:
        return ModelTrainer()

    @provider
    @singleton
    def train_job_runner(
        self,
        session_factory: SessionFactory,
        trainer: ModelTrainer,
    ) -> TrainJobRunner:
        return TrainJobRunner(session_factory=session_factory, trainer=trainer)

    @provider
    @singleton
    def train_job_dispatcher(self, runner: TrainJobRunner) -> TrainJobDispatcher:
        return runner
    
    @provider
    @singleton
    def swapper(self, loader: ModelLoader) -> InMemoryModelSwapper:
        swapper = InMemoryModelSwapper()
        current = getattr(settings, "CURRENT_WEIGHTS", "ml_models/current.pt")

        handle = loader.load(WeightsPath(Path(current)))
        swapper.init(handle)
        
        return swapper
    
    @provider
    @singleton
    def loader(self) -> ModelLoader:
        return ModelLoader()
    
    @provider
    @singleton
    def builder_service(self) -> DatasetBuilderService:
        return DatasetBuilderService()
    
    @provider
    @singleton
    def writer_service(self) -> ZipDatasetWriter:
        return ZipDatasetWriter()
    
    @provider
    @request_scope
    def login_uc(
        self,
        auth_service: AuthService,
        configured_user: User,
    ) -> LoginUseCase:
        return LoginUseCase(
            auth_service=auth_service,
            configured_user=configured_user,
            configured_password=settings.AUTH_PASSWORD,
        )

    @provider
    @request_scope
    def refresh_session_uc(
        self,
        auth_service: AuthService,
        configured_user: User,
    ) -> RefreshSessionUseCase:
        return RefreshSessionUseCase(
            auth_service=auth_service,
            configured_user=configured_user,
        )

    @provider
    @request_scope
    def verify_access_token_uc(
        self,
        auth_service: AuthService,
        configured_user: User,
    ) -> VerifyAccessTokenUseCase:
        return VerifyAccessTokenUseCase(
            auth_service=auth_service,
            configured_user=configured_user,
        )

    @provider
    @request_scope
    def train_model_uc(
        self, 
        trainer: ModelTrainer, 
        swapper: InMemoryModelSwapper, 
        uow: SqlAlchemyUnitOfWork
    ) -> TrainModelUseCase:
        return TrainModelUseCase(
            trainer=trainer, 
            swapper=swapper, 
            uow=uow
        )

    @provider
    @request_scope
    def create_train_job_uc(
        self,
        uow: SqlAlchemyUnitOfWork,
        swapper: InMemoryModelSwapper,
        dispatcher: TrainJobDispatcher,
    ) -> CreateTrainJobUseCase:
        return CreateTrainJobUseCase(
            uow=uow,
            swapper=swapper,
            dispatcher=dispatcher,
        )
    
    @provider
    @request_scope
    def update_weights_uc(
        self, 
        weights_repo: FileWeightsRepository, 
        uow: SqlAlchemyUnitOfWork
    ) -> UpdateWeightsUseCase:
        return UpdateWeightsUseCase(
            weights_repository=weights_repo, 
            uow=uow
        )
    
    @provider
    @request_scope
    def reload_model_uc(
        self,
        weights_repo: FileWeightsRepository, 
        loader: ModelLoader, 
        swapper: InMemoryModelSwapper, 
        uow: SqlAlchemyUnitOfWork
    ) -> ReloadModelUseCase:
        return ReloadModelUseCase(
            weights_repo=weights_repo,
            loader=loader,
            swapper=swapper, 
            uow=uow
        )
    
    @provider
    @request_scope
    def upload_image_uc(
        self,
        image_store: LocalImageStore, 
        uow: SqlAlchemyUnitOfWork
    ) -> UploadImageUseCase:
        return UploadImageUseCase(
            store=image_store, 
            uow=uow
        )
    
    @provider
    @request_scope
    def detect_uc(
        self,
        detector: ModelDetector,
        swapper: InMemoryModelSwapper, 
        uow: SqlAlchemyUnitOfWork
    ) -> DetectUseCase:
        return DetectUseCase(
            detector=detector,
            swapper=swapper, 
            uow=uow
        )
    
    @provider
    @request_scope
    def build_dataset_uc(
        self,
        builder_service: DatasetBuilderService,
        dataset_writer: ZipDatasetWriter,
        dataset_store: LocalDatasetStore, 
        uow: SqlAlchemyUnitOfWork
    ) -> BuildDatasetUseCase:
        return BuildDatasetUseCase(
            builder_service=builder_service,
            dataset_writer=dataset_writer,
            store=dataset_store,
            uow=uow
        )
    
    @provider
    @request_scope
    def get_image_uc(
        self,
        image_store: LocalImageStore, 
        uow: SqlAlchemyUnitOfWork
    ) -> GetImageUseCase:
        return GetImageUseCase(
            store=image_store,
            uow=uow
        )

injector = Injector([AppModule()])
