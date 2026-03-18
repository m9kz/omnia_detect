import React from 'react'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './Field.module.css'

type FieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export function FieldLabel({ className, ...props }: FieldLabelProps) {
    return (
        <Text
            as="label"
            size="xs"
            weight="bold"
            className={[styles.label, className].filter(Boolean).join(' ')}
            {...props}
        />
    )
}
