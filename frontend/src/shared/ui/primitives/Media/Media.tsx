import React from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Media.module.css'

type MediaProps = React.ImgHTMLAttributes<HTMLImageElement> & {
    radius?: 'sm' | 'md' | 'lg'
    fit?: 'contain' | 'cover'
    bordered?: boolean
    fluid?: boolean
}

export function Media({
    className,
    radius = 'md',
    fit = 'cover',
    bordered = true,
    fluid = true,
    ...props
}: MediaProps) {
    return (
        <img
            className={cn(
                styles.media,
                styles[`radius${radius[0].toUpperCase()}${radius.slice(1)}`],
                styles[`fit${fit[0].toUpperCase()}${fit.slice(1)}`],
                bordered && styles.bordered,
                fluid && styles.fluid,
                className,
            )}
            {...props}
        />
    )
}
