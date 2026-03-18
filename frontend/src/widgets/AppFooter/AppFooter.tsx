import { Text } from '@/shared/ui/primitives/Text'
import styles from './AppFooter.module.css'

export function AppFooter() {
    return (
        <footer className={styles.footer}>
            <Text as="span" size="sm" weight="semibold">
                omnia_detect
            </Text>
            <Text as="span" size="sm" tone="muted">
                dataset packaging, model training, runtime inference
            </Text>
        </footer>
    )
}
