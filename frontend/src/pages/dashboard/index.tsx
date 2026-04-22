import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, routePath } from '@/app/routes'
import { listDatasets } from '@/entities/dataset'
import type { DatasetItemSchema } from '@/entities/dataset'
import {
    getTrainJobBadgeColor,
    getTrainJobLabel,
    getTrainJobProgress,
    getTrainJobTone,
    isTrainJobActive,
    listTrainJobs,
} from '@/entities/job'
import type { TrainJobItemSchema } from '@/entities/job'
import { getCurrentModel, listModels } from '@/entities/model'
import type { CurrentModelSchema, ModelItemSchema } from '@/entities/model'
import { downloadProtectedFile } from '@/shared/lib/api/files'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Grid } from '@/shared/ui/compound/Grid'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './DashboardPage.module.css'
import { MetricCard } from '@/shared/ui/MetricCard'

type DashboardState = {
    datasets: DatasetItemSchema[]
    jobs: TrainJobItemSchema[]
    models: ModelItemSchema[]
    currentModel: CurrentModelSchema | null
    isLoading: boolean
    error: string | null
}

type DashboardCardProps = {
    title: string
    subtitle: string
    span?: number
    className?: string
    action?: React.ReactNode
    children: React.ReactNode
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
})

const integerFormatter = new Intl.NumberFormat()

function DashboardCard({
    title,
    subtitle,
    span = 12,
    className,
    action,
    children,
}: DashboardCardProps) {
    return (
        <Grid.Item
            as={Card}
            span={span}
            padding="lg"
            gap="lg"
            className={className}
        >
            <Card.Header className={styles.cardHeader}>
                <div className={styles.cardHeading}>
                    <Card.Title as="h2">{title}</Card.Title>
                    <Card.Description>{subtitle}</Card.Description>
                </div>
                {action}
            </Card.Header>
            {children}
        </Grid.Item>
    )
}

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

async function handleProtectedDownload(url: string) {
    try {
        await downloadProtectedFile(url)
    } catch (error: unknown) {
        window.alert(getErrorMessage(error, 'Failed to download file'))
    }
}

export function DashboardPage() {
    const [state, setState] = useState<DashboardState>({
        datasets: [],
        jobs: [],
        models: [],
        currentModel: null,
        isLoading: true,
        error: null,
    })

    useEffect(() => {
        let isActive = true

        async function loadDashboard() {
            setState((current) => ({ ...current, isLoading: true, error: null }))

            const [datasetsResult, jobsResult, modelsResult, currentModelResult] = await Promise.allSettled([
                listDatasets(),
                listTrainJobs(),
                listModels(),
                getCurrentModel(),
            ])

            if (!isActive) {
                return
            }

            const nextDatasets =
                datasetsResult.status === 'fulfilled' ? datasetsResult.value : []
            const nextJobs = jobsResult.status === 'fulfilled' ? jobsResult.value : []
            const nextModels = modelsResult.status === 'fulfilled' ? modelsResult.value : []
            const nextCurrentModel =
                currentModelResult.status === 'fulfilled' ? currentModelResult.value : null

            const errors = [
                datasetsResult.status === 'rejected'
                    ? `datasets: ${getErrorMessage(datasetsResult.reason)}`
                    : null,
                jobsResult.status === 'rejected'
                    ? `jobs: ${getErrorMessage(jobsResult.reason)}`
                    : null,
                modelsResult.status === 'rejected'
                    ? `models: ${getErrorMessage(modelsResult.reason)}`
                    : null,
                currentModelResult.status === 'rejected'
                    ? `active model: ${getErrorMessage(currentModelResult.reason)}`
                    : null,
            ].filter(Boolean)

            setState({
                datasets: nextDatasets,
                jobs: nextJobs,
                models: nextModels,
                currentModel: nextCurrentModel,
                isLoading: false,
                error:
                    errors.length > 0
                        ? `Some dashboard data could not load (${errors.join('; ')})`
                        : null,
            })
        }

        void loadDashboard()

        return () => {
            isActive = false
        }
    }, [])

    const latestDataset = state.datasets[0] ?? null
    const latestJob = state.jobs[0] ?? null
    const latestModel = state.models[0] ?? null

    const summary = useMemo(() => {
        const uniqueClasses = new Set(state.datasets.flatMap((dataset) => dataset.class_names))
        const activeJobs = state.jobs.filter(isTrainJobActive).length

        return {
            datasetCount: state.datasets.length,
            jobCount: state.jobs.length,
            activeJobCount: activeJobs,
            modelCount: state.models.length,
            classCount: uniqueClasses.size,
            latestImagePairs: latestDataset?.num_pairs ?? 0,
        }
    }, [latestDataset?.num_pairs, state.datasets, state.jobs, state.models.length])

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <Container
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                        width: '100%',
                        overflow: 'hidden',
                        border: '2px solid #202020',
                        borderRadius: '24px',
                        background: '#141414',
                    }}
                >
                    <MetricCard
                        value={integerFormatter.format(summary.datasetCount)}
                        label="Stored datasets"
                        iconName="dataset-pair"
                        to={ROUTES.DATASETS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.jobCount)}
                        label="Training jobs"
                        iconName="arrow-clockwise"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.activeJobCount)}
                        label="Active jobs"
                        iconName="arrow-down"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.modelCount)}
                        label="Stored models"
                        iconName="models"
                        to={ROUTES.MODELS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.latestImagePairs)}
                        label="Latest dataset pairs"
                        iconName="dataset-pair"
                        to={ROUTES.DATASETS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.classCount)}
                        label="Observed classes"
                        iconName="eye"
                        to={ROUTES.DATASETS}
                    />
                </Container>
            </Grid.Item>

            <Grid.Item as={Card} span={8} padding="xl" gap="xl" tone="hero" className={styles.hero}>
                <Badge size="sm" caps>
                    Workspace Overview
                </Badge>
                <Heading as="h1" size="display" tight measure="xl">
                    Overview.
                </Heading>
                <Text as="p" size="lg" tone="muted" measure="lg">
                    This dashboard streamlines the workflow from selecting images and creating
                    datasets to reviewing trained models and running detection.
                </Text>

                <div className={styles.actions}>
                    <Button as={Link} to={ROUTES.DATASET_CREATE} color="accent">
                        New Dataset
                    </Button>
                    <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral">
                        Open Jobs
                    </Button>
                    <Button as={Link} to={ROUTES.INFERENCE} variant="soft" color="neutral">
                        Open Inference
                    </Button>
                </div>
            </Grid.Item>

            <DashboardCard
                title="Active Runtime"
                subtitle="What the inference endpoint is currently using."
                span={4}
                className={styles.sideCard}
            >
                <div className={styles.stack}>
                    <Text
                        as="p"
                        family="mono"
                        weight="medium"
                        surface="inset"
                        fluid
                    >
                        {state.currentModel?.version ?? 'No runtime model reported'}
                    </Text>
                    <Text as="p" size="sm" tone="muted" measure="lg">
                        This is the live detector handle, not necessarily the latest trained
                        artifact. Model activation belongs here next.
                    </Text>
                    <div className={styles.actions}>
                        <Button as={Link} to={ROUTES.INFERENCE} variant="ghost" color="neutral">
                            Test Current Model
                        </Button>
                        {state.currentModel?.model_id ? (
                            <Button
                                as={Link}
                                to={routePath.modelDetail(state.currentModel.model_id)}
                                variant="ghost"
                                color="neutral"
                            >
                                Open Active Model
                            </Button>
                        ) : null}
                    </div>
                </div>
            </DashboardCard>

            <DashboardCard
                title="Recent Datasets"
                subtitle="Immutable dataset artifacts that can be downloaded or used for training."
                span={7}
                className={styles.datasets}
                action={
                    <Button as={Link} to={ROUTES.DATASETS} variant="ghost" color="neutral" size="sm">
                        Open Library
                    </Button>
                }
            >
                {state.isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Loading datasets...
                    </Text>
                ) : state.datasets.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        No stored datasets yet. Start from the dataset builder and package your
                        annotated images into the first artifact.
                    </Text>
                ) : (
                    <div className={styles.list}>
                        {state.datasets.slice(0, 4).map((dataset) => (
                            <Card as="article" key={dataset.id} padding="md" gap="md" tone="muted" className={styles.row}>
                                <div className={styles.rowTop}>
                                    <div className={styles.rowTitle}>
                                        <Heading as="h3" size="sm" family="primary">
                                            Dataset {shortId(dataset.id)}
                                        </Heading>
                                        <Text as="span" size="sm" tone="muted">
                                            Created {formatDate(dataset.created_at)}
                                        </Text>
                                    </div>
                                    <Badge>{integerFormatter.format(dataset.num_pairs)} pairs</Badge>
                                </div>

                                <div className={styles.badges}>
                                    <Badge>{summarizeClasses(dataset.class_names)}</Badge>
                                    <Badge>train {dataset.train_count} / val {dataset.val_count}</Badge>
                                    <Badge>ratio {dataset.ratio.toFixed(2)}</Badge>
                                </div>

                                <div className={styles.listActions}>
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
                                        onClick={() => void handleProtectedDownload(dataset.download_url)}
                                        variant="outline"
                                        color="neutral"
                                        size="sm"
                                    >
                                        Download ZIP
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </DashboardCard>

            <DashboardCard
                title="Recent Models"
                subtitle="Training outputs already persisted by the backend."
                span={5}
                className={styles.models}
                action={
                    <Button as={Link} to={ROUTES.MODELS} variant="ghost" color="neutral" size="sm">
                        Open Library
                    </Button>
                }
            >
                {state.isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Loading models...
                    </Text>
                ) : state.models.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        No trained models stored yet. Queue a training job from a dataset card
                        and finished artifacts will appear here.
                    </Text>
                ) : (
                    <div className={styles.list}>
                        {state.models.slice(0, 4).map((model) => (
                            <Card as="article" key={model.id} padding="md" gap="md" tone="muted" className={styles.row}>
                                <div className={styles.rowTop}>
                                    <div className={styles.rowTitle}>
                                        <Heading as="h3" size="sm" family="primary">
                                            Model {shortId(model.id)}
                                        </Heading>
                                        <Text as="span" size="sm" tone="muted">
                                            Trained {formatDate(model.created_at)}
                                        </Text>
                                    </div>
                                    <Badge>{model.epochs} epochs</Badge>
                                </div>

                                <div className={styles.badges}>
                                    <Badge>dataset {shortId(model.dataset_id)}</Badge>
                                    <Badge>imgsz {model.imgsz}</Badge>
                                </div>

                                <Text as="span" size="sm" family="mono" tone="muted">
                                    {model.best_weights_path}
                                </Text>
                                <div className={styles.listActions}>
                                    <Button
                                        as={Link}
                                        to={routePath.modelDetail(model.id)}
                                        variant="soft"
                                        color="neutral"
                                        size="sm"
                                    >
                                        Open Detail
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </DashboardCard>

            <DashboardCard
                title="Training Jobs"
                subtitle="Queued and running work survives page navigation."
                span={4}
                className={styles.workflow}
                action={
                    <Button as={Link} to={ROUTES.JOBS} variant="ghost" color="neutral" size="sm">
                        Open Jobs
                    </Button>
                }
            >
                {state.isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Loading jobs...
                    </Text>
                ) : state.jobs.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        No training jobs yet. Queue one from a dataset card and its progress
                        will appear here.
                    </Text>
                ) : (
                    <div className={styles.jobList}>
                        {state.jobs.slice(0, 3).map((job) => {
                            const progress = getTrainJobProgress(job)

                            return (
                                <Card
                                    key={job.id}
                                    padding="md"
                                    gap="md"
                                    tone={getTrainJobTone(job)}
                                    className={styles.jobCard}
                                >
                                    <div className={styles.rowTop}>
                                        <div className={styles.rowTitle}>
                                            <Heading as="h3" size="sm" family="primary">
                                                Job {shortId(job.id)}
                                            </Heading>
                                            <Text as="span" size="sm" tone="muted">
                                                dataset {shortId(job.dataset_id)}
                                            </Text>
                                        </div>
                                        <Badge color={getTrainJobBadgeColor(job)}>
                                            {getTrainJobLabel(job)}
                                        </Badge>
                                    </div>

                                    <div className={styles.progressBlock}>
                                        <div className={styles.progressRow}>
                                            <Text as="span" size="sm" tone="muted">
                                                Progress
                                            </Text>
                                            <Text as="span" size="sm" weight="semibold">
                                                {progress}%
                                            </Text>
                                        </div>
                                        <div className={styles.progressTrack} aria-hidden="true">
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.listActions}>
                                        <Button
                                            as={Link}
                                            to={routePath.datasetDetail(job.dataset_id)}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Dataset
                                        </Button>
                                        {job.model_id ? (
                                            <Button
                                                as={Link}
                                                to={routePath.modelDetail(job.model_id)}
                                                variant="ghost"
                                                color="neutral"
                                                size="sm"
                                            >
                                                Model
                                            </Button>
                                        ) : (
                                            <Button
                                                as={Link}
                                                to={ROUTES.JOBS}
                                                variant="ghost"
                                                color="neutral"
                                                size="sm"
                                            >
                                                Details
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </DashboardCard>

            <DashboardCard
                title="Latest Dataset Snapshot"
                subtitle="A compact summary of the freshest dataset artifact."
                span={4}
                className={styles.snapshot}
            >
                {latestDataset ? (
                    <div className={styles.stack}>
                        <Badge>{summarizeClasses(latestDataset.class_names)}</Badge>
                        <Text as="p" size="sm" tone="muted" measure="lg">
                            {integerFormatter.format(latestDataset.num_pairs)} image/label pairs with
                            train/val split {latestDataset.train_count}/{latestDataset.val_count}.
                        </Text>
                        <Text as="p" size="sm" tone="muted">
                            Created {formatDate(latestDataset.created_at)}.
                        </Text>
                        <Button
                            onClick={() => void handleProtectedDownload(latestDataset.download_url)}
                            variant="outline"
                            color="neutral"
                        >
                            Download Latest Dataset
                        </Button>
                        <Button as={Link} to={ROUTES.DATASETS} variant="ghost" color="neutral">
                            Open Dataset Library
                        </Button>
                        <Button
                            as={Link}
                            to={routePath.datasetDetail(latestDataset.id)}
                            variant="ghost"
                            color="neutral"
                        >
                            Open Dataset Detail
                        </Button>
                    </div>
                ) : (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Build a dataset to populate this card.
                    </Text>
                )}
            </DashboardCard>

            <DashboardCard
                title="Latest Training Output"
                subtitle="Useful for deciding what the next activation flow should expose."
                span={4}
                className={styles.status}
            >
                {latestModel ? (
                    <div className={styles.stack}>
                        <Badge>Model {shortId(latestModel.id)}</Badge>
                        <Text as="p" size="sm" tone="muted" measure="lg">
                            Trained from dataset {shortId(latestModel.dataset_id)} at{' '}
                            {formatDate(latestModel.created_at)}.
                        </Text>
                        <Text
                            as="p"
                            size="sm"
                            family="mono"
                            weight="medium"
                            surface="inset"
                            fluid
                        >
                            {latestModel.best_weights_path}
                        </Text>
                        <Button as={Link} to={ROUTES.MODELS} variant="ghost" color="neutral">
                            Open Model Library
                        </Button>
                        <Button
                            as={Link}
                            to={routePath.modelDetail(latestModel.id)}
                            variant="ghost"
                            color="neutral"
                        >
                            Open Model Detail
                        </Button>
                    </div>
                ) : (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        No training output is stored yet. Active and queued jobs are tracked on
                        the jobs page while this card waits for the next completed artifact.
                    </Text>
                )}
            </DashboardCard>

            {latestJob ? (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Latest job {shortId(latestJob.id)} is {getTrainJobLabel(latestJob).toLowerCase()}{' '}
                        at {getTrainJobProgress(latestJob)}%.
                    </Text>
                </Grid.Item>
            ) : null}

            {state.error ? (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" surface="danger">
                        {state.error}
                    </Text>
                </Grid.Item>
            ) : null}
        </Grid>
    )
}
