import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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

import styles from '@/shared/styles/ResourcePage.module.css'

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
        <Container as="section" fluid className={styles.page}>
            <Card padding="xl" gap="xl" tone="hero">
                <Badge size="sm" caps>
                    Model Library
                </Badge>
                <Heading as="h1" size="display" tight measure="xl">
                    Choose what the detector should actually run.
                </Heading>
                <Text as="p" size="lg" tone="muted" measure="lg">
                    Stored training artifacts are not useful unless activation is explicit. This page
                    shows the current runtime and lets you switch the detector to a selected model.
                </Text>

                <div className={styles.heroActions}>
                    <Button as={Link} to="/datasets" variant="soft" color="neutral">
                        Back to Datasets
                    </Button>
                    <Button as={Link} to="/inference">
                        Open Inference
                    </Button>
                </div>

                <Grid layout="auto" track="fit" minItemWidth="11rem" gap="md">
                    <Card padding="md" gap="sm" tone="muted" width="content">
                        <Heading as="span" size="md" family="primary" weight="bold">
                            {integerFormatter.format(stats.totalModels)}
                        </Heading>
                        <Text as="span" size="xs" tone="muted" caps>
                            Stored models
                        </Text>
                    </Card>
                    <Card padding="md" gap="sm" tone="muted" width="content">
                        <Heading as="span" size="md" family="primary" weight="bold">
                            {integerFormatter.format(stats.averageEpochs)}
                        </Heading>
                        <Text as="span" size="xs" tone="muted" caps>
                            Average epochs
                        </Text>
                    </Card>
                    <Card padding="md" gap="sm" tone="muted" width="content">
                        <Heading as="span" size="md" family="primary" weight="bold">
                            {stats.latestCreated ? formatDate(stats.latestCreated) : 'No data'}
                        </Heading>
                        <Text as="span" size="xs" tone="muted" caps>
                            Latest model
                        </Text>
                    </Card>
                </Grid>

                <Card padding="lg" gap="lg" width="fluid">
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                            <Heading as="h3" size="sm" family="primary">
                                Current runtime
                            </Heading>
                            <Text as="span" size="sm" tone="muted">
                                What <code>/api/images/{'{image_id}'}/detect</code> is using right
                                now.
                            </Text>
                        </div>
                        {activation.activeId ? (
                            <Badge color="success">
                                Active model {shortId(activation.activeId)}
                            </Badge>
                        ) : (
                            <Badge color="neutral">Artifact id unavailable</Badge>
                        )}
                    </div>

                    <Text as="p" size="sm" family="mono" weight="medium" surface="inset" fluid>
                        {currentModel?.weights_path ??
                            currentModel?.version ??
                            'No runtime model reported'}
                    </Text>
                    {activation.activeId && (
                        <div className={styles.actionRow}>
                            <Button
                                as={Link}
                                to={`/models/${activation.activeId}`}
                                variant="soft"
                                color="neutral"
                                size="sm"
                            >
                                Open Active Model Detail
                            </Button>
                        </div>
                    )}
                </Card>
            </Card>

            {activation.error && (
                <Text as="p" size="sm" surface="danger">
                    {activation.error}
                </Text>
            )}

            <div className={styles.grid}>
                <Card as="article" padding="lg" gap="md" className={styles.sectionLead}>
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
                    <div className={styles.badgeRow}>
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
                    </div>
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
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitle}>
                                        <Heading as="h3" size="sm" family="primary">
                                            Model {shortId(model.id)}
                                        </Heading>
                                        <Text as="span" size="sm" tone="muted">
                                            Trained {formatDate(model.created_at)}
                                        </Text>
                                    </div>
                                    {isActive ? (
                                        <Badge color="success">Active runtime</Badge>
                                    ) : (
                                        <Badge>
                                            dataset {shortId(model.dataset_id)}
                                        </Badge>
                                    )}
                                </div>

                                <div className={styles.badgeRow}>
                                    <Badge>{model.epochs} epochs</Badge>
                                    <Badge>imgsz {model.imgsz}</Badge>
                                    {model.metrics_path && (
                                        <Badge>metrics available</Badge>
                                    )}
                                </div>

                                <Text as="p" size="sm" family="mono" surface="inset" fluid>
                                    {model.best_weights_path}
                                </Text>

                                {model.metrics_path && (
                                    <Text as="p" size="sm" family="mono" surface="inset" fluid>
                                        {model.metrics_path}
                                    </Text>
                                )}

                                <div className={styles.actionRow}>
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
                                    <Button as={Link} to="/inference" variant="soft" color="neutral" size="sm">
                                        Go to Inference
                                    </Button>
                                    <Button
                                        as={Link}
                                        to={`/models/${model.id}`}
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
                                </div>

                                {deleteState?.error && (
                                    <Text as="p" size="sm" surface="danger">
                                        {deleteState.error}
                                    </Text>
                                )}
                            </Card>
                        )
                    })
                )}
            </div>
        </Container>
    )
}
