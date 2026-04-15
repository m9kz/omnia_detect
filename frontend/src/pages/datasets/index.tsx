import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import { listDatasets } from '@/entities/dataset'
import type { DatasetItemSchema } from '@/entities/dataset'
import { createTrainJob } from '@/entities/job'
import type { TrainJobItemSchema } from '@/entities/job'
import { deleteDataset } from '@/features/delete-dataset/api/deleteDataset'
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

import styles from '@/shared/styles/ResourcePage.module.css'
import { MetricCard } from '@/shared/ui/MetricCard'

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

export const DatasetsPage: React.FC = () => {
    const navigate = useNavigate()
    const [datasets, setDatasets] = useState<DatasetItemSchema[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [trainConfigById, setTrainConfigById] = useState<Record<string, TrainConfig>>({})
    const [trainStateById, setTrainStateById] = useState<Record<string, TrainState>>({})
    const [deleteStateById, setDeleteStateById] = useState<Record<string, DeleteState>>({})

    useEffect(() => {
        let isActive = true

        async function loadDatasets() {
            setIsLoading(true)
            setError(null)

            try {
                const items = await listDatasets()
                if (!isActive) {
                    return
                }

                setDatasets(items)
            } catch (loadError: unknown) {
                if (!isActive) {
                    return
                }

                setError(getErrorMessage(loadError, 'Failed to load datasets'))
            } finally {
                if (isActive) {
                    setIsLoading(false)
                }
            }
        }

        void loadDatasets()

        return () => {
            isActive = false
        }
    }, [])

    const stats = useMemo(() => {
        const totalPairs = datasets.reduce((sum, dataset) => sum + dataset.num_pairs, 0)
        const uniqueClasses = new Set(datasets.flatMap((dataset) => dataset.class_names))
        const latestCreated = datasets[0]?.created_at ?? null

        return {
            totalDatasets: datasets.length,
            totalPairs,
            totalClasses: uniqueClasses.size,
            latestCreated,
        }
    }, [datasets])

    function getTrainConfig(datasetId: string): TrainConfig {
        return trainConfigById[datasetId] ?? defaultTrainConfig
    }

    function updateTrainConfig(
        datasetId: string,
        key: keyof TrainConfig,
        value: number,
    ) {
        setTrainConfigById((current) => ({
            ...current,
            [datasetId]: {
                ...(current[datasetId] ?? defaultTrainConfig),
                [key]: value,
            },
        }))
    }

    async function handleTrain(datasetId: string) {
        const config = getTrainConfig(datasetId)

        setTrainStateById((current) => ({
            ...current,
            [datasetId]: {
                isLoading: true,
                error: null,
                result: null,
            },
        }))

        try {
            const job = await createTrainJob({
                datasetId,
                epochs: config.epochs,
                imgsz: config.imgsz,
            })

            setTrainStateById((current) => ({
                ...current,
                [datasetId]: {
                    isLoading: false,
                    error: null,
                    result: job,
                },
            }))

            void navigate(ROUTES.JOBS)
        } catch (trainError: unknown) {
            setTrainStateById((current) => ({
                ...current,
                [datasetId]: {
                    isLoading: false,
                    error: getErrorMessage(trainError, 'Failed to queue training job'),
                    result: null,
                },
            }))
        }
    }

    async function handleDelete(datasetId: string) {
        const confirmed = window.confirm(
            'Delete this dataset artifact? This cannot be undone.',
        )
        if (!confirmed) {
            return
        }

        setDeleteStateById((current) => ({
            ...current,
            [datasetId]: {
                isLoading: true,
                error: null,
            },
        }))

        try {
            await deleteDataset(datasetId)
            setDatasets((current) => current.filter((dataset) => dataset.id !== datasetId))
            setDeleteStateById((current) => {
                const next = { ...current }
                delete next[datasetId]
                return next
            })
        } catch (deleteError: unknown) {
            setDeleteStateById((current) => ({
                ...current,
                [datasetId]: {
                    isLoading: false,
                    error: getErrorMessage(deleteError, 'Dataset deletion failed'),
                },
            }))
        }
    }

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <Container
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        width: '100%',
                        overflow: 'hidden',
                        border: '2px solid #202020',
                        borderRadius: '24px',
                        background: '#141414',
                    }}
                >
                    <MetricCard
                        value={integerFormatter.format(stats.totalDatasets)}
                        label="Stored datasets"
                        iconName="dataset-pair"
                            to={ROUTES.DATASETS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.totalPairs)}
                        label="Total pairs"
                        iconName="arrow-down"
                        to={ROUTES.DATASETS}
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.totalClasses)}
                        label="Observed classes"
                        iconName="eye"
                        to={ROUTES.DATASETS}
                    />
                </Container>
            </Grid.Item>
            <Grid.Item span={8} as={Card} padding="xl" gap="xl" tone="hero">
                <Badge size="sm" caps>
                    Dataset Library
                </Badge>
                <Heading as="h1" size="display" tight measure="xl">
                    Datasets.
                </Heading>
                <Text as="p" size="lg" tone="muted" measure="lg">
                    Each dataset here is a persistent YOLO-ready artifact. Download it, inspect its
                    split, or queue training directly from the stored record.
                </Text>

                <div className={styles.heroActions}>
                    <Button as={Link} to={ROUTES.DATASET_CREATE}>
                        Build New Dataset
                    </Button>
                    <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral">
                        Open Training Jobs
                    </Button>
                </div>
            </Grid.Item>
            <Grid.Item span={4}>
                <Card as="article" padding="lg" gap="md">
                    <Badge size="sm" caps>
                        Stored datasets
                    </Badge>
                    <Heading as="h2" size="lg" measure="md">
                        Reusable training artifacts
                    </Heading>
                    <Text as="p" size="md" tone="muted" measure="md">
                        Use these packaged datasets as the source of truth for training runs,
                        downloads, and auditability.
                    </Text>
                    <div className={styles.badgeRow}>
                        <Badge>
                            {integerFormatter.format(stats.totalDatasets)} artifacts
                        </Badge>
                        <Badge>
                            {integerFormatter.format(stats.totalClasses)} classes
                        </Badge>
                        <Badge>
                            {stats.latestCreated
                                ? `latest ${formatDate(stats.latestCreated)}`
                                : 'no stored artifacts'}
                        </Badge>
                    </div>
                </Card>
            </Grid.Item>
            {error ? (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" surface="danger">
                        {error}
                    </Text>
                </Grid.Item>
            ) : isLoading ? (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Loading datasets...
                    </Text>
                </Grid.Item>
            ) : datasets.length === 0 ? (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        No datasets have been built yet. Start with the dataset builder to create
                        the first artifact.
                    </Text>
                </Grid.Item>
            ) : (
                <Grid.Item span={12}>
                    <Grid layout="auto" track="fluid" minItemWidth="24rem" gap="xl">
                        {datasets.map((dataset) => {
                            const trainConfig = getTrainConfig(dataset.id)
                            const trainState = trainStateById[dataset.id]
                            const deleteState = deleteStateById[dataset.id]

                            return (
                                <Card key={dataset.id} as="article" padding="lg" gap="lg">
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardTitle}>
                                            <Heading as="h3" size="sm" family="primary">
                                                Dataset {shortId(dataset.id)}
                                            </Heading>
                                            <Text as="span" size="sm" tone="muted">
                                                Created {formatDate(dataset.created_at)}
                                            </Text>
                                        </div>
                                        <Badge>
                                            {integerFormatter.format(dataset.num_pairs)} pairs
                                        </Badge>
                                    </div>

                                    <div className={styles.badgeRow}>
                                        <Badge>
                                            {summarizeClasses(dataset.class_names)}
                                        </Badge>
                                        <Badge>
                                            train {dataset.train_count} / val {dataset.val_count}
                                        </Badge>
                                        <Badge>
                                            ratio {dataset.ratio.toFixed(2)}
                                        </Badge>
                                    </div>

                                    <div className={styles.actionRow}>
                                        <Button
                                            as="a"
                                            href={dataset.download_url}
                                            download
                                            variant="outline"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Download ZIP
                                        </Button>
                                        <Button
                                            as={Link}
                                        to={routePath.datasetDetail(dataset.id)}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Open Detail
                                        </Button>
                                        <Button
                                            onClick={() => void handleDelete(dataset.id)}
                                            color="danger"
                                            size="sm"
                                            disabled={
                                                Boolean(trainState?.isLoading) ||
                                                Boolean(deleteState?.isLoading)
                                            }
                                        >
                                            {deleteState?.isLoading ? 'Removing...' : 'Delete'}
                                        </Button>
                                    </div>

                                    <div className={styles.inputGrid}>
                                        <Field>
                                            <Field.Label htmlFor={`epochs-${dataset.id}`}>Epochs</Field.Label>
                                            <Field.Control>
                                                <Input
                                                    id={`epochs-${dataset.id}`}
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    value={trainConfig.epochs}
                                                    onChange={(event) =>
                                                        updateTrainConfig(
                                                            dataset.id,
                                                            'epochs',
                                                            Math.max(1, Number(event.target.value) || 1),
                                                        )
                                                    }
                                                />
                                            </Field.Control>
                                        </Field>
                                        <Field>
                                            <Field.Label htmlFor={`imgsz-${dataset.id}`}>Image size</Field.Label>
                                            <Field.Control>
                                                <Input
                                                    id={`imgsz-${dataset.id}`}
                                                    type="number"
                                                    min={32}
                                                    step={32}
                                                    value={trainConfig.imgsz}
                                                    onChange={(event) =>
                                                        updateTrainConfig(
                                                            dataset.id,
                                                            'imgsz',
                                                            Math.max(32, Number(event.target.value) || 32),
                                                        )
                                                    }
                                                />
                                            </Field.Control>
                                        </Field>
                                    </div>

                                    <div className={styles.actionRow}>
                                        <Button
                                            onClick={() => void handleTrain(dataset.id)}
                                            color="accent"
                                            disabled={trainState?.isLoading}
                                        >
                                            {trainState?.isLoading ? 'Queueing...' : 'Queue Training Job'}
                                        </Button>
                                        <Button
                                            as={Link}
                                        to={ROUTES.JOBS}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                        >
                                            View Jobs
                                        </Button>
                                    </div>

                                    {trainState?.error && (
                                        <Text as="p" size="sm" surface="danger">
                                            {trainState.error}
                                        </Text>
                                    )}
                                    {deleteState?.error && (
                                        <Text as="p" size="sm" surface="danger">
                                            {deleteState.error}
                                        </Text>
                                    )}

                                    {trainState?.result && (
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
                            )
                        })}
                    </Grid>
                </Grid.Item>
            )}
        </Grid>
    )
}
