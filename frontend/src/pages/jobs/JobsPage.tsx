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

import styles from './JobsPage.module.css'

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
})

const integerFormatter = new Intl.NumberFormat('uk-UA')

function shortId(value: string) {
    return value.slice(0, 8)
}

function formatDate(value: string | null) {
    if (!value) {
        return 'Не розпочато'
    }

    return dateFormatter.format(new Date(value))
}

function getJobSummary(job: TrainJobItemSchema) {
    if (job.status === 'failed') {
        return job.error ?? 'Навчання завершилось помилкою.'
    }

    if (job.status === 'completed') {
        return 'Навчання завершено, модель збережено.'
    }

    if (job.status === 'running') {
        if (job.current_epoch && job.total_epochs > 0) {
            return `Епоха ${job.current_epoch}/${job.total_epochs} виконується.`
        }

        return 'Модель навчається.'
    }

    return 'Очікує запуску.'
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

                setError(getErrorMessage(loadError, 'Не вдалося завантажити навчання'))
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
                <MetricCard.Group columns={4}>
                    <MetricCard
                        value={integerFormatter.format(stats.totalJobs)}
                        label="Усього задач"
                        iconName="arrow-clockwise"
                        to={ROUTES.JOBS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.activeJobs)}
                        label="Активні"
                        iconName="arrow-down"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.completedJobs)}
                        label="Завершені"
                        iconName="models"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(stats.failedJobs)}
                        label="Помилки"
                        iconName="eye"
                        to={ROUTES.JOBS}
                    />
                </MetricCard.Group>
            </Grid.Item>

            <Grid.Item span={8} spanMd={12}>
                <Card padding="xl" gap="xl" tone="hero" align="start">
                    <Badge size="sm" caps>
                        Навчання моделей
                    </Badge>
                    <Heading as="h1" size="display" tight measure="xl">
                        Навчання
                    </Heading>
                    <Text as="p" size="lg" tone="muted" measure="lg">
                        Стежте за чергою, прогресом епох і результатами навчання.
                    </Text>

                    <Container display="flex" gap="md" align="center" wrap>
                        <Button as={Link} to={ROUTES.DATASETS}>
                            Запустити з датасету
                        </Button>
                        <Button as={Link} to={ROUTES.MODELS} variant="soft" color="neutral">
                            Переглянути моделі
                        </Button>
                    </Container>
                </Card>
            </Grid.Item>

            <Grid.Item span={4} spanMd={12}>
                <Card as="article" padding="lg" gap="md" align="start">
                    <Badge size="sm" caps>
                        Стан черги
                    </Badge>
                    <Heading as="h2" size="lg" measure="md">
                        Поточні запуски
                    </Heading>
                    <Text as="p" size="md" tone="muted" measure="md">
                        Активні, завершені й помилкові задачі зібрані в одному списку.
                    </Text>
                    <Container display="flex" gap="sm" wrap>
                        <Badge color="neutral">{integerFormatter.format(stats.totalJobs)} задач</Badge>
                        <Badge>{integerFormatter.format(stats.activeJobs)} активні</Badge>
                        <Badge color="success">{integerFormatter.format(stats.completedJobs)} завершені</Badge>
                    </Container>
                </Card>
            </Grid.Item>
            <Grid.Item span={12}>
                {error ? (
                    <Text as="p" size="sm" surface="danger">
                        {error}
                    </Text>
                ) : isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Завантаження навчання...
                    </Text>
                ) : jobs.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Запусків ще немає. Оберіть датасет і додайте навчання до черги.
                    </Text>
                ) : (
                    <Grid gap="lg">
                        {jobs.map((job) => {
                            const progress = getTrainJobProgress(job)

                            return (
                                <Card
                                    key={job.id}
                                    as="article"
                                    padding="lg"
                                    gap="lg"
                                    tone={getTrainJobTone(job)}
                                >
                                    <Container display="flex" gap="md" align="start" justify="between" wrap>
                                        <Grid gap="sm">
                                            <Heading as="h3" size="sm" family="primary">
                                                Задача {shortId(job.id)}
                                            </Heading>
                                            <Text as="span" size="sm" tone="muted">
                                                Створено {formatDate(job.created_at)} / 
                                                Старт {formatDate(job.started_at)} /  
                                                Фініш {formatDate(job.finished_at)}
                                            </Text>
                                        </Grid>
                                    </Container>

                                    <Container display="flex" gap="sm" wrap>
                                        <Badge color={getTrainJobBadgeColor(job)}>
                                            {getTrainJobLabel(job)}
                                        </Badge>
                                        <Badge color="neutral">
                                            Датасет {shortId(job.dataset_id)}
                                        </Badge>
                                        <Badge color="neutral">
                                            {job.epochs} епох
                                        </Badge>
                                        <Badge color="neutral">
                                            Розмір {job.imgsz}
                                        </Badge>
                                        {job.base_model_id ? (
                                            <Badge color="neutral">
                                                базова модель {shortId(job.base_model_id)}
                                            </Badge>
                                        ) : null}
                                    </Container>

                                    <Grid gap="sm">
                                        <Container display="flex" gap="md" align="center" justify="between" wrap>
                                            <Text as="span" size="sm" tone="muted">
                                                Прогрес
                                            </Text>
                                            <Text as="span" size="sm" weight="semibold">
                                                {progress}%
                                            </Text>
                                        </Container>
                                        <div className={styles.progressTrack} aria-hidden="true">
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </Grid>

                                    <Text as="p" size="sm" tone="muted" measure="lg">
                                        {getJobSummary(job)} ({job.base_weights})
                                    </Text>

                                    <Container display="flex" gap="md" align="center" wrap>
                                        <Button
                                            as={Link}
                                            to={routePath.datasetDetail(job.dataset_id)}
                                            variant="soft"
                                            color="neutral"
                                            size="md"
                                        >
                                            Відкрити датасет
                                        </Button>
                                        {job.model_id ? (
                                            <Button
                                                as={Link}
                                                to={routePath.modelDetail(job.model_id)}
                                                variant="soft"
                                                color="neutral"
                                                size="md"
                                            >
                                                Відкрити модель
                                            </Button>
                                        ) : (
                                            <Button
                                                as={Link}
                                                to={ROUTES.MODELS}
                                                variant="ghost"
                                                color="neutral"
                                                size="md"
                                            >
                                                Переглянути моделі
                                            </Button>
                                        )}
                                    </Container>
                                </Card>
                            )
                        })}
                    </Grid>
                )}
            </Grid.Item>
        </Grid>
    )
}
