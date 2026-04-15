import React from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Card.module.css'
import { CardContent } from './CardContent'
import { CardDescription } from './CardDescription'
import { CardFooter } from './CardFooter'
import { CardHeader } from './CardHeader'
import { CardTitle } from './CardTitle'

type CardProps = React.HTMLAttributes<HTMLElement> & {
    as?: React.ElementType
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    tone?: 'default' | 'hero' | 'muted' | 'success' | 'danger' | 'warning'
    width?: 'fluid' | 'content' | 'measure'
}

function CardRoot({
    as: Component = 'section',
    className,
    padding = 'lg',
    gap = 'md',
    tone = 'default',
    width = 'fluid',
    ...props
}: CardProps) {
    const classes = cn(
        styles.card,
        styles[`padding${padding[0].toUpperCase()}${padding.slice(1)}`],
        styles[`gap${gap[0].toUpperCase()}${gap.slice(1)}`],
        styles[`tone${tone[0].toUpperCase()}${tone.slice(1)}`],
        styles[`width${width[0].toUpperCase()}${width.slice(1)}`],
        className,
    )

    return <Component className={classes} {...props} />
}

export const Card = Object.assign(CardRoot, {
    Header: CardHeader,
    Title: CardTitle,
    Description: CardDescription,
    Content: CardContent,
    Footer: CardFooter,
})
