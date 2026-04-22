import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logoutRequest } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/model/useAuthStore'

export function useLogout() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: logoutRequest,
        onSettled: () => {
            useAuthStore.getState().clearSession()
            queryClient.removeQueries({ queryKey: ['auth'] })
        },
    })
}
