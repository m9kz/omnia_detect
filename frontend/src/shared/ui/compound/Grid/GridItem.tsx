import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import styles from './Grid.module.css'

type GridItemOwnProps = {
    span?: number
}

type GridItemProps<E extends React.ElementType = 'div'> = PolymorphicProps<E, GridItemOwnProps>

const GridItemImpl = <E extends React.ElementType = 'div'>(
    { as, className, span, style, ...props }: GridItemProps<E>,
    ref: PolymorphicRef<E>,
) => {
    const Component = as ?? 'div'

    return (
        <Component
            ref={ref}
            className={cn(styles.item, className)}
            style={{
                ...style,
                ...(span ? { ['--grid-span' as string]: String(span) } : {}),
            }}
            {...props}
        />
    )
}

const GridItemBase = React.forwardRef(GridItemImpl as never) as PolymorphicComponent<'div', GridItemOwnProps>

GridItemBase.displayName = 'Grid.Item'

export const GridItem = GridItemBase
