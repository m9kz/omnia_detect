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
                setError('Ідентифікатор датасету відсутній')
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
                setError(getErrorMessage(datasetResult.reason, 'Не вдалося завантажити датасет'))
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
                error: getErrorMessage(trainError, 'Не вдалося запустити навчання'),
                result: null,
            })
        }
    }

    async function handleDelete() {
        if (!dataset) {
            return
        }

        const confirmed = window.confirm(
            'Видалити цей датасет? Дію не можна скасувати.',
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
                error: getErrorMessage(deleteError, 'Не вдалося видалити датасет'),
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
            setError(getErrorMessage(downloadError, 'Не вдалося завантажити датасет'))
        }
    }

    if (isLoading) {
        return (
            <Text as="p" size="sm" tone="muted" surface="soft">
                Завантаження датасету...
            </Text>
        )
    }

    if (error || !dataset) {
        return (
            <Text as="p" size="sm" surface="danger">
                {error ?? 'Датасет не знайдено'}
            </Text>
        )
    }

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <Card padding="xl" gap="xl" tone="hero" align="start">
                    <Badge size="sm" caps>
                        Картка датасету
                    </Badge>
                    <Heading as="h1" size="display" tight measure="xl">
                        Датасет {shortId(dataset.id)}
                    </Heading>
                    <Text as="p" size="lg" tone="muted" measure="lg">
                        Перевірте склад архіву, завантажте ZIP або запустіть навчання моделі.
                    </Text>

                    <Container display="flex" gap="md" align="center" wrap>
                        <Button onClick={() => void handleDownload()}>
                            Завантажити ZIP
                        </Button>
                        <Button
                            onClick={() => void handleDelete()}
                            color="danger"
                            disabled={deleteState.isLoading || relatedModels.length > 0}
                        >
                            {deleteState.isLoading ? 'Видалення...' : 'Видалити датасет'}
                        </Button>
                        <Button as={Link} to={ROUTES.DATASETS} variant="soft" color="neutral">
                            До датасетів
                        </Button>
                        <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral">
                            Навчання
                        </Button>
                    </Container>

                    {stats && (
                        <Grid layout="auto" track="fit" minItemWidth="11rem" gap="md">
                            <Card padding="md" gap="sm" tone="muted" width="content">
                                <Heading as="span" size="md" family="primary" weight="bold">
                                    {integerFormatter.format(stats.pairs)}
                                </Heading>
                                <Text as="span" size="xs" tone="muted" caps>
                                    Пари
                                </Text>
                            </Card>
                            <Card padding="md" gap="sm" tone="muted" width="content">
                                <Heading as="span" size="md" family="primary" weight="bold">
                                    {integerFormatter.format(stats.models)}
                                </Heading>
                                <Text as="span" size="xs" tone="muted" caps>
                                    Навчені моделі
                                </Text>
                            </Card>
                            <Card padding="md" gap="sm" tone="muted" width="content">
                                <Heading as="span" size="md" family="primary" weight="bold">
                                    {stats.ratio}
                                </Heading>
                                <Text as="span" size="xs" tone="muted" caps>
                                    Частка train
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
                        Спочатку видаліть моделі, створені з цього датасету.
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
                                        Метадані датасету
                                    </Heading>
                                    <Text as="span" size="sm" tone="muted">
                                        Створено {formatDate(dataset.created_at)}
                                    </Text>
                                </Grid>
                                <Badge>
                                    {summarizeClasses(dataset.class_names)}
                                </Badge>
                            </Container>

                            <Grid columns={2} gap="md" layout="auto" minItemWidth="12rem">
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>Навчальні</Text>
                                    <Text as="span" size="md" weight="semibold">{dataset.train_count}</Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>Валідаційні</Text>
                                    <Text as="span" size="md" weight="semibold">{dataset.val_count}</Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>ZIP</Text>
                                    <Text as="span" size="md" weight="semibold">
                                        {dataset.zip_exists ? 'Є' : 'Немає'}
                                    </Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Text as="span" size="xs" tone="muted" caps>Шлях збереження</Text>
                                    <Text as="span" size="md" weight="semibold">{dataset.zip_relpath}</Text>
                                </Card>
                            </Grid>
                        </Card>

                        <Card padding="lg" gap="lg">
                            <Grid gap="sm">
                                <Heading as="h3" size="sm" family="primary">
                                    Моделі з цього датасету
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Історія навчання для цього архіву.
                                </Text>
                            </Grid>

                            {relatedModels.length === 0 ? (
                                <Text as="p" size="sm" tone="muted" surface="soft">
                                    З цього датасету ще не навчали моделей.
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
                                                Модель {shortId(model.id)}
                                            </Heading>
                                            <Text as="p" size="sm" tone="muted">
                                                {model.epochs} епох, розмір {model.imgsz}, створено{' '}
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
                                                    Відкрити модель
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
                                    Навчання з датасету
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Налаштуйте запуск для нового детектора.
                                </Text>
                            </Grid>

                            <Grid columns={2} gap="md" layout="auto" minItemWidth="10rem">
                                <Field>
                                    <Field.Label htmlFor="dataset-detail-epochs">Епохи</Field.Label>
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
                                    <Field.Label htmlFor="dataset-detail-imgsz">Розмір зображення</Field.Label>
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
                                    {trainState.isLoading ? 'Додавання...' : 'Запустити навчання'}
                                </Button>
                                <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral" size="sm">
                                    Відкрити навчання
                                </Button>
                            </Container>

                            {trainState.error && (
                                <Text as="p" size="sm" surface="danger">
                                    {trainState.error}
                                </Text>
                            )}
                            {trainState.result && (
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
                    </Grid>
                </Grid>
            </Grid.Item>
        </Grid>
    )
}
