import React from 'react'
import styles from './Card.module.css'

type CardContentProps = React.HTMLAttributes<HTMLDivElement>

export function CardContent({ className, ...props }: CardContentProps) {
    const classes = [styles.content, className].filter(Boolean).join(' ')

    return <div className={classes} {...props} />
}
