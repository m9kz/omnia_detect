import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import { listDatasets } from '@/entities/dataset'
import type { DatasetItemSchema } from '@/entities/dataset'
import { createTrainJob } from '@/entities/job'
import type { TrainJobItemSchema } from '@/entities/job'
import { deleteDataset } from '@/features/delete-dataset/api/deleteDataset'
import { renameDataset } from '@/features/rename-dataset/api/renameDataset'
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
import { MetricCard } from '@/shared/ui/MetricCard'

type TrainConfig = {
    modelName: string
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

type RenameState = {
    isLoading: boolean
    error: string | null
}

const defaultTrainConfig: TrainConfig = {
    modelName: '',
    epochs: 5,
    imgsz: 640,
}

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
})

const integerFormatter = new Intl.NumberFormat('uk-UA')

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
    const [renameStateById, setRenameStateById] = useState<Record<string, RenameState>>({})

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

                setError(getErrorMessage(loadError, 'Не вдалося завантажити датасети'))
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

    function updateTrainConfig<Key extends keyof TrainConfig>(
        datasetId: string,
        key: Key,
        value: TrainConfig[Key],
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
                modelName: config.modelName,
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
                    error: getErrorMessage(trainError, 'Не вдалося запустити навчання'),
                    result: null,
                },
            }))
        }
    }

    async function handleDelete(datasetId: string) {
        const confirmed = window.confirm(
            'Видалити цей датасет? Дію не можна скасувати.',
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
                    error: getErrorMessage(deleteError, 'Не вдалося видалити датасет'),
                },
            }))
        }
    }

    async function handleRename(dataset: DatasetItemSchema) {
        const nextName = window.prompt('New dataset name', dataset.name)
        if (nextName === null) {
            return
        }

        const trimmedName = nextName.trim()
        if (!trimmedName || trimmedName === dataset.name) {
            return
        }

        setRenameStateById((current) => ({
            ...current,
            [dataset.id]: {
                isLoading: true,
                error: null,
            },
        }))

        try {
            const updated = await renameDataset(dataset.id, trimmedName)
            setDatasets((current) =>
                current.map((item) =>
                    item.id === dataset.id
                        ? {
                              ...item,
                              name: updated.name,
                          }
                        : item,
                ),
            )
            setRenameStateById((current) => {
                const next = { ...current }
                delete next[dataset.id]
                return next
            })
        } catch (renameError: unknown) {
            setRenameStateById((current) => ({
                ...current,
                [dataset.id]: {
                    isLoading: false,
                    error: getErrorMessage(renameError, 'Не вдалося перенеймувати датасет'),
                },
            }))
        }
    }

    async function handleDownload(url: string) {
        try {
            await downloadProtectedFile(url)
        } catch (downloadError: unknown) {
            setError(getErrorMessage(downloadError, 'Не вдалося завантажити датасет'))
        }
    }

    return (
        <Grid as="section" columns={12} gap="xl" fill>
            <Grid.Item span={12}>
                <MetricCard.Group columns={3}>
                    <MetricCard
                        value={integerFormatter.format(stats.totalDatasets)}
                        label="Датасети"
                        iconName="dataset-pair"
                        to={ROUTES.DATASETS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.totalPairs)}
                        label="Усього пар"
                        iconName="arrow-down"
                        to={ROUTES.DATASETS}
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.totalClasses)}
                        label="Класи"
                        iconName="eye"
                        to={ROUTES.DATASETS}
                    />
                </MetricCard.Group>
            </Grid.Item>
            <Grid.Item span={8} spanMd={12} as={Card} padding="xl" gap="xl" tone="hero">
                <Badge size="sm" caps>
                    Бібліотека датасетів
                </Badge>
                <Heading as="h1" size="display" tight measure="xl">
                    Датасети
                </Heading>
                <Text as="p" size="lg" tone="muted" measure="lg">
                    Збережені ZIP-архіви для навчання, перевірки структури та повторного
                    використання.
                </Text>

                <Container display="flex" gap="md" wrap>
                    <Button as={Link} to={ROUTES.DATASET_CREATE}>
                        Створити датасет
                    </Button>
                    <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral">
                        Переглянути навчання
                    </Button>
                </Container>
            </Grid.Item>
            <Grid.Item span={4} spanMd={12}>
                <Card as="article" padding="lg" gap="md" align="start">
                    <Badge size="sm" caps>
                        Архіви
                    </Badge>
                    <Heading as="h2" size="lg" measure="md">
                        Готові дані для навчання
                    </Heading>
                    <Text as="p" size="md" tone="muted" measure="md">
                        Кожен запис містить класи, розподіл train/val і посилання на ZIP.
                    </Text>
                    <Container display="flex" gap="sm" wrap>
                        <Badge>
                            {integerFormatter.format(stats.totalDatasets)} архівів
                        </Badge>
                        <Badge>
                            {integerFormatter.format(stats.totalClasses)} класів
                        </Badge>
                        <Badge>
                            {stats.latestCreated
                                ? `останній ${formatDate(stats.latestCreated)}`
                                : 'архівів ще немає'}
                        </Badge>
                    </Container>
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
                        Завантаження датасетів...
                    </Text>
                </Grid.Item>
            ) : datasets.length === 0 ? (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Датасетів ще немає. Створіть перший архів на сторінці розмітки.
                    </Text>
                </Grid.Item>
            ) : (
                <Grid.Item span={12}>
                    <Grid layout="auto" track="fluid" minItemWidth="24rem" gap="xl">
                        {datasets.map((dataset) => {
                            const trainConfig = getTrainConfig(dataset.id)
                            const trainState = trainStateById[dataset.id]
                            const deleteState = deleteStateById[dataset.id]
                            const renameState = renameStateById[dataset.id]

                            return (
                                <Card key={dataset.id} as="article" padding="lg" gap="lg">
                                    <Container display="flex" gap="md" align="start" justify="between" wrap>
                                        <Grid gap="sm">
                                            <Heading as="h3" size="sm" family="primary">
                                                {dataset.name}
                                            </Heading>
                                            <Text as="span" size="sm" tone="muted">
                                                ID {shortId(dataset.id)} · Створено {formatDate(dataset.created_at)}
                                            </Text>
                                        </Grid>
                                    </Container>

                                    <Container display="flex" gap="sm" wrap>
                                        <Badge>
                                            {integerFormatter.format(dataset.num_pairs)} пар
                                        </Badge>
                                        <Badge>
                                            {summarizeClasses(dataset.class_names)}
                                        </Badge>
                                        <Badge>
                                            train {dataset.train_count} / val {dataset.val_count}
                                        </Badge>
                                        <Badge>
                                            частка {dataset.ratio.toFixed(2)}
                                        </Badge>
                                    </Container>

                                    <Grid columns={2} gap="md" layout="auto" minItemWidth="10rem">
                                        <Field>
                                            <Field.Label htmlFor={`model-name-${dataset.id}`}>Model name</Field.Label>
                                            <Field.Control>
                                                <Input
                                                    id={`model-name-${dataset.id}`}
                                                    maxLength={80}
                                                    placeholder="Model name"
                                                    value={trainConfig.modelName}
                                                    onChange={(event) =>
                                                        updateTrainConfig(
                                                            dataset.id,
                                                            'modelName',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </Field.Control>
                                        </Field>
                                        <Field>
                                            <Field.Label htmlFor={`epochs-${dataset.id}`}>Епохи</Field.Label>
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
                                            <Field.Label htmlFor={`imgsz-${dataset.id}`}>Розмір зображення</Field.Label>
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
                                    </Grid>

                                    <Container display="flex" gap="md" align="center" wrap>
                                        <Button
                                            onClick={() => void handleTrain(dataset.id)}
                                            color="accent"
                                            disabled={trainState?.isLoading}
                                        >
                                            {trainState?.isLoading ? 'Додавання...' : 'Запустити навчання'}
                                        </Button>
                                        <Button
                                            as={Link}
                                            to={ROUTES.JOBS}
                                            variant="soft"
                                            color="neutral"
                                            size="md"
                                        >
                                            Переглянути навчання
                                        </Button>
                                        <Button
                                            onClick={() => void handleDownload(dataset.download_url)}
                                            variant="soft"
                                            color="neutral"
                                            size="md"
                                        >
                                            Завантажити ZIP
                                        </Button>
                                        <Button
                                            as={Link}
                                            to={routePath.datasetDetail(dataset.id)}
                                            variant="soft"
                                            color="neutral"
                                            size="md"
                                        >
                                            Відкрити
                                        </Button>
                                        <Button
                                            onClick={() => void handleRename(dataset)}
                                            variant="soft"
                                            color="neutral"
                                            size="md"
                                            disabled={
                                                Boolean(renameState?.isLoading) ||
                                                Boolean(deleteState?.isLoading)
                                            }
                                        >
                                            {renameState?.isLoading ? 'Перенеймування...' : 'Перенеймувати'}
                                        </Button>
                                        <Button
                                            onClick={() => void handleDelete(dataset.id)}
                                            color="danger"
                                            size="md"
                                            disabled={
                                                Boolean(trainState?.isLoading) ||
                                                Boolean(deleteState?.isLoading)
                                            }
                                        >
                                            {deleteState?.isLoading ? 'Видалення...' : 'Видалити'}
                                        </Button>
                                    </Container>

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
                                    {renameState?.error && (
                                        <Text as="p" size="sm" surface="danger">
                                            {renameState.error}
                                        </Text>
                                    )}

                                    {trainState?.result && (
                                        <Text as="p" size="sm" surface="success">
                                            Навчання {shortId(trainState.result.id)} додано в чергу.{' '}
                                            <Button
                                                as={Link}
                                                to={ROUTES.JOBS}
                                                variant="ghost"
                                                color="neutral"
                                                size="sm"
                                            >
                                                Відкрити
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
