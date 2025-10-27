import React from 'react'
import { useBuilderStore } from '../shared/store/builder_store'
import { AsyncActionPanel } from './asyncPanel';

export const SubmitPanel: React.FC = () => {
    const { submitDataset, isLoading, error, submissionResult, images } = useBuilderStore();
    const canSubmit = !isLoading && images.length > 0;

    return (
        <AsyncActionPanel
            ctaLabel="Build Dataset"
            loadingLabel="Building..."
            onAction={submitDataset}
            canAction={canSubmit}
            controlled={{ isLoading, error, result: submissionResult }}
            successRenderer={(r) => (
                <>
                    <p>Success! Dataset is ready.</p>
                    {r.downloadUrl && (
                        <a href={r.downloadUrl} download className="button" style={{ textDecoration: 'none', textAlign: 'center' }}>
                        Download Dataset
                        </a>
                    )}
                </>
            )}
        />
    );
};