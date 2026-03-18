import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import styles from './Badge.module.css'

type BadgeOwnProps = {
    size?: 'sm' | 'md'
    color?: 'accent' | 'neutral' | 'success' | 'danger'
    variant?: 'soft' | 'outline' | 'solid'
    radius?: 'sm' | 'md' | 'pill'
    caps?: boolean
    fluid?: boolean
}

type BadgeProps<E extends React.ElementType = 'span'> = PolymorphicProps<E, BadgeOwnProps>

const BadgeImpl = <E extends React.ElementType = 'span'>(
    {
        as,
        className,
        size = 'md',
        color = 'accent',
        variant = 'soft',
        radius = 'pill',
        caps = false,
        fluid = false,
        ...props
    }: BadgeProps<E>,
    ref: PolymorphicRef<E>,
) => {
    const Component = as ?? 'span'

    return (
        <Component
            ref={ref}
            className={cn(
                styles.badge,
                styles[`size${size[0].toUpperCase()}${size.slice(1)}`],
                styles[`color${color[0].toUpperCase()}${color.slice(1)}`],
                styles[`variant${variant[0].toUpperCase()}${variant.slice(1)}`],
                styles[`radius${radius[0].toUpperCase()}${radius.slice(1)}`],
                caps && styles.caps,
                fluid && styles.fluid,
                className,
            )}
            {...props}
        />
    )
}

const BadgeBase = React.forwardRef(BadgeImpl as never) as PolymorphicComponent<'span', BadgeOwnProps>

BadgeBase.displayName = 'Badge'

export const Badge = BadgeBase
