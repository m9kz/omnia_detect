import { useState } from 'react'

import { buildDataset } from '@/features/build-dataset/api/buildDataset'
import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { downloadProtectedFile } from '@/shared/lib/api/files'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Button } from '@/shared/ui/primitives/Button'
import { Input } from '@/shared/ui/primitives/Input'
import { Text } from '@/shared/ui/primitives/Text'

export function BuildDatasetPanel() {
    const [datasetName, setDatasetName] = useState('')
    const images = useImageWorkspaceStore((state) => state.images)
    const annotations = useImageWorkspaceStore((state) => state.annotations)
    const classNames = useImageWorkspaceStore((state) => state.classNames)
    const ratio = useImageWorkspaceStore((state) => state.ratio)
    const submission = useImageWorkspaceStore((state) => state.submission)
    const setSubmission = useImageWorkspaceStore((state) => state.setSubmission)
    const canSubmit = !submission.isLoading && images.length > 0

    const handleDownload = async () => {
        if (!submission.result?.downloadUrl) {
            return
        }

        try {
            await downloadProtectedFile(submission.result.downloadUrl)
        } catch (error: unknown) {
            setSubmission({
                isLoading: false,
                error: getErrorMessage(error, 'Не вдалося завантажити датасет'),
            })
        }
    }

    const handleBuild = async () => {
        setSubmission({ isLoading: true, error: null, result: null })

        try {
            const result = await buildDataset({
                name: datasetName,
                images,
                annotations,
                classNames,
                ratio,
            })

            setSubmission({
                isLoading: false,
                error: null,
                result: { downloadUrl: result.download_url },
            })
        } catch (error: unknown) {
            setSubmission({
                isLoading: false,
                error: getErrorMessage(error, 'Не вдалося створити датасет'),
                result: null,
            })
        }
    }

    return (
        <Card padding="md" gap="md" push="top">
            <Card.Content>
                <Card.Header>
                    <Card.Title>Збірка датасету</Card.Title>
                    <Card.Description>
                        ZIP-архів із поточною розміткою.
                    </Card.Description>
                </Card.Header>

                <Field>
                    <Field.Label htmlFor="dataset-name">Назва датасету</Field.Label>
                    <Field.Control>
                        <Input
                            id="dataset-name"
                            maxLength={80}
                            placeholder="Dataset name"
                            value={datasetName}
                            onChange={(event) => setDatasetName(event.target.value)}
                        />
                    </Field.Control>
                </Field>

                <Button onClick={() => void handleBuild()} disabled={!canSubmit} fluid radius="md">
                    {submission.isLoading ? 'Створення...' : 'Створити датасет'}
                </Button>

                {!canSubmit ? (
                    <Field.Message>Додайте хоча б одне зображення.</Field.Message>
                ) : null}

                {submission.error ? (
                    <Field.Message tone="error">{submission.error}</Field.Message>
                ) : null}

                {submission.result?.downloadUrl ? (
                    <>
                        <Text>
                            Датасет успішно створено.
                        </Text>
                        <Button onClick={() => void handleDownload()} fluid radius="md">
                            Завантажити датасет
                        </Button>
                    </>
                ) : null}
            </Card.Content>
        </Card>
    )
}
