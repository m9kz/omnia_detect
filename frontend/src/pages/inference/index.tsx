import { useMemo } from 'react'
import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { ImageQueue } from '@/features/select-image/components/ImageQueue'
import { ImageUploader } from '@/features/upload-image/components/ImageUploader'
import { InferenceCanvas } from '@/features/run-inference/components/InferenceCanvas'
import { RunInferencePanel } from '@/features/run-inference/components/RunInferencePanel'
import { Card } from '@/shared/ui/compound/Card'
import { Workspace } from '@/shared/ui/compound/Workspace'
import { Text } from '@/shared/ui/primitives/Text'

export function ImageInferencePage() {
    const images = useImageWorkspaceStore((state) => state.images)
    const inferences = useImageWorkspaceStore((state) => state.inferences)
    const selectedImageId = useImageWorkspaceStore((state) => state.selectedImageId)

    const selectedImage = useMemo(
        () => images.find((image) => image.id === selectedImageId) ?? null,
        [images, selectedImageId],
    )
    const inference = inferences[selectedImageId ?? '']
    const bboxes = inference?.status === 'done' ? inference.detectionsPx ?? [] : []

    return (
        <Workspace>
            <Workspace.Sidebar>
                <ImageUploader />
                <ImageQueue />
                <RunInferencePanel />
            </Workspace.Sidebar>

            <Workspace.Main
                title="Image Inference"
                description="Visualize detector output on the selected image."
            >
                {selectedImage ? (
                    <InferenceCanvas imageElement={selectedImage.imageElement} bboxes={bboxes} />
                ) : (
                    <Card padding="xl" gap="md" tone="muted" width="measure" align="center">
                        <Text tone="muted" align="center">
                            {images.length === 0 ? 'Upload images to begin.' : 'Select an image.'}
                        </Text>
                    </Card>
                )}
            </Workspace.Main>
        </Workspace>
    )
}
