import React from 'react'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './Field.module.css'

type FieldDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
    return (
        <Text
            as="p"
            size="sm"
            tone="muted"
            className={[styles.description, className].filter(Boolean).join(' ')}
            {...props}
        />
    )
}
