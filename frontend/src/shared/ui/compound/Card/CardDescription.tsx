import React from 'react'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './Card.module.css'

type CardDescriptionProps = React.ComponentProps<typeof Text>

export function CardDescription({
    as = 'p',
    className,
    size = 'sm',
    tone = 'muted',
    ...props
}: CardDescriptionProps) {
    return (
        <Text
            as={as}
            size={size}
            tone={tone}
            className={[styles.description, className].filter(Boolean).join(' ')}
            {...props}
        />
    )
}
