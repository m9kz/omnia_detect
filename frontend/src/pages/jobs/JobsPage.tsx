import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES, routePath } from '@/app/routes'
import {
    getTrainJobBadgeColor,
    getTrainJobLabel,
    getTrainJobProgress,
    getTrainJobTone,
    isTrainJobActive,
    listTrainJobs,
} from '@/entities/job'
import type { TrainJobItemSchema } from '@/entities/job'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Grid } from '@/shared/ui/compound/Grid'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import { MetricCard } from '@/shared/ui/MetricCard'

import pageStyles from '@/shared/styles/ResourcePage.module.css'
import styles from './JobsPage.module.css'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
})

const integerFormatter = new Intl.NumberFormat()

function shortId(value: string) {
    return value.slice(0, 8)
}

function formatDate(value: string | null) {
    if (!value) {
        return 'Not started'
    }

    return dateFormatter.format(new Date(value))
}

function getJobSummary(job: TrainJobItemSchema) {
    if (job.status === 'failed') {
        return job.error ?? 'Training failed.'
    }

    if (job.status === 'completed') {
        return job.message ?? 'Training finished and model artifacts were stored.'
    }

    if (job.status === 'running') {
        if (job.current_epoch && job.total_epochs > 0) {
            return `Epoch ${job.current_epoch}/${job.total_epochs} in progress.`
        }

        return job.message ?? 'Worker is training the model.'
    }

    return job.message ?? 'Waiting for the worker to start this training run.'
}

export function JobsPage() {
    const [jobs, setJobs] = useState<TrainJobItemSchema[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isActive = true

        async function loadJobs({ silent = false }: { silent?: boolean } = {}) {
            if (!silent) {
                setIsLoading(true)
            }

            try {
                const items = await listTrainJobs()
                if (!isActive) {
                    return
                }

                setJobs(items)
                setError(null)
            } catch (loadError: unknown) {
                if (!isActive) {
                    return
                }

                setError(getErrorMessage(loadError, 'Failed to load training jobs'))
            } finally {
                if (isActive && !silent) {
                    setIsLoading(false)
                }
            }
        }

        void loadJobs()

        const intervalId = window.setInterval(() => {
            void loadJobs({ silent: true })
        }, 2000)

        return () => {
            isActive = false
            window.clearInterval(intervalId)
        }
    }, [])

    const stats = useMemo(() => {
        const activeJobs = jobs.filter(isTrainJobActive).length
        const completedJobs = jobs.filter((job) => job.status === 'completed').length
        const failedJobs = jobs.filter((job) => job.status === 'failed').length

        return {
            totalJobs: jobs.length,
            activeJobs,
            completedJobs,
            failedJobs,
        }
    }, [jobs])

    return (
        <Grid as="section" columns={12} gap="xl">
            <Grid.Item span={12}>
                <Container
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        width: '100%',
                        overflow: 'hidden',
                        border: '2px solid #202020',
                        borderRadius: '24px',
                        background: '#141414',
                    }}
                >
                    <MetricCard
                        value={integerFormatter.format(stats.totalJobs)}
                        label="Total jobs"
                        iconName="arrow-clockwise"
                        to={ROUTES.JOBS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.activeJobs)}
                        label="Active jobs"
                        iconName="arrow-down"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.completedJobs)}
                        label="Completed jobs"
                        iconName="models"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.failedJobs)}
                        label="Failed jobs"
                        iconName="eye"
                        to={ROUTES.JOBS}
                    />
                </Container>
            </Grid.Item>

            <Grid.Item span={8}>
                <Card padding="xl" gap="xl" tone="hero">
                    <Badge size="sm" caps>
                        Training Jobs
                    </Badge>
                    <Heading as="h1" size="display" tight measure="xl">
                        Jobs.
                    </Heading>
                    <Text as="p" size="lg" tone="muted" measure="lg">
                        Queue a dataset training run, leave the page, and track progress here while
                        the worker persists status and resulting model artifacts.
                    </Text>

                    <div className={pageStyles.heroActions}>
                        <Button as={Link} to={ROUTES.DATASETS}>
                            Queue From Datasets
                        </Button>
                        <Button as={Link} to={ROUTES.MODELS} variant="soft" color="neutral">
                            Open Model Library
                        </Button>
                    </div>
                </Card>
            </Grid.Item>

            <Grid.Item span={4}>
                <Card as="article" padding="lg" gap="md" className={pageStyles.sectionLead}>
                    <Badge size="sm" caps>
                        Queue state
                    </Badge>
                    <Heading as="h2" size="lg" measure="md">
                        Persisted training activity
                    </Heading>
                    <Text as="p" size="md" tone="muted" measure="md">
                        Jobs survive page navigation and remain queryable through the API until
                        they finish or fail.
                    </Text>
                    <div className={pageStyles.badgeRow}>
                        <Badge color="neutral">{integerFormatter.format(stats.totalJobs)} recorded</Badge>
                        <Badge>{integerFormatter.format(stats.activeJobs)} active</Badge>
                        <Badge color="success">{integerFormatter.format(stats.completedJobs)} done</Badge>
                    </div>
                </Card>
            </Grid.Item> 
            <Grid.Item span={12}>
                {error ? (
                    <Text as="p" size="sm" surface="danger">
                        {error}
                    </Text>
                ) : isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Loading training jobs...
                    </Text>
                ) : jobs.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        No training jobs have been queued yet. Start from a dataset card to create
                        the first run.
                    </Text>
                ) : (
                    jobs.map((job) => {
                        const progress = getTrainJobProgress(job)

                        return (
                            <Card
                                key={job.id}
                                as="article"
                                padding="lg"
                                gap="lg"
                                tone={getTrainJobTone(job)}
                                className={styles.jobCard}
                            >
                                <div className={pageStyles.cardHeader}>
                                    <div className={pageStyles.cardTitle}>
                                        <Heading as="h3" size="sm" family="primary">
                                            Job {shortId(job.id)}
                                        </Heading>
                                        <Text as="span" size="sm" tone="muted">
                                            Created {formatDate(job.created_at)}
                                        </Text>
                                    </div>
                                    <Badge color={getTrainJobBadgeColor(job)}>
                                        {getTrainJobLabel(job)}
                                    </Badge>
                                </div>

                                <div className={pageStyles.badgeRow}>
                                    <Badge color="neutral">dataset {shortId(job.dataset_id)}</Badge>
                                    <Badge color="neutral">{job.epochs} epochs</Badge>
                                    <Badge color="neutral">imgsz {job.imgsz}</Badge>
                                    {job.base_model_id ? (
                                        <Badge color="neutral">
                                            base model {shortId(job.base_model_id)}
                                        </Badge>
                                    ) : null}
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

                                <Text as="p" size="sm" tone="muted" measure="lg">
                                    {getJobSummary(job)}
                                </Text>

                                <div className={styles.metaGrid}>
                                    <Text as="span" size="sm" tone="muted">
                                        Started {formatDate(job.started_at)}
                                    </Text>
                                    <Text as="span" size="sm" tone="muted">
                                        Finished {formatDate(job.finished_at)}
                                    </Text>
                                </div>

                                <Text as="p" size="sm" family="mono" tone="muted" truncate>
                                    {job.base_weights}
                                </Text>

                                <div className={pageStyles.actionRow}>
                                    <Button
                                        as={Link}
                                        to={routePath.datasetDetail(job.dataset_id)}
                                        variant="soft"
                                        color="neutral"
                                        size="sm"
                                    >
                                        Open Dataset
                                    </Button>
                                    {job.model_id ? (
                                        <Button
                                            as={Link}
                                            to={routePath.modelDetail(job.model_id)}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Open Model
                                        </Button>
                                    ) : (
                                        <Button
                                            as={Link}
                                            to={ROUTES.MODELS}
                                            variant="ghost"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Open Models
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        )
                    })
                )}        
            </Grid.Item>
        </Grid>
    )
}
