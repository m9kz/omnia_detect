import { Outlet } from 'react-router-dom'
import { AppShell } from '@/widgets/AppShell'

export function App() {
    return (
        <AppShell>
            <Outlet />
        </AppShell>
    )
}
