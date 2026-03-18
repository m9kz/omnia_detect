import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import styles from './Text.module.css'

type TextOwnProps = {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    weight?: 'regular' | 'medium' | 'semibold' | 'bold'
    family?: 'primary' | 'secondary' | 'mono' | 'inherit'
    tone?: 'default' | 'muted' | 'subtle' | 'accent' | 'success' | 'danger' | 'inherit'
    align?: 'left' | 'center' | 'right'
    truncate?: boolean
    measure?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    surface?: 'none' | 'soft' | 'inset' | 'success' | 'danger'
    fluid?: boolean
    caps?: boolean
}

type TextProps<E extends React.ElementType = 'p'> = PolymorphicProps<E, TextOwnProps>

const TextImpl = <E extends React.ElementType = 'p'>(
    {
        as,
        className,
        size = 'md',
        weight = 'regular',
        family = 'primary',
        tone = 'default',
        align = 'left',
        truncate = false,
        measure = 'none',
        surface = 'none',
        fluid = false,
        caps = false,
        ...props
    }: TextProps<E>,
    ref: PolymorphicRef<E>,
) => {
    const Component = as ?? 'p'

    return (
        <Component
            ref={ref}
            className={cn(
                styles.text,
                styles[`size${size[0].toUpperCase()}${size.slice(1)}`],
                styles[`weight${weight[0].toUpperCase()}${weight.slice(1)}`],
                styles[`family${family[0].toUpperCase()}${family.slice(1)}`],
                styles[`tone${tone[0].toUpperCase()}${tone.slice(1)}`],
                styles[`align${align[0].toUpperCase()}${align.slice(1)}`],
                styles[`measure${measure[0].toUpperCase()}${measure.slice(1)}`],
                styles[`surface${surface[0].toUpperCase()}${surface.slice(1)}`],
                truncate && styles.truncate,
                fluid && styles.fluid,
                caps && styles.caps,
                className,
            )}
            {...props}
        />
    )
}

const TextBase = React.forwardRef(TextImpl as never) as PolymorphicComponent<'p', TextOwnProps>

TextBase.displayName = 'Text'

export const Text = TextBase
