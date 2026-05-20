import type { ReactNode } from 'react'

import type { IconName } from '@/shared/lib/iconMapper'
import { Icon } from '@/shared/ui/compound/Icon'
import { Grid } from '@/shared/ui/compound/Grid'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'

import styles from './MetricCard.module.css'

type MetricCardProps = {
    value: string
    label: string
    trend?: number
    icon?: ReactNode
    iconName?: IconName
    to?: string
    actionLabel?: string
    isFirst?: boolean
}

type MetricCardGroupProps = {
    children: ReactNode
    columns?: number
    minItemWidth?: number | string
}

function MetricCardRoot({
    value,
    label,
    trend,
    icon,
    iconName,
    isFirst = false,
}: MetricCardProps) {
    const resolvedIcon =
        icon ??
        (iconName ? (
            <Icon.Svg
                name={iconName}
                size="lg"
                label={`${label}: іконка`}
                className={styles.icon}
            />
        ) : null)

    const isPositive = trend !== undefined && trend > 0
    const isNegative = trend !== undefined && trend < 0

    const trendClass = isPositive
        ? styles.trendPositive
        : isNegative
        ? styles.trendNegative
        : styles.trendNeutral

    const trendArrow = isPositive ? '↑' : isNegative ? '↓' : ''

    return (
        <Container
            size="full"
            className={`${styles.root} ${isFirst ? styles.isFirst : ''}`}
        >
            <Container className={styles.header}>
                {resolvedIcon}
                <Heading size="sm" tone="muted">
                    {label}
                </Heading>
            </Container>

            <Container>
                <Text as="p" size='xxl' weight='bold' tone='default'>
                    {value}
                </Text>

                {trend !== undefined ? (
                    <Text as="span" size="sm" className={trendClass}>
                        {trendArrow} {Math.abs(trend)}%
                    </Text>
                ) : null}
            </Container>
        </Container>
    )
}

function MetricCardGroup({
    children,
    columns = 3,
    minItemWidth = '11rem',
}: MetricCardGroupProps) {
    return (
        <Grid
            columns={columns}
            gap="none"
            layout="auto"
            minItemWidth={minItemWidth}
            className={styles.group}
        >
            {children}
        </Grid>
    )
}

export const MetricCard = Object.assign(MetricCardRoot, {
    Group: MetricCardGroup,
})
