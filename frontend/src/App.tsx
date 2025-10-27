import { Route, Routes } from 'react-router-dom'
import { DatasetBuilderPage } from './pages/dataset_builder_page'
import { ImageInferencePage } from './pages/image_inference_page'

import { Layout } from './components/layout'

import './shared/styles/Global.css'

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DatasetBuilderPage />} />
                <Route path="/inference" element={<ImageInferencePage />} />
            </Routes>
        </Layout>
    )
}

export default App