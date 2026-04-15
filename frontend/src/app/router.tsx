import { Navigate, createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { ROUTES } from './routes'

export const router = createBrowserRouter([
    {
        Component: App,
        children: [
            {
                path: ROUTES.DASHBOARD,
                lazy: async () => {
                    const { DashboardPage } = await import('@/pages/dashboard')
                    return { Component: DashboardPage }
                },
            },
            {
                path: ROUTES.DATASETS,
                lazy: async () => {
                    const { DatasetsPage } = await import('@/pages/datasets')
                    return { Component: DatasetsPage }
                },
            },
            {
                path: ROUTES.DATASET_CREATE,
                lazy: async () => {
                    const { DatasetBuilderPage } = await import('@/pages/datasets')
                    return { Component: DatasetBuilderPage }
                },
            },
            {
                path: ROUTES.DATASET_DETAIL,
                lazy: async () => {
                    const { DatasetDetailPage } = await import('@/pages/datasets')
                    return { Component: DatasetDetailPage }
                },
            },
            {
                path: ROUTES.BUILDER_LEGACY,
                element: <Navigate to={ROUTES.DATASET_CREATE} replace />,
            },
            {
                path: ROUTES.JOBS,
                lazy: async () => {
                    const { JobsPage } = await import('@/pages/jobs')
                    return { Component: JobsPage }
                },
            },
            {
                path: ROUTES.MODELS,
                lazy: async () => {
                    const { ModelsPage } = await import('@/pages/models')
                    return { Component: ModelsPage }
                },
            },
            {
                path: ROUTES.MODEL_DETAIL,
                lazy: async () => {
                    const { ModelDetailPage } = await import('@/pages/models')
                    return { Component: ModelDetailPage }
                },
            },
            {
                path: ROUTES.INFERENCE,
                lazy: async () => {
                    const { ImageInferencePage } = await import('@/pages/inference')
                    return { Component: ImageInferencePage }
                },
            },
        ],
    },
])
