import { useMemo } from 'react'
import { detectionsToPixelBBoxes } from '@/shared/lib/converters'
import { getErrorMessage } from '@/shared/lib/errors'
import { uploadImage } from '@/features/upload-image/api/uploadImage'
import { runInference } from '@/features/run-inference/api/runInference'
import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Button } from '@/shared/ui/primitives/Button'

export function RunInferencePanel() {
    const images = useImageWorkspaceStore((state) => state.images)
    const uploads = useImageWorkspaceStore((state) => state.uploads)
    const inferences = useImageWorkspaceStore((state) => state.inferences)
    const selectedImageId = useImageWorkspaceStore((state) => state.selectedImageId)
    const setUploadState = useImageWorkspaceStore((state) => state.setUploadState)
    const setInferenceState = useImageWorkspaceStore((state) => state.setInferenceState)

    const selectedImage = useMemo(
        () => images.find((image) => image.id === selectedImageId) ?? null,
        [images, selectedImageId],
    )
    const inferenceState = selectedImageId ? inferences[selectedImageId] : undefined
    const isRunning = inferenceState?.status === 'running'

    const handleRun = async () => {
        if (!selectedImageId || !selectedImage) {
            return
        }

        setInferenceState(selectedImageId, {
            status: 'running',
            error: null,
            detections: [],
            detectionsPx: [],
        })

        try {
            const existingUpload = uploads[selectedImageId]?.server
            let serverImageId = existingUpload?.imageId ?? null
            let width = existingUpload?.width ?? 0
            let height = existingUpload?.height ?? 0

            if (!serverImageId) {
                setUploadState(selectedImageId, { status: 'uploading', error: null })
                const uploaded = await uploadImage(selectedImage)

                serverImageId = uploaded.image_id
                width = uploaded.width
                height = uploaded.height

                setUploadState(selectedImageId, {
                    status: 'uploaded',
                    error: null,
                    server: {
                        imageId: uploaded.image_id,
                        url: uploaded.url,
                        width: uploaded.width,
                        height: uploaded.height,
                        filename: uploaded.filename,
                    },
                })
            }

            const result = await runInference(serverImageId)
            const boxes = detectionsToPixelBBoxes(result.detections ?? [], width, height)

            setInferenceState(selectedImageId, {
                status: 'done',
                error: null,
                detections: result.detections,
                detectionsPx: boxes,
            })
        } catch (error: unknown) {
            setInferenceState(selectedImageId, {
                status: 'error',
                error: getErrorMessage(error, 'Детекція не виконалась'),
                detections: [],
                detectionsPx: [],
            })
        }
    }

    return (
        <Card padding="md" gap="md" push="top">
            <Card.Content>
                <Card.Header>
                    <Card.Title>Детекція</Card.Title>
                    <Card.Description>
                        Перевірка активної моделі на вибраному зображенні.
                    </Card.Description>
                </Card.Header>

                <Button
                    onClick={() => void handleRun()}
                    disabled={!selectedImage || isRunning}
                    fluid
                    radius="md"
                >
                    {isRunning ? 'Аналіз...' : 'Запустити детекцію'}
                </Button>

                {!selectedImage ? (
                    <Field.Message>Оберіть зображення.</Field.Message>
                ) : null}

                {inferenceState?.error ? (
                    <Field.Message tone="error">{inferenceState.error}</Field.Message>
                ) : null}

                {inferenceState?.status === 'done' ? (
                    <Field.Message tone="success">
                        Знайдено: {inferenceState.detectionsPx.length}.
                    </Field.Message>
                ) : null}
            </Card.Content>
        </Card>
    )
}
