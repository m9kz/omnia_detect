import React from 'react'
import styles from './Workspace.module.css'
import { WorkspaceMain } from './WorkspaceMain'
import { WorkspaceSidebar } from './WorkspaceSidebar'

type WorkspaceProps = React.HTMLAttributes<HTMLDivElement>

function WorkspaceRoot({ className, ...props }: WorkspaceProps) {
    const classes = [styles.root, className].filter(Boolean).join(' ')

    return <div className={classes} {...props} />
}

export const Workspace = Object.assign(WorkspaceRoot, {
    Sidebar: WorkspaceSidebar,
    Main: WorkspaceMain,
})
