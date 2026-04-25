import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import styles from './Container.module.css'

type ContainerOwnProps = {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    fluid?: boolean
    padded?: boolean
    center?: boolean
    display?: 'block' | 'grid' | 'flex'
    direction?: 'row' | 'column'
    gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    align?: 'stretch' | 'start' | 'center' | 'end' | 'baseline'
    justify?: 'stretch' | 'start' | 'center' | 'end' | 'between'
    wrap?: boolean
}

type ContainerProps<E extends React.ElementType = 'div'> = PolymorphicProps<E, ContainerOwnProps>

const ContainerImpl = <E extends React.ElementType = 'div'>(
    {
        as,
        className,
        size = 'full',
        fluid = false,
        padded = false,
        center = false,
        display,
        direction,
        gap,
        align,
        justify,
        wrap = false,
        ...props
    }: ContainerProps<E>,
    ref: PolymorphicRef<E>,
) => {
    const Component = as ?? 'div'

    return (
        <Component
            ref={ref}
            className={cn(
                styles.container,
                styles[`size${size[0].toUpperCase()}${size.slice(1)}`],
                fluid && styles.fluid,
                padded && styles.padded,
                center && styles.center,
                display && styles[`display${display[0].toUpperCase()}${display.slice(1)}`],
                direction && styles[`direction${direction[0].toUpperCase()}${direction.slice(1)}`],
                gap && styles[`gap${gap[0].toUpperCase()}${gap.slice(1)}`],
                align && styles[`align${align[0].toUpperCase()}${align.slice(1)}`],
                justify && styles[`justify${justify[0].toUpperCase()}${justify.slice(1)}`],
                wrap && styles.wrap,
                className,
            )}
            {...props}
        />
    )
}

const ContainerBase = React.forwardRef(ContainerImpl as never) as PolymorphicComponent<'div', ContainerOwnProps>

ContainerBase.displayName = 'Container'

export const Container = ContainerBase
