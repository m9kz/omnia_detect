import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import { getCurrentModel, listModels } from '@/entities/model'
import type { CurrentModelSchema, ModelItemSchema } from '@/entities/model'
import { activateModel } from '@/features/activate-model/api/activateModel'
import { deleteModel } from '@/features/delete-model/api/deleteModel'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Grid } from '@/shared/ui/compound/Grid'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import { MetricCard } from '@/shared/ui/MetricCard'

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

type ActivationState = {
    activeId: string | null
    pendingId: string | null
    error: string | null
}

type DeleteState = {
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
                errors.push(getErrorMessage(modelsResult.reason, 'Failed to load models'))
            }

            if (currentResult.status === 'fulfilled') {
                setCurrentModel(currentResult.value)
                setActivation((current) => ({
                    ...current,
                    activeId: currentResult.value.model_id,
                }))
            } else {
                errors.push(getErrorMessage(currentResult.reason, 'Failed to load current runtime'))
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

        return {
            totalModels: models.length,
            averageEpochs,
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
                error: getErrorMessage(activateError, 'Activation failed'),
            }))
        }
    }

    async function handleDelete(modelId: string) {
        const confirmed = window.confirm(
            'Delete this model artifact and its stored files? This cannot be undone.',
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
                    error: getErrorMessage(deleteError, 'Model deletion failed'),
                },
            }))
        }
    }

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <MetricCard.Group columns={3}>
                    <MetricCard
                        value={integerFormatter.format(stats.totalModels)}
                        label="Stored models"
                        iconName="models"
                        to={ROUTES.MODELS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.averageEpochs)}
                        label="Average epochs"
                        iconName="arrow-clockwise"
                        to={ROUTES.MODELS}
                    />
                    <MetricCard
                        value={stats.latestCreated ? formatDate(stats.latestCreated) : 'No data'}
                        label="Latest model"
                        iconName="eye"
                        to={ROUTES.MODELS}
                    />
                </MetricCard.Group>
            </Grid.Item>

            <Grid.Item span={12}>
                <Card padding="xl" gap="xl" tone="hero" align="start">
                    <Badge size="sm" caps>
                        Model Library
                    </Badge>
                    <Heading as="h1" size="display" tight measure="xl">
                        Models.
                    </Heading>
                    <Text as="p" size="lg" tone="muted" measure="lg">
                        Stored training artifacts are not useful unless activation is explicit. This page
                        shows the current runtime and lets you switch the detector to a selected model.
                    </Text>

                    <Container display="flex" gap="md" align="center" wrap>
                        <Button as={Link} to={ROUTES.DATASETS} variant="soft" color="neutral">
                            Back to Datasets
                        </Button>
                        <Button as={Link} to={ROUTES.INFERENCE}>
                            Open Inference
                        </Button>
                    </Container>
                </Card>
            </Grid.Item>
            <Grid.Item span={12}>
                <Card padding="lg" gap="lg" width="fluid">
                    <Container display="flex" gap="md" align="start" justify="between" wrap>
                        <Grid gap="sm">
                            <Heading as="h3" size="sm" family="primary">
                                Current runtime
                            </Heading>
                            <Text as="span" size="sm" tone="muted">
                                What <code>/api/images/{'{image_id}'}/detect</code> is using right
                                now.
                            </Text>
                        </Grid>
                        {activation.activeId ? (
                            <Badge color="success">
                                Active model {shortId(activation.activeId)}
                            </Badge>
                        ) : (
                            <Badge color="neutral">Artifact id unavailable</Badge>
                        )}
                    </Container>

                    <Text as="p" size="sm" family="mono" weight="medium" surface="inset" fluid>
                        {currentModel?.weights_path ??
                            currentModel?.version ??
                            'No runtime model reported'}
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
                                Open Active Model Detail
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
                            Stored models
                        </Badge>
                        <Heading as="h2" size="lg" measure="md">
                            Activation-ready detectors
                        </Heading>
                        <Text as="p" size="md" tone="muted" measure="md">
                            Every model here is a stored training output. Promote one to the active
                            runtime before inference when you need a specific detector.
                        </Text>
                        <Container display="flex" gap="sm" wrap>
                            <Badge>
                                {integerFormatter.format(stats.totalModels)} artifacts
                            </Badge>
                            <Badge>
                                {integerFormatter.format(stats.averageEpochs)} avg epochs
                            </Badge>
                            <Badge>
                                {activation.activeId
                                    ? `active ${shortId(activation.activeId)}`
                                    : 'runtime not mapped'}
                            </Badge>
                        </Container>
                    </Card>

                    {error ? (
                        <Text as="p" size="sm" surface="danger">
                            {error}
                        </Text>
                    ) : isLoading ? (
                        <Text as="p" size="sm" tone="muted" surface="soft">
                            Loading models...
                        </Text>
                    ) : models.length === 0 ? (
                        <Text as="p" size="sm" tone="muted" surface="soft">
                            No models are stored yet. Train a dataset first to populate this library.
                        </Text>
                    ) : (
                        models.map((model) => {
                            const isActive = activation.activeId === model.id
                            const isPending = activation.pendingId === model.id
                            const deleteState = deleteStateById[model.id]

                            return (
                                <Card key={model.id} as="article" padding="lg" gap="lg">
                                    <Container display="flex" gap="md" align="start" justify="between" wrap>
                                        <Grid gap="sm">
                                            <Heading as="h3" size="sm" family="primary">
                                                Model {shortId(model.id)}
                                            </Heading>
                                            <Text as="span" size="sm" tone="muted">
                                                Trained {formatDate(model.created_at)}
                                            </Text>
                                        </Grid>
                                        {isActive ? (
                                            <Badge color="success">Active runtime</Badge>
                                        ) : (
                                            <Badge>
                                                dataset {shortId(model.dataset_id)}
                                            </Badge>
                                        )}
                                    </Container>

                                    <Container display="flex" gap="sm" wrap>
                                        <Badge>{model.epochs} epochs</Badge>
                                        <Badge>imgsz {model.imgsz}</Badge>
                                        {model.metrics_path && (
                                            <Badge>metrics available</Badge>
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
                                                ? 'Activating...'
                                                : isActive
                                                ? 'Active'
                                                : 'Activate Model'}
                                        </Button>
                                        <Button as={Link} to={ROUTES.INFERENCE} variant="soft" color="neutral" size="sm">
                                            Go to Inference
                                        </Button>
                                        <Button
                                            as={Link}
                                            to={routePath.modelDetail(model.id)}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Open Detail
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
                                            {deleteState?.isLoading ? 'Removing...' : 'Delete'}
                                        </Button>
                                    </Container>

                                    {deleteState?.error && (
                                        <Text as="p" size="sm" surface="danger">
                                            {deleteState.error}
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
