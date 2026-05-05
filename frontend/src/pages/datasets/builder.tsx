import { useCallback, useMemo } from 'react'
import type { PixelBBox } from '@/entities/annotation'
import { BuildDatasetPanel } from '@/features/build-dataset/components/BuildDatasetPanel'
import { DatasetConfigPanel } from '@/features/configure-dataset/components/DatasetConfigPanel'
import { AnnotationCanvas } from '@/features/edit-annotation/components/AnnotationCanvas'
import { ClassSelector } from '@/features/edit-annotation/components/ClassSelector'
import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { ImageQueue } from '@/features/select-image/components/ImageQueue'
import { ImageUploader } from '@/features/upload-image/components/ImageUploader'
import { Card } from '@/shared/ui/compound/Card'
import { Workspace } from '@/shared/ui/compound/Workspace'
import { Text } from '@/shared/ui/primitives/Text'

export function DatasetBuilderPage() {
    const images = useImageWorkspaceStore((state) => state.images)
    const annotations = useImageWorkspaceStore((state) => state.annotations)
    const selectedImageId = useImageWorkspaceStore((state) => state.selectedImageId)
    const selectedClass = useImageWorkspaceStore((state) => state.selectedClass)
    const updateBboxes = useImageWorkspaceStore((state) => state.updateBboxes)

    const selectedImage = useMemo(
        () => images.find((image) => image.id === selectedImageId) ?? null,
        [images, selectedImageId],
    )
    const bboxes = useMemo(
        () => (selectedImageId ? annotations[selectedImageId] ?? [] : []),
        [annotations, selectedImageId],
    )

    const handleBboxesChange = useCallback(
        (nextBboxes: PixelBBox[]) => {
            if (selectedImageId) {
                updateBboxes(selectedImageId, nextBboxes)
            }
        },
        [selectedImageId, updateBboxes],
    )

    return (
        <Workspace fill>
            <Workspace.Sidebar>
                <DatasetConfigPanel />
                <ClassSelector />
                <ImageUploader />
                <ImageQueue />
                <BuildDatasetPanel />
            </Workspace.Sidebar>

            <Workspace.Main
                title="Полотно розмітки"
                description="Рамки об'єктів для вибраного зображення."
                align="center"
            >
                {selectedImage && selectedClass ? (
                    <AnnotationCanvas
                        key={selectedImage.id}
                        imageElement={selectedImage.imageElement}
                        bboxes={bboxes}
                        onBboxesChange={handleBboxesChange}
                        selectedClass={selectedClass}
                    />
                ) : (
                    <Card padding="xl" gap="md" tone="muted" width="fluid" align="center">
                        <Text tone="muted" align="center">
                            {images.length === 0
                                ? 'Додайте зображення.'
                                : 'Оберіть зображення й клас.'}
                        </Text>
                    </Card>
                )}
            </Workspace.Main>
        </Workspace>
    )
}
