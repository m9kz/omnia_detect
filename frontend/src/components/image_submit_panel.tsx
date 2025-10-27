import React, { useMemo } from 'react';
import { AsyncActionPanel } from '../components/asyncPanel';
import { useBuilderStore } from '../shared/store/builder_store';

export const ImageSubmitPanel: React.FC = () => {
    const {
        images,
        inferences,
        selectedImageId,
        inferenceImage,
    } = useBuilderStore();

    const selectedImage = useMemo(
        () => images.find((img) => img.id === selectedImageId) ?? null,
        [images, selectedImageId],
    )

    const inferenceState = useMemo(
        () => (selectedImageId ? inferences[selectedImageId] : undefined),
        [inferences, selectedImageId]
    )

    const hasSelection = Boolean(selectedImage);
    const inferBusy  = inferenceState?.status === 'running';
    const inferenceError = inferenceState?.error;

    return (
        <div style={{ display: 'grid', gap: 8, marginTop: 'auto' }}>
            {/* 1) Run inference on selected image */}
            <AsyncActionPanel
                ctaLabel="Run Inference on Selected"
                loadingLabel="Inferencing..."
                canAction={hasSelection && !inferBusy}
                controlled={{ isLoading: inferBusy, error: inferenceError }}
                disabledReason={
                    !hasSelection
                        ? 'Select an image first'
                        : inferBusy
                        ? 'Inference in progress'
                        : undefined
                }
                onAction={async () => {
                    if (!selectedImage) return;
                    await inferenceImage(selectedImage.id);
                    return {
                        message: `Inference complete`,
                    };
                }}
            />
        </div>
    );
};

// (${detCount} detection${detCount === 1 ? '' : 's'})