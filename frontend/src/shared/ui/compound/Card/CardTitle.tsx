import React from 'react'
import { Heading } from '@/shared/ui/primitives/Heading'
import styles from './Card.module.css'

type CardTitleProps = React.ComponentProps<typeof Heading> & {
    as?: 'h2' | 'h3' | 'h4'
}

export function CardTitle({
    as = 'h3',
    className,
    size = 'sm',
    family = 'secondary',
    weight = 'semibold',
    ...props
}: CardTitleProps) {
    return (
        <Heading
            as={as}
            size={size}
            family={family}
            weight={weight}
            className={[styles.title, className].filter(Boolean).join(' ')}
            {...props}
        />
    )
}
