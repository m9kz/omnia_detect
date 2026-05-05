import React from 'react'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './Workspace.module.css'

type WorkspaceMainProps = React.HTMLAttributes<HTMLElement> & {
    title: string
    description?: React.ReactNode
    align?: 'center' | 'stretch'
}

export function WorkspaceMain({
    title,
    description,
    align = 'center',
    className,
    children,
    ...props
}: WorkspaceMainProps) {
    const classes = [
        styles.main,
        styles[`mainAlign${align[0].toUpperCase()}${align.slice(1)}`],
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <main className={classes} {...props}>
            <div className={styles.mainHeader}>
                <Heading as="h2" size="lg">
                    {title}
                </Heading>
                {description ? (
                    <Text as="p" size="md" tone="muted">
                        {description}
                    </Text>
                ) : null}
            </div>
            {children}
        </main>
    )
}
