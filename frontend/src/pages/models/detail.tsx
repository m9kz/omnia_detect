import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import { getCurrentModel, getModelDetail } from '@/entities/model'
import type { CurrentModelSchema, ModelDetailSchema } from '@/entities/model'
import { activateModel } from '@/features/activate-model/api/activateModel'
import { deleteModel } from '@/features/delete-model/api/deleteModel'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Grid } from '@/shared/ui/compound/Grid'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'

import styles from '@/shared/styles/ResourcePage.module.css'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
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

    useEffect(() => {
        let isActive = true

        async function loadDetail() {
            if (!modelId) {
                setError('Model id is missing')
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
                errors.push(getErrorMessage(modelResult.reason, 'Failed to load model detail'))
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
                success: `Model ${shortId(model.id)} is now the active runtime.`,
            })
        } catch (activateError: unknown) {
            setActivation({
                isLoading: false,
                error: getErrorMessage(activateError, 'Activation failed'),
                success: null,
            })
        }
    }

    async function handleDelete() {
        if (!modelId || !model) {
            return
        }

        const confirmed = window.confirm(
            'Delete this model artifact and its stored files? This cannot be undone.',
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
                error: getErrorMessage(deleteError, 'Model deletion failed'),
            })
        }
    }

    if (isLoading) {
        return (
            <Text as="p" size="sm" tone="muted" surface="soft">
                Loading model details...
            </Text>
        )
    }

    if (error || !model) {
        return (
            <Text as="p" size="sm" surface="danger">
                {error ?? 'Model was not found'}
            </Text>
        )
    }

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <Card padding="xl" gap="xl" tone="hero">
                <Badge size="sm" caps>
                    Model Detail
                </Badge>
                <Heading as="h1" size="display" tight measure="xl">
                    Model {shortId(model.id)}
                </Heading>
                <Text as="p" size="lg" tone="muted" measure="lg">
                    This page shows the stored weights, the current activation state, and the
                    training artifacts produced for this run.
                </Text>

                <div className={styles.heroActions}>
                    <Button
                        onClick={() => void handleActivate()}
                        disabled={model.is_active || activation.isLoading}
                    >
                        {activation.isLoading
                            ? 'Activating...'
                            : model.is_active
                            ? 'Active Runtime'
                            : 'Activate Model'}
                    </Button>
                    <Button
                        as="a"
                        href={model.download_weights_url}
                        variant="soft"
                        color="neutral"
                    >
                        Download Weights
                    </Button>
                    <Button
                        as={Link}
                        to={routePath.datasetDetail(model.dataset_id)}
                        variant="soft"
                        color="neutral"
                    >
                        Open Dataset
                    </Button>
                    <Button as={Link} to={ROUTES.MODELS} variant="soft" color="neutral">
                        Back to Models
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        color="danger"
                        disabled={model.is_active || activation.isLoading || deletion.isLoading}
                    >
                        {deletion.isLoading ? 'Removing...' : 'Delete Model'}
                    </Button>
                </div>

                <Grid layout="auto" track="fit" minItemWidth="11rem" gap="md">
                    <Card padding="md" gap="sm" tone="muted" width="content">
                        <Heading as="span" size="md" family="primary" weight="bold">
                            {model.epochs}
                        </Heading>
                        <Text as="span" size="xs" tone="muted" caps>
                            Epochs
                        </Text>
                    </Card>
                    <Card padding="md" gap="sm" tone="muted" width="content">
                        <Heading as="span" size="md" family="primary" weight="bold">
                            {model.imgsz}
                        </Heading>
                        <Text as="span" size="xs" tone="muted" caps>
                            Image size
                        </Text>
                    </Card>
                    <Card padding="md" gap="sm" tone="muted" width="content">
                        <Heading as="span" size="md" family="primary" weight="bold">
                            {model.is_active ? 'Active' : 'Stored'}
                        </Heading>
                        <Text as="span" size="xs" tone="muted" caps>
                            Runtime state
                        </Text>
                    </Card>
                </Grid>
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
                <div className={styles.cardColumn}>
                    <Card padding="lg" gap="lg">
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                                <Heading as="h3" size="sm" family="primary">
                                    Model metadata
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Trained {formatDate(model.created_at)}
                                </Text>
                            </div>
                            {model.is_active ? (
                                <Badge color="success">Active runtime</Badge>
                            ) : (
                                <Badge color="neutral">Stored artifact</Badge>
                            )}
                        </div>

                        <div className={styles.keyValueGrid}>
                            <Card padding="md" gap="sm" tone="muted">
                                <Text as="span" size="xs" tone="muted" caps>Dataset id</Text>
                                <Text as="span" size="md" weight="semibold">
                                    {shortId(model.dataset_id)}
                                </Text>
                            </Card>
                            <Card padding="md" gap="sm" tone="muted">
                                <Text as="span" size="xs" tone="muted" caps>Metrics file</Text>
                                <Text as="span" size="md" weight="semibold">
                                    {model.metrics_path ?? 'Not copied to finetuned output'}
                                </Text>
                            </Card>
                        </div>

                        <Text as="p" size="sm" family="mono" surface="inset" fluid>
                            {model.best_weights_path}
                        </Text>

                        {currentRuntime && (
                            <Text as="p" size="sm" family="mono" surface="inset" fluid>
                                Runtime: {currentRuntime.weights_path ?? currentRuntime.version}
                            </Text>
                        )}
                    </Card>

                    <Card padding="lg" gap="lg">
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                                <Heading as="h3" size="sm" family="primary">
                                    Available artifacts
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Download or inspect outputs copied from the training run.
                                </Text>
                            </div>
                        </div>

                        {artifactEntries.length === 0 ? (
                            <Text as="p" size="sm" tone="muted" surface="soft">
                                No run artifacts were found for this model.
                            </Text>
                        ) : (
                            <div className={styles.linkList}>
                                {artifactEntries.map(([name, url]) => (
                                    <Card key={name} padding="md" gap="md" tone="muted">
                                        <Heading as="h4" size="sm" family="primary">
                                            {name}
                                        </Heading>
                                        <div className={styles.actionRow}>
                                            <Button
                                                as="a"
                                                href={url}
                                                variant="soft"
                                                color="neutral"
                                                size="sm"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open Artifact
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <div className={styles.cardColumn}>
                    <Card padding="lg" gap="lg">
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                                <Heading as="h3" size="sm" family="primary">
                                    Preview artifacts
                                </Heading>
                                <Text as="span" size="sm" tone="muted">
                                    Immediate visual checks from the training run.
                                </Text>
                            </div>
                        </div>

                        {previewEntries.length === 0 ? (
                            <Text as="p" size="sm" tone="muted" surface="soft">
                                No preview images are available for this model.
                            </Text>
                        ) : (
                            <div className={styles.previewGrid}>
                                {previewEntries.map(([name, url]) => (
                                    <Card key={name} as="figure" padding="md" gap="md" tone="muted">
                                        <Heading as="h4" size="sm" family="primary">
                                            {name}
                                        </Heading>
                                        <img
                                            className={styles.previewImage}
                                            src={url}
                                            alt={name}
                                            loading="lazy"
                                        />
                                        <div className={styles.actionRow}>
                                            <Button
                                                as="a"
                                                href={url}
                                                variant="soft"
                                                color="neutral"
                                                size="sm"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open full size
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
                </Grid>
            </Grid.Item>
        </Grid>
    )
}
