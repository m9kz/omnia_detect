export const ROUTES = {
    LOGIN: '/login',
    DASHBOARD: '/',
    DATASETS: '/datasets',
    DATASET_CREATE: '/datasets/new',
    DATASET_DETAIL: '/datasets/:datasetId',
    BUILDER_LEGACY: '/builder',
    JOBS: '/jobs',
    MODELS: '/models',
    MODEL_DETAIL: '/models/:modelId',
    INFERENCE: '/inference',
} as const

export const routePath = {
    datasetDetail: (datasetId: string) =>
        ROUTES.DATASET_DETAIL.replace(':datasetId', datasetId),
    modelDetail: (modelId: string) =>
        ROUTES.MODEL_DETAIL.replace(':modelId', modelId),
} as const
