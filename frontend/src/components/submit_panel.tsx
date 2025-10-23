import React from 'react'
import { useBuilderStore } from '../shared/store/builder_store'

export const SubmitPanel: React.FC = () => {
    const { submitDataset, isLoading, error, submissionResult, labeledImages } =
        useBuilderStore()

    const canSubmit = !isLoading && labeledImages.length > 0

    return (
        <div className="form-group" style={{ marginTop: 'auto' }}>
            <button
                className="button"
                onClick={submitDataset}
                disabled={!canSubmit}
            >
                {isLoading ? 'Building...' : 'Build Dataset'}
            </button>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {submissionResult && (
                <div style={{ color: 'green' }}>
                    <p>Success! Dataset is ready.</p>
                    <a
                        href={submissionResult.downloadUrl}
                        download
                        className="button"
                        style={{ textDecoration: 'none', textAlign: 'center' }}
                    >
                        Download Dataset
                    </a>
                </div>
            )}
        </div>
    )
}