import { Link, NavLink } from 'react-router-dom'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './AppHeader.module.css'

const navItems = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/datasets', label: 'Datasets', end: true },
    { to: '/models', label: 'Models', end: true },
    { to: '/datasets/new', label: 'Builder', end: true },
    { to: '/inference', label: 'Inference', end: true },
]

export function AppHeader() {
    return (
        <header className={styles.header}>
            <Link to="/" className={styles.brand}>
                <span className={styles.brandMark}>OD</span>
                <span className={styles.brandText}>
                    <Heading as="strong" size="xs" family="primary" weight="bold">
                        omnia_detect
                    </Heading>
                    <Text as="span" size="xs" tone="muted">
                        dataset, training, inference
                    </Text>
                </span>
            </Link>

            <nav className={styles.nav} aria-label="Primary">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            [styles.navLink, isActive ? styles.navLinkActive : '']
                                .filter(Boolean)
                                .join(' ')
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </header>
    )
}
