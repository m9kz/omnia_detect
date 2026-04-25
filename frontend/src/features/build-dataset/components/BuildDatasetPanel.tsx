import { buildDataset } from '@/features/build-dataset/api/buildDataset'
import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { downloadProtectedFile } from '@/shared/lib/api/files'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Button } from '@/shared/ui/primitives/Button'

export function BuildDatasetPanel() {
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
                error: getErrorMessage(error, 'Failed to download dataset'),
            })
        }
    }

    const handleBuild = async () => {
        setSubmission({ isLoading: true, error: null, result: null })

        try {
            const result = await buildDataset({
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
                error: getErrorMessage(error, 'Failed to build dataset'),
                result: null,
            })
        }
    }

    return (
        <Card padding="md" gap="md" push="top">
            <Card.Content>
                <Card.Header>
                    <Card.Title>Build Dataset</Card.Title>
                    <Card.Description>
                        Package the current annotations into a YOLO-ready dataset artifact.
                    </Card.Description>
                </Card.Header>

                <Button onClick={() => void handleBuild()} disabled={!canSubmit} fluid radius="md">
                    {submission.isLoading ? 'Building...' : 'Build Dataset'}
                </Button>

                {!canSubmit ? (
                    <Field.Message>Select at least one image before building.</Field.Message>
                ) : null}

                {submission.error ? (
                    <Field.Message tone="error">{submission.error}</Field.Message>
                ) : null}

                {submission.result?.downloadUrl ? (
                    <Card padding="md" gap="sm" tone="success">
                        <Field.Message tone="success">Dataset is ready.</Field.Message>
                        <Button onClick={() => void handleDownload()} fluid radius="md">
                            Download Dataset
                        </Button>
                    </Card>
                ) : null}
            </Card.Content>
        </Card>
    )
}
