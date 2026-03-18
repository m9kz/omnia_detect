import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import styles from './Container.module.css'

type ContainerOwnProps = {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    fluid?: boolean
    padded?: boolean
    center?: boolean
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
                className,
            )}
            {...props}
        />
    )
}

const ContainerBase = React.forwardRef(ContainerImpl as never) as PolymorphicComponent<'div', ContainerOwnProps>

ContainerBase.displayName = 'Container'

export const Container = ContainerBase
