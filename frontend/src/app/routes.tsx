import { Route, Routes } from 'react-router-dom'
import {
    DashboardPage,
    DatasetBuilderPage,
    DatasetDetailPage,
    DatasetsPage,
    ImageInferencePage,
    ModelDetailPage,
    ModelsPage,
} from '@/pages'

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/datasets" element={<DatasetsPage />} />
            <Route path="/datasets/new" element={<DatasetBuilderPage />} />
            <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
            <Route path="/builder" element={<DatasetBuilderPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/models/:modelId" element={<ModelDetailPage />} />
            <Route path="/inference" element={<ImageInferencePage />} />
        </Routes>
    )
}
