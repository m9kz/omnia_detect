import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import { GridItem } from './GridItem'
import styles from './Grid.module.css'

type GridOwnProps = {
    columns?: number
    gap?: 'sm' | 'md' | 'lg' | 'xl'
    align?: 'stretch' | 'start' | 'center' | 'end'
    justify?: 'start' | 'center' | 'end' | 'between'
    layout?: 'fixed' | 'auto'
    track?: 'fluid' | 'fit'
    minItemWidth?: number | string
}

type GridProps<E extends React.ElementType = 'div'> = PolymorphicProps<E, GridOwnProps>

const GridImpl = <E extends React.ElementType = 'div'>(
    {
        as,
        className,
        columns = 1,
        gap = 'lg',
        align = 'stretch',
        justify = 'start',
        layout = 'fixed',
        track = 'fluid',
        minItemWidth = '14rem',
        style,
        ...props
    }: GridProps<E>,
    ref: PolymorphicRef<E>,
) => {
    const Component = as ?? 'div'

    return (
        <Component
            ref={ref}
            className={cn(
                styles.grid,
                styles[`gap${gap[0].toUpperCase()}${gap.slice(1)}`],
                styles[`align${align[0].toUpperCase()}${align.slice(1)}`],
                styles[`justify${justify[0].toUpperCase()}${justify.slice(1)}`],
                styles[`layout${layout[0].toUpperCase()}${layout.slice(1)}`],
                styles[`track${track[0].toUpperCase()}${track.slice(1)}`],
                className,
            )}
            style={{
                ...style,
                ['--grid-columns' as string]: String(columns),
                ['--grid-min' as string]:
                    typeof minItemWidth === 'number' ? `${minItemWidth}px` : minItemWidth,
                ['--grid-max' as string]: track === 'fit' ? 'max-content' : '1fr',
            }}
            {...props}
        />
    )
}

const GridBase = React.forwardRef(GridImpl as never) as PolymorphicComponent<'div', GridOwnProps>

GridBase.displayName = 'Grid'

export const Grid = Object.assign(GridBase, {
    Item: GridItem,
})
