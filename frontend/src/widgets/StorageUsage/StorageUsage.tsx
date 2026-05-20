import { useEffect, useMemo, useState } from 'react'

import { getStorageUsage } from '@/entities/storage'
import type { StorageUsageSchema } from '@/entities/storage'
import { formatBytes } from '@/shared/lib/formatBytes'
import { Badge } from '@/shared/ui/primitives/Badge'
import styles from './StorageUsage.module.css'
import { Text } from '@/shared/ui/primitives/Text'
import { Container } from '@/shared/ui/primitives/Container'

export function StorageUsage() {
    const [usage, setUsage] = useState<StorageUsageSchema | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        let isActive = true

        async function loadStorageUsage() {
            try {
                const nextUsage = await getStorageUsage()
                if (!isActive) {
                    return
                }

                setUsage(nextUsage)
                setHasError(false)
            } catch {
                if (isActive) {
                    setHasError(true)
                }
            } finally {
                if (isActive) {
                    setIsLoading(false)
                }
            }
        }

        void loadStorageUsage()

        return () => {
            isActive = false
        }
    }, [])

    const percentUsed = useMemo(() => {
        if (!usage || usage.quota_bytes <= 0) {
            return 0
        }

        return Math.min(100, Math.round((usage.used_bytes / usage.quota_bytes) * 100))
    }, [usage])

    if (isLoading) {
        return (
            <section className={styles.root} aria-label="Сховище користувача">
                <span className={styles.title}>Сховище оновлюється</span>
            </section>
        )
    }

    if (hasError || !usage) {
        return (
            <section className={styles.root} aria-label="Сховище користувача">
                <span className={styles.title}>Сховище</span>
                <Badge color="danger" variant="soft">
                    Не вдалося завантажити
                </Badge>
            </section>
        )
    }

    return (
        <section className={styles.root} aria-label="Сховище користувача">
            <Container display='flex' justify='between' align='center'>
                <Text weight='bold' tone='muted'>
                    Сховище
                </Text>
                
                <Text weight='bold' tone='muted'>
                    {formatBytes(usage.used_bytes)} з {formatBytes(usage.quota_bytes)}
                </Text>
            </Container>
            <div
                className={styles.progress}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentUsed}
            >
                <span style={{ width: `${percentUsed}%` }} />
            </div>
            {/* <div className={styles.meta}>
                <Badge variant="soft" color="neutral">
                    Датасети {formatBytes(usage.dataset_bytes)}
                </Badge>
                <Badge variant="soft" color="neutral">
                    Моделі {formatBytes(usage.model_bytes)}
                </Badge>
                <Badge variant="soft" color="neutral">
                    Вільно {formatBytes(usage.remaining_bytes)}
                </Badge>
            </div> */}
        </section>
    )
}
