import React from 'react'
import styles from './Field.module.css'
import { FieldControl } from './FieldControl'
import { FieldDescription } from './FieldDescription'
import { FieldLabel } from './FieldLabel'
import { FieldMessage } from './FieldMessage'

type FieldProps = React.HTMLAttributes<HTMLDivElement>

function FieldRoot({ className, ...props }: FieldProps) {
    const classes = [styles.field, className].filter(Boolean).join(' ')

    return <div className={classes} {...props} />
}

export const Field = Object.assign(FieldRoot, {
    Label: FieldLabel,
    Description: FieldDescription,
    Control: FieldControl,
    Message: FieldMessage,
})
