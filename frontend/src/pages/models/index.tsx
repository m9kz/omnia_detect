import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import { getCurrentModel, listModels } from '@/entities/model'
import type { CurrentModelSchema, ModelItemSchema } from '@/entities/model'
import { activateModel } from '@/features/activate-model/api/activateModel'
import { deleteModel } from '@/features/delete-model/api/deleteModel'
import { renameModel } from '@/features/rename-model/api/renameModel'
import { getErrorMessage } from '@/shared/lib/errors'
import { formatBytes } from '@/shared/lib/formatBytes'
import { Card } from '@/shared/ui/compound/Card'
import { Grid } from '@/shared/ui/compound/Grid'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import { MetricCard } from '@/shared/ui/MetricCard'

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

type ActivationState = {
    activeId: string | null
    pendingId: string | null
    error: string | null
}

type DeleteState = {
    isLoading: boolean
    error: string | null
}

type RenameState = {
    isLoading: boolean
    error: string | null
}

export const ModelsPage: React.FC = () => {
    const [models, setModels] = useState<ModelItemSchema[]>([])
    const [currentModel, setCurrentModel] = useState<CurrentModelSchema | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activation, setActivation] = useState<ActivationState>({
        activeId: null,
        pendingId: null,
        error: null,
    })
    const [deleteStateById, setDeleteStateById] = useState<Record<string, DeleteState>>({})
    const [renameStateById, setRenameStateById] = useState<Record<string, RenameState>>({})

    useEffect(() => {
        let isActive = true

        async function loadModelsPage() {
            setIsLoading(true)
            setError(null)

            const [modelsResult, currentResult] = await Promise.allSettled([
                listModels(),
                getCurrentModel(),
            ])

            if (!isActive) {
                return
            }

            const errors: string[] = []

            if (modelsResult.status === 'fulfilled') {
                setModels(modelsResult.value)
            } else {
                errors.push(getErrorMessage(modelsResult.reason, 'Не вдалося завантажити моделі'))
            }

            if (currentResult.status === 'fulfilled') {
                setCurrentModel(currentResult.value)
                setActivation((current) => ({
                    ...current,
                    activeId: currentResult.value.model_id,
                }))
            } else {
                errors.push(getErrorMessage(currentResult.reason, 'Не вдалося завантажити активну модель'))
            }

            setError(errors.length > 0 ? errors.join('; ') : null)
            setIsLoading(false)
        }

        void loadModelsPage()

        return () => {
            isActive = false
        }
    }, [])

    const stats = useMemo(() => {
        const latestCreated = models[0]?.created_at ?? null
        const averageEpochs =
            models.length > 0
                ? Math.round(
                      models.reduce((sum, model) => sum + model.epochs, 0) / models.length,
                  )
                : 0
        const totalModelBytes = models.reduce((sum, model) => sum + model.size_bytes, 0)

        return {
            totalModels: models.length,
            averageEpochs,
            totalModelBytes,
            latestCreated,
        }
    }, [models])

    async function handleActivate(modelId: string) {
        setActivation((current) => ({
            ...current,
            pendingId: modelId,
            error: null,
        }))

        try {
            const result = await activateModel(modelId)
            setCurrentModel(result.runtime)
            setActivation({
                activeId: result.runtime.model_id,
                pendingId: null,
                error: null,
            })
        } catch (activateError: unknown) {
            setActivation((current) => ({
                ...current,
                pendingId: null,
                error: getErrorMessage(activateError, 'Не вдалося активувати модель'),
            }))
        }
    }

    async function handleDelete(modelId: string) {
        const confirmed = window.confirm(
            'Видалити цю модель і повʼязані файли? Дію не можна скасувати.',
        )
        if (!confirmed) {
            return
        }

        setDeleteStateById((current) => ({
            ...current,
            [modelId]: {
                isLoading: true,
                error: null,
            },
        }))

        try {
            await deleteModel(modelId)
            setModels((current) => current.filter((model) => model.id !== modelId))
            setDeleteStateById((current) => {
                const next = { ...current }
                delete next[modelId]
                return next
            })
        } catch (deleteError: unknown) {
            setDeleteStateById((current) => ({
                ...current,
                [modelId]: {
                    isLoading: false,
                    error: getErrorMessage(deleteError, 'Не вдалося видалити модель'),
                },
            }))
        }
    }

    async function handleRename(model: ModelItemSchema) {
        const nextName = window.prompt('New model name', model.name)
        if (nextName === null) {
            return
        }

        const trimmedName = nextName.trim()
        if (!trimmedName || trimmedName === model.name) {
            return
        }

        setRenameStateById((current) => ({
            ...current,
            [model.id]: {
                isLoading: true,
                error: null,
            },
        }))

        try {
            const updated = await renameModel(model.id, trimmedName)
            setModels((current) =>
                current.map((item) =>
                    item.id === model.id
                        ? {
                              ...item,
                              name: updated.name,
                          }
                        : item,
                ),
            )
            setRenameStateById((current) => {
                const next = { ...current }
                delete next[model.id]
                return next
            })
        } catch (renameError: unknown) {
            setRenameStateById((current) => ({
                ...current,
                [model.id]: {
                    isLoading: false,
                    error: getErrorMessage(renameError, 'Не вдалося перенеймувати модель'),
                },
            }))
        }
    }

    return (
        <Grid as="section" columns={12} gap="xl" fill>
            <Grid.Item span={12}>
                <MetricCard.Group columns={3}>
                    <MetricCard
                        value={integerFormatter.format(stats.totalModels)}
                        label="Моделі"
                        iconName="models"
                        to={ROUTES.MODELS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.averageEpochs)}
                        label="Середні епохи"
                        iconName="arrow-clockwise"
                        to={ROUTES.MODELS}
                    />
                    <MetricCard
                        value={stats.latestCreated ? formatDate(stats.latestCreated) : 'Немає даних'}
                        label="Остання модель"
                        iconName="eye"
                        to={ROUTES.MODELS}
                    />
                </MetricCard.Group>
            </Grid.Item>

            <Grid.Item span={12}>
                <Card padding="xl" gap="xl" tone="hero" align="start">
                    <Badge size="sm" caps>
                        Бібліотека моделей
                    </Badge>
                    <Heading as="h1" size="display" tight measure="xl">
                        Моделі
                    </Heading>
                    <Text as="p" size="lg" tone="muted" measure="lg">
                        Керуйте навченими детекторами, активуйте потрібну модель і переходьте до
                        перевірки на зображеннях.
                    </Text>

                    <Container display="flex" gap="md" align="center" wrap>
                        <Button as={Link} to={ROUTES.INFERENCE}>
                            Детекція
                        </Button>
                        <Button as={Link} to={ROUTES.DATASETS} variant="soft" color="neutral">
                            До датасетів
                        </Button>
                    </Container>
                </Card>
            </Grid.Item>
            <Grid.Item span={12}>
                <Card padding="lg" gap="lg" width="fluid">
                    <Container display="flex" gap="md" align="start" justify="between" wrap>
                        <Grid gap="sm">
                            <Heading as="h3" size="sm" family="primary">
                                Активна модель
                            </Heading>
                            <Text as="span" size="sm" tone="muted">
                                Поточний детектор для нових перевірок.
                            </Text>
                        </Grid>
                    </Container>

                    <Text as="p" size="sm" family="mono" weight="medium" surface="inset" fluid>
                        {currentModel?.weights_path ??
                            currentModel?.version ??
                            'Активну модель не знайдено'}
                    </Text>
                    {activation.activeId && (
                        <Container display="flex" gap="md" align="center" wrap>
                            <Button
                                as={Link}
                                to={routePath.modelDetail(activation.activeId)}
                                variant="soft"
                                color="neutral"
                                size="sm"
                            >
                                Відкрити активну модель
                            </Button>
                        </Container>
                    )}
                </Card>
            </Grid.Item>

            {activation.error && (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" surface="danger">
                        {activation.error}
                    </Text>
                </Grid.Item>
            )}

            <Grid.Item span={12}>
                <Grid layout="auto" track="fluid" minItemWidth="24rem" gap="xl">
                    <Card as="article" padding="lg" gap="md" align="start">
                        <Badge size="sm" caps>
                            Сховище моделей
                        </Badge>
                        <Heading as="h2" size="lg" measure="md">
                            Детектори для запуску
                        </Heading>
                        <Text as="p" size="md" tone="muted" measure="md">
                            Оберіть модель, активуйте її й використовуйте для детекції.
                        </Text>
                        <Container display="flex" gap="sm" wrap>
                            <Badge>
                                {integerFormatter.format(stats.totalModels)} моделей
                            </Badge>
                            <Badge>
                                {integerFormatter.format(stats.averageEpochs)} середніх епох
                            </Badge>
                            <Badge>
                                {formatBytes(stats.totalModelBytes)}
                            </Badge>
                            <Badge>
                                {activation.activeId
                                    ? `активна ${shortId(activation.activeId)}`
                                    : 'активної немає'}
                            </Badge>
                        </Container>
                    </Card>

                    {error ? (
                        <Text as="p" size="sm" surface="danger">
                            {error}
                        </Text>
                    ) : isLoading ? (
                        <Text as="p" size="sm" tone="muted" surface="soft">
                            Завантаження моделей...
                        </Text>
                    ) : models.length === 0 ? (
                        <Text as="p" size="sm" tone="muted" surface="soft">
                            Моделей ще немає. Запустіть навчання датасету.
                        </Text>
                    ) : (
                        models.map((model) => {
                            const isActive = activation.activeId === model.id
                            const isPending = activation.pendingId === model.id
                            const deleteState = deleteStateById[model.id]
                            const renameState = renameStateById[model.id]

                            return (
                                <Card key={model.id} as="article" padding="lg" gap="lg">
                                    <Container display="flex" gap="md" align="start" justify="between" wrap>
                                        <Grid gap="sm">
                                            <Heading as="h3" size="sm" family="primary">
                                                {model.name}
                                            </Heading>
                                            <Text as="span" size="sm" tone="muted">
                                                ID {shortId(model.id)} · Навчено {formatDate(model.created_at)}
                                            </Text>
                                        </Grid>
                                    </Container>

                                    <Container display="flex" gap="sm" wrap>
                                        {isActive ? (
                                            <Badge color="success">Активна</Badge>
                                        ) : (
                                            <Badge>
                                                датасет {shortId(model.dataset_id)}
                                            </Badge>
                                        )}
                                        <Badge>{model.epochs} епох</Badge>
                                        <Badge>розмір {model.imgsz}</Badge>
                                        <Badge>{formatBytes(model.size_bytes)}</Badge>
                                        {model.metrics_path && (
                                            <Badge>є метрики</Badge>
                                        )}
                                    </Container>

                                    <Text as="p" size="sm" family="mono" surface="inset" fluid>
                                        {model.best_weights_path}
                                    </Text>

                                    {model.metrics_path && (
                                        <Text as="p" size="sm" family="mono" surface="inset" fluid>
                                            {model.metrics_path}
                                        </Text>
                                    )}

                                    <Container display="flex" gap="md" align="center" wrap>
                                        <Button
                                            onClick={() => void handleActivate(model.id)}
                                            size="sm"
                                            disabled={
                                                isActive ||
                                                isPending ||
                                                Boolean(deleteState?.isLoading)
                                            }
                                        >
                                            {isPending
                                                ? 'Активація...'
                                                : isActive
                                                ? 'Активна'
                                                : 'Активувати'}
                                        </Button>
                                        <Button as={Link} to={ROUTES.INFERENCE} variant="soft" color="neutral" size="sm">
                                            До детекції
                                        </Button>
                                        <Button
                                            as={Link}
                                            to={routePath.modelDetail(model.id)}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Відкрити
                                        </Button>
                                        <Button
                                            onClick={() => void handleRename(model)}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                            disabled={
                                                Boolean(renameState?.isLoading) ||
                                                Boolean(deleteState?.isLoading)
                                            }
                                        >
                                            {renameState?.isLoading ? 'Перенеймування...' : 'Перенеймувати'}
                                        </Button>
                                        <Button
                                            onClick={() => void handleDelete(model.id)}
                                            color="danger"
                                            size="sm"
                                            disabled={
                                                isActive ||
                                                isPending ||
                                                Boolean(deleteState?.isLoading)
                                            }
                                        >
                                            {deleteState?.isLoading ? 'Видалення...' : 'Видалити'}
                                        </Button>
                                    </Container>

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
                                </Card>
                            )
                        })
                    )}
                </Grid>
            </Grid.Item>
        </Grid>
    )
}
