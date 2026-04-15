import { Text } from '@/shared/ui/primitives/Text'
import styles from './AppFooter.module.css'

export function AppFooter() {
    return (
        <footer className={styles.footer}>
            <Text as="span" size="sm" weight="semibold" tone="muted">
                Luchkiv M.I. 
            </Text>
            <Text as="span" size="sm" tone="muted">
                2025-2026. All rights reserved.
            </Text>
        </footer>
    )
}
