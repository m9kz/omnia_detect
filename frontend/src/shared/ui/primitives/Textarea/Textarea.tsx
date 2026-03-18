import React from 'react'
import styles from './Textarea.module.css'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        const classes = [styles.textarea, className].filter(Boolean).join(' ')

        return <textarea ref={ref} className={classes} {...props} />
    },
)

Textarea.displayName = 'Textarea'
