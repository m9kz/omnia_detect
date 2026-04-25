import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import { getDataset } from '@/entities/dataset'
import type { DatasetDetailSchema } from '@/entities/dataset'
import { createTrainJob } from '@/entities/job'
import type { TrainJobItemSchema } from '@/entities/job'
import { listModels } from '@/entities/model'
import type { ModelItemSchema } from '@/entities/model'
import { deleteDataset } from '@/features/delete-dataset/api/deleteDataset'
import { downloadProtectedFile } from '@/shared/lib/api/files'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Grid } from '@/shared/ui/compound/Grid'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Input } from '@/shared/ui/primitives/Input'
import { Text } from '@/shared/ui/primitives/Text'

type TrainConfig = {
    epochs: number
    imgsz: number
}

type TrainState = {
    isLoading: boolean
    error: string | null
    result: TrainJobItemSchema | null
}

type DeleteState = {
    isLoading: boolean
    error: string | null
}

const defaultTrainConfig: TrainConfig = {
    epochs: 5,
    imgsz: 640,
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
})

const integerFormatter = new Intl.NumberFormat()

function shortId(value: string) {
    return value.slice(0, 8)
}

function formatDate(value: string) {
    return dateFormatter.format(new Date(value))
}

function summarizeClasses(classNames: string[]) {
    if (classNames.length <= 3) {
        return classNames.join(', ')
    }

    return `${classNames.slice(0, 3).join(', ')} +${classNames.length - 3}`
}

export const DatasetDetailPage: React.FC = () => {
    const { datasetId } = useParams<{ datasetId: string }>()
    const navigate = useNavigate()
    const [dataset, setDataset] = useState<DatasetDetailSchema | null>(null)
    const [relatedModels, setRelatedModels] = useState<ModelItemSchema[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [trainConfig, setTrainConfig] = useState<TrainConfig>(defaultTrainConfig)
    const [trainState, setTrainState] = useState<TrainState>({
        isLoading: false,
        error: null,
        result: null,
    })
    const [deleteState, setDeleteState] = useState<DeleteState>({
        isLoading: false,
        error: null,
    })

    useEffect(() => {
        let isActive = true

        async function loadDetail() {
            if (!datasetId) {
                setError('Dataset id is missing')
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const [datasetResult, modelsResult] = await Promise.allSettled([
                getDataset(datasetId),
                listModels(),
            ])

            if (!isActive) {
                return
            }

            if (datasetResult.status === 'fulfilled') {
                setDataset(datasetResult.value)
            } else {
                setError(getErrorMessage(datasetResult.reason, 'Failed to load dataset'))
            }

            if (modelsResult.status === 'fulfilled') {
                setRelatedModels(
                    modelsResult.value.filter((model) => model.dataset_id === datasetId),
                )
            }

            setIsLoading(false)
        }

        void loadDetail()

        return () => {
            isActive = false
        }
    }, [datasetId])

    const stats = useMemo(() => {
        if (!dataset) {
            return null
        }

        return {
            pairs: dataset.num_pairs,
            models: relatedModels.length,
            ratio: dataset.ratio.toFixed(2),
        }
    }, [dataset, relatedModels.length])

    async function handleTrain() {
        if (!datasetId) {
            return
        }

        setTrainState({
            isLoading: true,
            error: null,
            result: null,
        })

        try {
            const result = await createTrainJob({
                datasetId,
                epochs: trainConfig.epochs,
                imgsz: trainConfig.imgsz,
            })

            setTrainState({
                isLoading: false,
                error: null,
                result,
            })
            void navigate(ROUTES.JOBS)
        } catch (trainError: unknown) {
            setTrainState({
                isLoading: false,
                error: getErrorMessage(trainError, 'Failed to queue training job'),
                result: null,
            })
        }
    }

    async function handleDelete() {
        if (!dataset) {
            return
        }

        const confirmed = window.confirm(
            'Delete this dataset artifact? This cannot be undone.',
        )
        if (!confirmed) {
            return
        }

        setDeleteState({
            isLoading: true,
            error: null,
        })

        try {
            await deleteDataset(dataset.id)
            void navigate(ROUTES.DATASETS)
        } catch (deleteError: unknown) {
            setDeleteState({
                isLoading: false,
                error: getErrorMessage(deleteError, 'Dataset deletion failed'),
            })
        }
    }

    async function handleDownload() {
        if (!dataset) {
            return
        }

        try {
            await downloadProtectedFile(dataset.download_url)
        } catch (downloadError: unknown) {
            setError(getErrorMessage(downloadError, 'Failed to download dataset'))
        }
    }

    if (isLoading) {
        return (
            <Text as="p" size="sm" tone="muted" surface="soft">
                Loading dataset details...
            </Text>
        )
    }

    if (error || !dataset) {
        return (
            <Text as="p" size="sm" surface="danger">
                {error ?? 'Dataset was not found'}
            </Text>
        )
    }

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <Card padding="xl" gap="xl" tone="hero" align="start">
                    <Badge size="sm" caps>
                        Dataset Detail
                    </Badge>
                    <Heading as="h1" size="display" tight measure="xl">
                        Dataset {shortId(dataset.id)}
                    </Heading>
                    <Text as="p" size="lg" tone="muted" measure="lg">
                        This artifact is already packaged and persistent. Use it as the base for
                        training runs instead of rebuilding from transient page state.
                    </Text>

                    <Container display="flex" gap="md" align="center" wrap>
                        <Button onClick={() => void handleDownload()}>
                            Download ZIP
                        </Button>
                        <Button
                            onClick={() => void handleDelete()}
                            color="danger"
                            disabled={deleteState.isLoading || relatedModels.length > 0}
                        >
                            {deleteState.isLoading ? 'Removing...' : 'Delete Dataset'}
                        </Button>
                        <Button as={Link} to={ROUTES.DATASETS} variant="soft" color="neutral">
                            Back to Datasets
                        </Button>
                        <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral">
                            Open Jobs
                        </Button>
                    </Container>

                    {stats && (
                        <Grid layout="auto" track="fit" minItemWidth="11rem" gap="md">
                            <Card padding="md" gap="sm" tone="muted" width="content">
                                <Heading as="span" size="md" family="primary" weight="bold">
                                    {integerFormatter.format(stats.pairs)}
                                </Heading>
                                <Text as="span" size="xs" tone="muted" caps>
                                    Pairs
                                </Text>
                            </Card>
                            <Card padding="md" gap="sm" tone="muted" width="content">
                                <Heading as="span" size="md" family="primary" weight="bold">
                                    {integerFormatter.format(stats.models)}
                                </Heading>
                                <Text as="span" size="xs" tone="muted" caps>
                                    Models trained
                                </Text>
                            </Card>
                            <Card padding="md" gap="sm" tone="muted" width="content">
                                <Heading as="span" size="md" family="primary" weight="bold">
                                    {stats.ratio}
                                </Heading>
                                <Text as="span" size="xs" tone="muted" caps>
                                    Train ratio
                                </Text>
                            </Card>
                        </Grid>
                    )}
                </Card>
            </Grid.Item>

            {deleteState.error && (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" surface="danger">
                        {deleteState.error}
                    </Text>
                </Grid.Item>
            )}
            {relatedModels.length > 0 && (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Delete related models before removing this dataset.
                    </Text>
                </Grid.Item>
            )}

            <Grid.Item span={12}>
                <Grid layout="auto" track="fluid" minItemWidth="24rem" gap="xl">
                    <Grid gap="lg">
                        <Card padding="lg" gap="lg">
                            <Container display="flex" gap="md" align="start" justify="between" wrap>
                                <Grid gap="sm">
                                    <Heading as="h3" size="sm" family="primary">
                                        Dataset metadata
                                    </Heading>
                                    <Text as="span" size="sm" tone="muted">
                                        Created {formatDate(dataset.created_at)}
                                    </Text>
                                </Grid>
                                <Badge>
                                    {summarizeClasses(dataset.class_names)}
                                </Badge>
                            </Container>

                            <Grid columns={2} gap="md" layout="auto" minItemWidth="12rem">
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>Train count</Text>
                                    <Text as="span" size="md" weight="semibold">{dataset.train_count}</Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>Validation count</Text>
                                    <Text as="span" size="md" weight="semibold">{dataset.val_count}</Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>Zip file present</Text>
                                    <Text as="span" size="md" weight="semibold">
                                        {dataset.zip_exists ? 'Yes' : 'Missing'}
                                    </Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>Storage path</Text>
                                    <Text as="span" size="md" weight="semibold">{dataset.zip_relpath}</Text>
                                </Card>
                            </Grid>
                        </Card>

                        <Card padding="lg" gap="lg">
                            <Grid gap="sm">
                                <Heading as="h3" size="sm" family="primary">
                                    Models trained from this dataset
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Existing training history linked by dataset id.
                                </Text>
                            </Grid>

                            {relatedModels.length === 0 ? (
                                <Text as="p" size="sm" tone="muted" surface="soft">
                                    No models have been trained from this dataset yet.
                                </Text>
                            ) : (
                                <Grid gap="md">
                                    {relatedModels.map((model) => (
                                        <Card
                                            key={model.id}
                                            as="article"
                                            padding="md"
                                            gap="md"
                                            tone="muted"
                                        >
                                            <Heading as="h4" size="sm" family="primary">
                                                Model {shortId(model.id)}
                                            </Heading>
                                            <Text as="p" size="sm" tone="muted">
                                                {model.epochs} epochs, imgsz {model.imgsz}, created{' '}
                                                {formatDate(model.created_at)}
                                            </Text>
                                            <Container display="flex" gap="md" align="center" wrap>
                                                <Button
                                                    as={Link}
                                                    to={routePath.modelDetail(model.id)}
                                                    variant="soft"
                                                    color="neutral"
                                                    size="sm"
                                                >
                                                    Open Model Detail
                                                </Button>
                                            </Container>
                                        </Card>
                                    ))}
                                </Grid>
                            )}
                        </Card>
                    </Grid>

                    <Grid gap="lg">
                        <Card padding="lg" gap="lg">
                            <Grid gap="sm">
                                <Heading as="h3" size="sm" family="primary">
                                    Train from this dataset
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Queue a new model training job from the stored ZIP artifact.
                                </Text>
                            </Grid>

                            <Grid columns={2} gap="md" layout="auto" minItemWidth="10rem">
                                <Field>
                                    <Field.Label htmlFor="dataset-detail-epochs">Epochs</Field.Label>
                                    <Field.Control>
                                        <Input
                                            id="dataset-detail-epochs"
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={trainConfig.epochs}
                                            onChange={(event) =>
                                                setTrainConfig((current) => ({
                                                    ...current,
                                                    epochs: Math.max(
                                                        1,
                                                        Number(event.target.value) || 1,
                                                    ),
                                                }))
                                            }
                                        />
                                    </Field.Control>
                                </Field>
                                <Field>
                                    <Field.Label htmlFor="dataset-detail-imgsz">Image size</Field.Label>
                                    <Field.Control>
                                        <Input
                                            id="dataset-detail-imgsz"
                                            type="number"
                                            min={32}
                                            step={32}
                                            value={trainConfig.imgsz}
                                            onChange={(event) =>
                                                setTrainConfig((current) => ({
                                                    ...current,
                                                    imgsz: Math.max(
                                                        32,
                                                        Number(event.target.value) || 32,
                                                    ),
                                                }))
                                            }
                                        />
                                    </Field.Control>
                                </Field>
                            </Grid>

                            <Container display="flex" gap="md" align="center" wrap>
                                <Button
                                    onClick={() => void handleTrain()}
                                    disabled={trainState.isLoading}
                                >
                                    {trainState.isLoading ? 'Queueing...' : 'Queue Training Job'}
                                </Button>
                                <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral" size="sm">
                                    Open Jobs
                                </Button>
                            </Container>

                            {trainState.error && (
                                <Text as="p" size="sm" surface="danger">
                                    {trainState.error}
                                </Text>
                            )}
                            {trainState.result && (
                                <Text as="p" size="sm" surface="success">
                                    Training job {shortId(trainState.result.id)} is queued.{' '}
                                    <Button
                                        as={Link}
                                        to={ROUTES.JOBS}
                                        variant="ghost"
                                        color="neutral"
                                        size="sm"
                                    >
                                        Open jobs
                                    </Button>
                                </Text>
                            )}
                        </Card>
                    </Grid>
                </Grid>
            </Grid.Item>
        </Grid>
    )
}
