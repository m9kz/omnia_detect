import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import type { IconName } from '@/shared/lib/iconMapper'
import { Icon } from '@/shared/ui/compound/Icon'
import { Button } from '@/shared/ui/primitives/Button'
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

export function MetricCard({
    value,
    label,
    trend,
    icon,
    iconName,
    to,
    actionLabel = 'more...',
    isFirst = false,
}: MetricCardProps) {
    const resolvedIcon =
        icon ??
        (iconName ? (
            <Icon.Svg
                name={iconName}
                size="lg"
                label={`${label} icon`}
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

            <Container className={styles.body}>
                <Text as="p" size="xl">
                    {value}
                </Text>

                {trend !== undefined ? (
                    <Text as="span" size="sm" className={trendClass}>
                        {trendArrow} {Math.abs(trend)}%
                    </Text>
                ) : null}
            </Container>

            {to ? (
                <Container className={styles.footer}>
                    <Button as={Link} to={to} variant="ghost" color="neutral">
                        {actionLabel}
                    </Button>
                </Container>
            ) : null}
        </Container>
    )
}
