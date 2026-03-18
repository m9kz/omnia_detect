import React from 'react'
import styles from './Workspace.module.css'

type WorkspaceSidebarProps = React.HTMLAttributes<HTMLElement>

export function WorkspaceSidebar({
    className,
    ...props
}: WorkspaceSidebarProps) {
    const classes = [styles.sidebar, className].filter(Boolean).join(' ')

    return <aside className={classes} {...props} />
}
