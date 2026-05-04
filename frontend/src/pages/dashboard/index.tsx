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
import { MetricCard } from '@/shared/ui/MetricCard'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './DashboardPage.module.css'

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

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
})

const integerFormatter = new Intl.NumberFormat('uk-UA')

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
            spanMd={12}
            padding="lg"
            gap="lg"
            align="start"
            className={className}
        >
            <Container display="flex" gap="md" align="start" justify="between" wrap>
                <Grid gap="sm">
                    <Heading as="h2" size="md">
                        {title}
                    </Heading>
                    <Card.Description>{subtitle}</Card.Description>
                </Grid>
                {action}
            </Container>
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
        window.alert(getErrorMessage(error, 'Не вдалося завантажити файл'))
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
                    ? `датасети: ${getErrorMessage(datasetsResult.reason)}`
                    : null,
                jobsResult.status === 'rejected'
                    ? `навчання: ${getErrorMessage(jobsResult.reason)}`
                    : null,
                modelsResult.status === 'rejected'
                    ? `моделі: ${getErrorMessage(modelsResult.reason)}`
                    : null,
                currentModelResult.status === 'rejected'
                    ? `активна модель: ${getErrorMessage(currentModelResult.reason)}`
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
                        ? `Частину даних не вдалося завантажити (${errors.join('; ')})`
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
                <MetricCard.Group columns={6}>
                    <MetricCard
                        value={integerFormatter.format(summary.datasetCount)}
                        label="Датасети"
                        iconName="dataset-pair"
                        to={ROUTES.DATASETS}
                        isFirst
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.jobCount)}
                        label="Навчання"
                        iconName="arrow-clockwise"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.activeJobCount)}
                        label="Активні задачі"
                        iconName="arrow-down"
                        to={ROUTES.JOBS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.modelCount)}
                        label="Моделі"
                        iconName="models"
                        to={ROUTES.MODELS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.latestImagePairs)}
                        label="Пари в останньому датасеті"
                        iconName="dataset-pair"
                        to={ROUTES.DATASETS}
                    />
                    <MetricCard
                        value={integerFormatter.format(summary.classCount)}
                        label="Класи"
                        iconName="eye"
                        to={ROUTES.DATASETS}
                    />
                </MetricCard.Group>
            </Grid.Item>

            <Grid.Item
                as={Card}
                span={8}
                spanMd={12}
                padding="xl"
                gap="xl"
                tone="hero"
                align="start"
                className={styles.hero}
            >
                <Badge size="sm" caps>
                    Робочий простір
                </Badge>
                <Heading as="h1" size="display" tight measure="xl">
                    Огляд системи
                </Heading>
                <Text as="p" size="lg" tone="muted" measure="lg">
                    Керуйте датасетами, навчанням моделей і перевіркою детекції в одному місці.
                </Text>

                <Container display="flex" gap="md" wrap>
                    <Button as={Link} to={ROUTES.DATASET_CREATE} color="accent">
                        Створити датасет
                    </Button>
                    <Button as={Link} to={ROUTES.JOBS} variant="soft" color="neutral">
                        Переглянути навчання
                    </Button>
                    <Button as={Link} to={ROUTES.INFERENCE} variant="soft" color="neutral">
                        Запустити детекцію
                    </Button>
                </Container>
            </Grid.Item>

            <DashboardCard
                title="Активна модель"
                subtitle="Модель, яка зараз використовується для детекції."
                span={4}
            >
                <Container display="grid" gap="md">
                    <Text
                        as="p"
                        family="mono"
                        weight="medium"
                        surface="inset"
                        fluid
                    >
                        {state.currentModel?.version ?? 'Активну модель не знайдено'}
                    </Text>
                    <Text as="p" size="sm" tone="muted" measure="lg">
                        Перевірте її на зображенні або відкрийте картку моделі.
                    </Text>
                    <Container display="flex" gap="md" wrap>
                        <Button as={Link} to={ROUTES.INFERENCE} variant="ghost" color="neutral">
                            Перевірити модель
                        </Button>
                        {state.currentModel?.model_id ? (
                            <Button
                                as={Link}
                                to={routePath.modelDetail(state.currentModel.model_id)}
                                variant="ghost"
                                color="neutral"
                            >
                                Відкрити модель
                            </Button>
                        ) : null}
                    </Container>
                </Container>
            </DashboardCard>

            <DashboardCard
                title="Останні датасети"
                subtitle="Готові архіви для завантаження й навчання."
                span={7}
                action={
                    <Button as={Link} to={ROUTES.DATASETS} variant="ghost" color="neutral" size="sm">
                        Усі датасети
                    </Button>
                }
            >
                {state.isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Завантаження датасетів...
                    </Text>
                ) : state.datasets.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Датасетів ще немає. Створіть перший архів із розмічених зображень.
                    </Text>
                ) : (
                    <Grid gap="md">
                        {state.datasets.slice(0, 4).map((dataset) => (
                            <Card as="article" key={dataset.id} padding="md" gap="md" tone="muted">
                                <Container display="flex" gap="md" align="center" justify="between" wrap>
                                    <Grid gap="sm">
                                        <Heading as="h3" size="sm" family="primary">
                                            Датасет {shortId(dataset.id)}
                                        </Heading>
                                        <Text as="span" size="sm" tone="muted">
                                            Створено {formatDate(dataset.created_at)}
                                        </Text>
                                    </Grid>
                                    <Badge>{integerFormatter.format(dataset.num_pairs)} пар</Badge>
                                </Container>

                                <Container display="flex" gap="sm" wrap>
                                    <Badge>{summarizeClasses(dataset.class_names)}</Badge>
                                    <Badge>train {dataset.train_count} / val {dataset.val_count}</Badge>
                                    <Badge>частка {dataset.ratio.toFixed(2)}</Badge>
                                </Container>

                                <Container display="flex" gap="sm" align="center" wrap>
                                    <Button
                                        as={Link}
                                        to={routePath.datasetDetail(dataset.id)}
                                        variant="soft"
                                        color="neutral"
                                        size="sm"
                                    >
                                        Відкрити
                                    </Button>
                                    <Button
                                        onClick={() => void handleProtectedDownload(dataset.download_url)}
                                        variant="outline"
                                        color="neutral"
                                        size="sm"
                                    >
                                        Завантажити ZIP
                                    </Button>
                                </Container>
                            </Card>
                        ))}
                    </Grid>
                )}
            </DashboardCard>

            <DashboardCard
                title="Останні моделі"
                subtitle="Збережені результати навчання."
                span={5}
                action={
                    <Button as={Link} to={ROUTES.MODELS} variant="ghost" color="neutral" size="sm">
                        Усі моделі
                    </Button>
                }
            >
                {state.isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Завантаження моделей...
                    </Text>
                ) : state.models.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Моделей ще немає. Запустіть навчання з картки датасету.
                    </Text>
                ) : (
                    <Grid gap="md">
                        {state.models.slice(0, 4).map((model) => (
                            <Card as="article" key={model.id} padding="md" gap="md" tone="muted">
                                <Container display="flex" gap="md" align="center" justify="between" wrap>
                                    <Grid gap="sm">
                                        <Heading as="h3" size="sm" family="primary">
                                            Модель {shortId(model.id)}
                                        </Heading>
                                        <Text as="span" size="sm" tone="muted">
                                            Навчено {formatDate(model.created_at)}
                                        </Text>
                                    </Grid>
                                    <Badge>{model.epochs} епох</Badge>
                                </Container>

                                <Container display="flex" gap="sm" wrap>
                                    <Badge>датасет {shortId(model.dataset_id)}</Badge>
                                    <Badge>розмір {model.imgsz}</Badge>
                                </Container>

                                <Text as="span" size="sm" family="mono" tone="muted">
                                    {model.best_weights_path}
                                </Text>
                                <Container display="flex" gap="sm" align="center" wrap>
                                    <Button
                                        as={Link}
                                        to={routePath.modelDetail(model.id)}
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
            </DashboardCard>

            <DashboardCard
                title="Навчання"
                subtitle="Черга запусків і поточний прогрес."
                span={4}
                action={
                    <Button as={Link} to={ROUTES.JOBS} variant="ghost" color="neutral" size="sm">
                        Відкрити
                    </Button>
                }
            >
                {state.isLoading ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Завантаження навчання...
                    </Text>
                ) : state.jobs.length === 0 ? (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Задач навчання ще немає. Запустіть навчання з картки датасету.
                    </Text>
                ) : (
                    <Grid gap="md">
                        {state.jobs.slice(0, 3).map((job) => {
                            const progress = getTrainJobProgress(job)

                            return (
                                <Card
                                    key={job.id}
                                    padding="md"
                                    gap="md"
                                    tone={getTrainJobTone(job)}
                                >
                                    <Container display="flex" gap="md" align="center" justify="between" wrap>
                                        <Grid gap="sm">
                                            <Heading as="h3" size="sm" family="primary">
                                                Задача {shortId(job.id)}
                                            </Heading>
                                            <Text as="span" size="sm" tone="muted">
                                                датасет {shortId(job.dataset_id)}
                                            </Text>
                                        </Grid>
                                        <Badge color={getTrainJobBadgeColor(job)}>
                                            {getTrainJobLabel(job)}
                                        </Badge>
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

                                    <Container display="flex" gap="sm" align="center" wrap>
                                        <Button
                                            as={Link}
                                            to={routePath.datasetDetail(job.dataset_id)}
                                            variant="soft"
                                            color="neutral"
                                            size="sm"
                                        >
                                            Датасет
                                        </Button>
                                        {job.model_id ? (
                                            <Button
                                                as={Link}
                                                to={routePath.modelDetail(job.model_id)}
                                                variant="ghost"
                                                color="neutral"
                                                size="sm"
                                            >
                                                Модель
                                            </Button>
                                        ) : (
                                            <Button
                                                as={Link}
                                                to={ROUTES.JOBS}
                                                variant="ghost"
                                                color="neutral"
                                                size="sm"
                                            >
                                                Деталі
                                            </Button>
                                        )}
                                    </Container>
                                </Card>
                            )
                        })}
                    </Grid>
                )}
            </DashboardCard>

            <DashboardCard
                title="Останній датасет"
                subtitle="Короткий підсумок найновішого архіву."
                span={4}
            >
                {latestDataset ? (
                    <Container display="grid" gap="md">
                        <Badge>{summarizeClasses(latestDataset.class_names)}</Badge>
                        <Text as="p" size="sm" tone="muted" measure="lg">
                            {integerFormatter.format(latestDataset.num_pairs)} пар зображень і
                            міток, train/val {latestDataset.train_count}/{latestDataset.val_count}.
                        </Text>
                        <Text as="p" size="sm" tone="muted">
                            Створено {formatDate(latestDataset.created_at)}.
                        </Text>
                        <Button
                            onClick={() => void handleProtectedDownload(latestDataset.download_url)}
                            variant="outline"
                            color="neutral"
                        >
                            Завантажити датасет
                        </Button>
                        <Button as={Link} to={ROUTES.DATASETS} variant="ghost" color="neutral">
                            Усі датасети
                        </Button>
                        <Button
                            as={Link}
                            to={routePath.datasetDetail(latestDataset.id)}
                            variant="ghost"
                            color="neutral"
                        >
                            Відкрити датасет
                        </Button>
                    </Container>
                ) : (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Створіть датасет, щоб побачити підсумок.
                    </Text>
                )}
            </DashboardCard>

            <DashboardCard
                title="Остання модель"
                subtitle="Найсвіжіший результат навчання."
                span={4}
            >
                {latestModel ? (
                    <Container display="grid" gap="md">
                        <Badge>Модель {shortId(latestModel.id)}</Badge>
                        <Text as="p" size="sm" tone="muted" measure="lg">
                            Навчено з датасету {shortId(latestModel.dataset_id)}:{' '}
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
                            Усі моделі
                        </Button>
                        <Button
                            as={Link}
                            to={routePath.modelDetail(latestModel.id)}
                            variant="ghost"
                            color="neutral"
                        >
                            Відкрити модель
                        </Button>
                    </Container>
                ) : (
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Моделей ще немає. Запустіть навчання, щоб отримати перший результат.
                    </Text>
                )}
            </DashboardCard>

            {latestJob ? (
                <Grid.Item span={12}>
                    <Text as="p" size="sm" tone="muted" surface="soft">
                        Остання задача {shortId(latestJob.id)}: {getTrainJobLabel(latestJob).toLowerCase()},{' '}
                        {getTrainJobProgress(latestJob)}%.
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
