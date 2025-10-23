import { Route, Routes } from 'react-router-dom'
import { DatasetBuilderPage } from './pages/dataset_builder_page'
import { Layout } from './components/layout'

import './shared/styles/Global.css'

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DatasetBuilderPage />} />
                {/* You could add other routes here, e.g., for listing datasets */}
            </Routes>
        </Layout>
    )
}

export default App