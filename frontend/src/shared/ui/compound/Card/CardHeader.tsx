import React from 'react'
import styles from './Card.module.css'

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>

export function CardHeader({ className, ...props }: CardHeaderProps) {
    const classes = [styles.header, className].filter(Boolean).join(' ')

    return <div className={classes} {...props} />
}
