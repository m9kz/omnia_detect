import type { ReactNode } from 'react'
import { AppFooter } from '@/widgets/AppFooter'
import { AppHeader } from '@/widgets/AppHeader'
import { StorageUsage } from '@/widgets/StorageUsage'
import styles from './AppShell.module.css'

type AppShellProps = {
    children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className={styles.shell}>
            <AppHeader />
            <StorageUsage />
            <div className={styles.content}>{children}</div>
            <AppFooter />
        </div>
    )
}
