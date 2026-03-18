import React from 'react'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './Field.module.css'

type FieldMessageProps = React.HTMLAttributes<HTMLParagraphElement> & {
    tone?: 'default' | 'error' | 'success'
}

export function FieldMessage({
    className,
    tone = 'default',
    ...props
}: FieldMessageProps) {
    const classes = [styles.message, styles[tone], className].filter(Boolean).join(' ')

    return <Text as="p" size="sm" className={classes} {...props} />
}
