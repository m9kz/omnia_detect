import React from 'react'
import styles from './Field.module.css'

type FieldControlProps = React.HTMLAttributes<HTMLDivElement>

export function FieldControl({ className, ...props }: FieldControlProps) {
    const classes = [styles.control, className].filter(Boolean).join(' ')

    return <div className={classes} {...props} />
}
