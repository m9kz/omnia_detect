import { useQuery } from '@tanstack/react-query'
import { ensureSession } from '@/features/auth/lib/session'
import { useAuthStore } from '@/features/auth/model/useAuthStore'

export function useSession() {
    const accessToken = useAuthStore((state) => state.accessToken)
    const status = useAuthStore((state) => state.status)
    const user = useAuthStore((state) => state.user)

    const query = useQuery({
        queryKey: ['auth', 'session'],
        enabled: status === 'unknown',
        retry: false,
        staleTime: 5 * 60_000,
        queryFn: async () => {
            try {
                return await ensureSession()
            } catch (error) {
                useAuthStore.getState().clearSession()
                throw error
            }
        },
    })

    return {
        ...query,
        accessToken,
        isAuthenticated: status === 'authenticated' && Boolean(accessToken) && Boolean(user),
        status,
        user,
    }
}
