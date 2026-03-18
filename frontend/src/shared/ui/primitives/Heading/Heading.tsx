import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import styles from './Heading.module.css'

type HeadingOwnProps = {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'display'
    weight?: 'medium' | 'semibold' | 'bold'
    family?: 'primary' | 'secondary' | 'inherit'
    tone?: 'default' | 'muted' | 'accent' | 'inherit'
    align?: 'left' | 'center' | 'right'
    tight?: boolean
    measure?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

type HeadingProps<E extends React.ElementType = 'h2'> = PolymorphicProps<E, HeadingOwnProps>

const HeadingImpl = <E extends React.ElementType = 'h2'>(
    {
        as,
        className,
        size = 'md',
        weight = 'semibold',
        family = 'secondary',
        tone = 'default',
        align = 'left',
        tight = false,
        measure = 'none',
        ...props
    }: HeadingProps<E>,
    ref: PolymorphicRef<E>,
) => {
    const Component = as ?? 'h2'

    return (
        <Component
            ref={ref}
            className={cn(
                styles.heading,
                styles[`size${size[0].toUpperCase()}${size.slice(1)}`],
                styles[`weight${weight[0].toUpperCase()}${weight.slice(1)}`],
                styles[`family${family[0].toUpperCase()}${family.slice(1)}`],
                styles[`tone${tone[0].toUpperCase()}${tone.slice(1)}`],
                styles[`align${align[0].toUpperCase()}${align.slice(1)}`],
                styles[`measure${measure[0].toUpperCase()}${measure.slice(1)}`],
                tight && styles.tight,
                className,
            )}
            {...props}
        />
    )
}

const HeadingBase = React.forwardRef(HeadingImpl as never) as PolymorphicComponent<'h2', HeadingOwnProps>

HeadingBase.displayName = 'Heading'

export const Heading = HeadingBase
