import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import { getCurrentModel, getModelDetail } from '@/entities/model'
import type { CurrentModelSchema, ModelDetailSchema } from '@/entities/model'
import { activateModel } from '@/features/activate-model/api/activateModel'
import { deleteModel } from '@/features/delete-model/api/deleteModel'
import {
    createProtectedObjectUrl,
    downloadProtectedFile,
    openProtectedFile,
} from '@/shared/lib/api/files'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Grid } from '@/shared/ui/compound/Grid'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Media } from '@/shared/ui/primitives/Media'
import { Text } from '@/shared/ui/primitives/Text'

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
})

function shortId(value: string) {
    return value.slice(0, 8)
}

function formatDate(value: string) {
    return dateFormatter.format(new Date(value))
}

type ActivationState = {
    isLoading: boolean
    error: string | null
    success: string | null
}

type DeleteState = {
    isLoading: boolean
    error: string | null
}

export const ModelDetailPage: React.FC = () => {
    const { modelId } = useParams<{ modelId: string }>()
    const navigate = useNavigate()
    const [model, setModel] = useState<ModelDetailSchema | null>(null)
    const [currentRuntime, setCurrentRuntime] = useState<CurrentModelSchema | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activation, setActivation] = useState<ActivationState>({
        isLoading: false,
        error: null,
        success: null,
    })
    const [deletion, setDeletion] = useState<DeleteState>({
        isLoading: false,
        error: null,
    })
    const [previewObjectUrls, setPreviewObjectUrls] = useState<Record<string, string>>({})
    const [previewError, setPreviewError] = useState<string | null>(null)

    useEffect(() => {
        let isActive = true

        async function loadDetail() {
            if (!modelId) {
                setError('Ідентифікатор моделі відсутній')
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const [modelResult, runtimeResult] = await Promise.allSettled([
                getModelDetail(modelId),
                getCurrentModel(),
            ])

            if (!isActive) {
                return
            }

            const errors: string[] = []

            if (modelResult.status === 'fulfilled') {
                setModel(modelResult.value)
            } else {
                errors.push(getErrorMessage(modelResult.reason, 'Не вдалося завантажити модель'))
            }

            if (runtimeResult.status === 'fulfilled') {
                setCurrentRuntime(runtimeResult.value)
            }

            setError(errors.length > 0 ? errors.join('; ') : null)
            setIsLoading(false)
        }

        void loadDetail()

        return () => {
            isActive = false
        }
    }, [modelId])

    const previewEntries = useMemo(
        () => (model ? Object.entries(model.preview_urls) : []),
        [model],
    )
    const artifactEntries = useMemo(
        () => (model ? Object.entries(model.artifact_urls) : []),
        [model],
    )

    useEffect(() => {
        let isActive = true
        const allocatedUrls: string[] = []

        async function loadPreviewAssets() {
            if (!model) {
                setPreviewObjectUrls({})
                setPreviewError(null)
                return
            }

            const entries = Object.entries(model.preview_urls)
            if (entries.length === 0) {
                setPreviewObjectUrls({})
                setPreviewError(null)
                return
            }

            try {
                const nextEntries = await Promise.all(
                    entries.map(async ([name, url]) => {
                        const objectUrl = await createProtectedObjectUrl(url)
                        allocatedUrls.push(objectUrl)
                        return [name, objectUrl] as const
                    }),
                )

                if (!isActive) {
                    return
                }

                setPreviewObjectUrls(Object.fromEntries(nextEntries))
                setPreviewError(null)
            } catch (previewLoadError: unknown) {
                if (!isActive) {
                    return
                }

                setPreviewObjectUrls({})
                setPreviewError(
                    getErrorMessage(previewLoadError, 'Не вдалося завантажити зображення перегляду'),
                )
            }
        }

        void loadPreviewAssets()

        return () => {
            isActive = false
            for (const objectUrl of allocatedUrls) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [model])

    async function handleActivate() {
        if (!modelId || !model) {
            return
        }

        setActivation({
            isLoading: true,
            error: null,
            success: null,
        })

        try {
            const result = await activateModel(modelId)
            setCurrentRuntime(result.runtime)
            setModel((current) =>
                current
                    ? {
                          ...current,
                          is_active: true,
                      }
                    : current,
            )
            setActivation({
                isLoading: false,
                error: null,
                success: `Модель ${shortId(model.id)} активована.`,
            })
        } catch (activateError: unknown) {
            setActivation({
                isLoading: false,
                error: getErrorMessage(activateError, 'Не вдалося активувати модель'),
                success: null,
            })
        }
    }

    async function handleDelete() {
        if (!modelId || !model) {
            return
        }

        const confirmed = window.confirm(
            'Видалити цю модель і повʼязані файли? Дію не можна скасувати.',
        )
        if (!confirmed) {
            return
        }

        setDeletion({
            isLoading: true,
            error: null,
        })

        try {
            await deleteModel(modelId)
            void navigate(ROUTES.MODELS)
        } catch (deleteError: unknown) {
            setDeletion({
                isLoading: false,
                error: getErrorMessage(deleteError, 'Не вдалося видалити модель'),
            })
        }
    }

    async function handleDownloadWeights() {
        if (!model) {
            return
        }

        try {
            await downloadProtectedFile(model.download_weights_url, `model_${model.id}_best.pt`)
        } catch (downloadError: unknown) {
            setError(getErrorMessage(downloadError, 'Не вдалося завантажити ваги'))
        }
    }

    async function handleOpenArtifact(url: string) {
        try {
            await openProtectedFile(url)
        } catch (artifactError: unknown) {
            setError(getErrorMessage(artifactError, 'Не вдалося відкрити файл'))
        }
    }

    function handleOpenPreview(objectUrl: string | undefined) {
        if (!objectUrl) {
            return
        }

        window.open(objectUrl, '_blank', 'noopener,noreferrer')
    }

    if (isLoading) {
        return (
            <Text as="p" size="sm" tone="muted" surface="soft">
                Завантаження моделі...
            </Text>
        )
    }

    if (error || !model) {
        return (
            <Text as="p" size="sm" surface="danger">
                {error ?? 'Модель не знайдено'}
            </Text>
        )
    }

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <Card padding="xl" gap="xl" tone="hero" align="start">
                    <Badge size="sm" caps>
                        Картка моделі
                    </Badge>
                    <Heading as="h1" size="display" tight measure="xl">
                        Модель {shortId(model.id)}
                    </Heading>
                    <Text as="p" size="lg" tone="muted" measure="lg">
                        Ваги, метрики, візуальні перевірки й стан активації моделі.
                    </Text>

                    <Container display="flex" gap="md" align="center" wrap>
                        <Button
                            onClick={() => void handleActivate()}
                            disabled={model.is_active || activation.isLoading}
                        >
                            {activation.isLoading
                                ? 'Активація...'
                                : model.is_active
                                ? 'Активна'
                                : 'Активувати'}
                        </Button>
                        <Button
                            onClick={() => void handleDownloadWeights()}
                            variant="soft"
                            color="neutral"
                        >
                            Завантажити ваги
                        </Button>
                        <Button
                            as={Link}
                            to={routePath.datasetDetail(model.dataset_id)}
                            variant="soft"
                            color="neutral"
                        >
                            Відкрити датасет
                        </Button>
                        <Button as={Link} to={ROUTES.MODELS} variant="soft" color="neutral">
                            До моделей
                        </Button>
                        <Button
                            onClick={() => void handleDelete()}
                            color="danger"
                            disabled={model.is_active || activation.isLoading || deletion.isLoading}
                        >
                            {deletion.isLoading ? 'Видалення...' : 'Видалити модель'}
                        </Button>
                    </Container>
                </Card>
            </Grid.Item>

            {activation.error && (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" surface="danger">
                        {activation.error}
                    </Text>
                </Grid.Item>
            )}
            {activation.success && (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" surface="success">
                        {activation.success}
                    </Text>
                </Grid.Item>
            )}
            {deletion.error && (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" surface="danger">
                        {deletion.error}
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
                                        Метадані моделі
                                    </Heading>
                                    <Text as="span" size="sm" tone="muted">
                                        Навчено {formatDate(model.created_at)}
                                    </Text>
                                </Grid>
                            </Container>

                            <Grid columns={2} track="fluid" minItemWidth="12rem" gap="md">
                                <Card padding="md" gap="sm" tone="muted">
                                    <Heading as="span" size="md" family="primary" weight="bold">
                                        {shortId(model.dataset_id)}
                                    </Heading>
                                    <Text as="span" size="xs" tone="muted" caps>
                                        Датасет
                                    </Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Heading as="span" size="md" family="primary" weight="bold">
                                        {model.epochs}
                                    </Heading>
                                    <Text as="span" size="xs" tone="muted" caps>
                                        Епохи
                                    </Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Heading as="span" size="md" family="primary" weight="bold">
                                        {model.imgsz}
                                    </Heading>
                                    <Text as="span" size="xs" tone="muted" caps>
                                        Розмір
                                    </Text>
                                </Card>
                                <Card padding="md" gap="sm" tone="muted">
                                    <Heading as="span" size="md" family="primary" weight="bold">
                                        {model.is_active ? 'Активна' : 'Збережена'}
                                    </Heading>
                                    <Text as="span" size="xs" tone="muted" caps>
                                        Стан
                                    </Text>
                                </Card>
                                {/* <Card padding="md" gap="sm" tone="muted">
                                    <Heading as="span" size="md" family="primary" weight="bold">
                                        {dataset.zip_relpath}
                                    </Heading>
                                    <Text as="span" size="xs" tone="muted" caps>
                                        Шлях збереження
                                    </Text>
                                </Card> */}
                            </Grid>

                            <Text as="p" size="sm" family="mono" surface="inset" fluid>
                                {model.best_weights_path}
                            </Text>

                            {currentRuntime && (
                                <Text as="p" size="sm" family="mono" surface="inset" fluid>
                                    Активна: {currentRuntime.weights_path ?? currentRuntime.version}
                                </Text>
                            )}
                        </Card>

                        <Card padding="lg" gap="lg">
                            <Grid gap="sm">
                                <Heading as="h3" size="sm" family="primary">
                                    Файли навчання
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Додаткові результати, збережені після навчання.
                                </Text>
                            </Grid>

                            {artifactEntries.length === 0 ? (
                                <Text as="p" size="sm" tone="muted" surface="soft">
                                    Додаткових файлів для цієї моделі немає.
                                </Text>
                            ) : (
                                <Grid gap="md">
                                    {artifactEntries.map(([name, url]) => (
                                        <Card key={name} padding="md" gap="md" tone="muted">
                                            <Heading as="h4" size="sm" family="primary">
                                                {name}
                                            </Heading>
                                            <Container display="flex" gap="md" align="center" wrap>
                                                <Button
                                                    onClick={() => void handleOpenArtifact(url)}
                                                    variant="soft"
                                                    color="neutral"
                                                    size="sm"
                                                >
                                                    Відкрити
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
                                    Попередній перегляд
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Графіки й зображення для швидкої оцінки навчання.
                                </Text>
                            </Grid>

                            {previewEntries.length === 0 ? (
                                <Text as="p" size="sm" tone="muted" surface="soft">
                                    Зображень перегляду для цієї моделі немає.
                                </Text>
                            ) : (
                                <Grid columns={2} gap="lg" layout="auto" minItemWidth="14rem">
                                    {previewEntries.map(([name]) => (
                                        <Card key={name} as="article" padding="md" gap="md" tone="muted">
                                            <Heading as="h4" size="sm" family="primary">
                                                {name}
                                            </Heading>
                                            {previewObjectUrls[name] ? (
                                                <Media
                                                    src={previewObjectUrls[name]}
                                                    alt={name}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <Text as="p" size="sm" tone="muted" surface="soft">
                                                    Завантаження перегляду...
                                                </Text>
                                            )}
                                            <Container display="flex" gap="md" align="center" wrap>
                                                <Button
                                                    onClick={() => handleOpenPreview(previewObjectUrls[name])}
                                                    variant="soft"
                                                    color="neutral"
                                                    size="sm"
                                                    disabled={!previewObjectUrls[name]}
                                                >
                                                    Відкрити повністю
                                                </Button>
                                            </Container>
                                        </Card>
                                    ))}
                                </Grid>
                            )}
                            {previewError ? (
                                <Text as="p" size="sm" surface="danger">
                                    {previewError}
                                </Text>
                            ) : null}
                        </Card>
                    </Grid>
                </Grid>
            </Grid.Item>
        </Grid>
    )
}
