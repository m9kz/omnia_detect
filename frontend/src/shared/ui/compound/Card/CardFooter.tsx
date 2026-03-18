import React from 'react'
import styles from './Card.module.css'

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>

export function CardFooter({ className, ...props }: CardFooterProps) {
    const classes = [styles.footer, className].filter(Boolean).join(' ')

    return <div className={classes} {...props} />
}
