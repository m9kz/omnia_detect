import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useLogout, useAuthStore } from '@/features/auth'
import { Button } from '@/shared/ui/primitives/Button'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './AppHeader.module.css'

const navItems = [
    { to: ROUTES.DASHBOARD, label: 'Dashboard', end: true },
    { to: ROUTES.DATASETS, label: 'Datasets', end: true },
    { to: ROUTES.JOBS, label: 'Jobs', end: true },
    { to: ROUTES.MODELS, label: 'Models', end: true },
    { to: ROUTES.DATASET_CREATE, label: 'Builder', end: true },
    { to: ROUTES.INFERENCE, label: 'Inference', end: true },
]

export function AppHeader() {
    const navigate = useNavigate()
    const logout = useLogout()
    const user = useAuthStore((state) => state.user)

    function handleLogout() {
        logout.mutate(undefined, {
            onSettled: () => {
                navigate(ROUTES.LOGIN, { replace: true })
            },
        })
    }

    return (
        <header className={styles.header}>
            <Link to={ROUTES.DASHBOARD} className={styles.brand}>
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

            <div className={styles.actions}>
                {user ? (
                    <Text as="span" size="sm" tone="muted" truncate className={styles.user}>
                        {user.name ?? user.login}
                    </Text>
                ) : null}
                <Button
                    variant="outline"
                    color="neutral"
                    size="sm"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                >
                    {logout.isPending ? 'Signing Out...' : 'Sign Out'}
                </Button>
            </div>
        </header>
    )
}
