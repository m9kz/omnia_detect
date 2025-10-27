import React, { useMemo } from 'react';
import { AsyncActionPanel } from '../components/asyncPanel';
import { useBuilderStore } from '../shared/store/builder_store';

export const ImageSubmitPanel: React.FC = () => {
    const {
        images,
        uploads,
        inferences,
        selectedImageId,
        uploadImage,
        inferenceImage,
    } = useBuilderStore();

    const selectedImage = useMemo(
        () => images.find((img) => img.id === selectedImageId) ?? null,
        [images, selectedImageId],
    )

    const uploadingState = useMemo(
        () => (selectedImageId ? uploads[selectedImageId] : undefined),
        [uploads, selectedImageId]
    )

    const inferenceState = useMemo(
        () => (selectedImageId ? inferences[selectedImageId] : undefined),
        [inferences, selectedImageId]
    )

    const hasSelection = Boolean(selectedImage);
    const uploadBusy = uploadingState?.status === 'uploading';
    const inferBusy  = inferenceState?.status === 'running';

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            {/* 1) Upload selected image */}
            <AsyncActionPanel
                ctaLabel={'Upload Selected'}
                loadingLabel="Uploading..."
                canAction={hasSelection && !uploadBusy}
                disabledReason={
                    !hasSelection
                        ? 'Select an image first'
                        : uploadBusy
                        ? 'Upload in progress'
                        : undefined
                }
                onAction={async () => {
                    if (!selectedImage) return;
                    await uploadImage(selectedImage.id);
                    return {
                        message: 'Upload complete',
                    };
                }}
            />

            {/* 2) Run inference on selected image */}
            <AsyncActionPanel
                ctaLabel="Run Inference on Selected"
                loadingLabel="Inferencing..."
                canAction={hasSelection && !inferBusy}
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