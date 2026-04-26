import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerRequest } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/model/useAuthStore'
import type { RegisterCredentials } from '@/features/auth/types'

export function useRegister() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (credentials: RegisterCredentials) => registerRequest(credentials),
        onSuccess: (session) => {
            useAuthStore.getState().setSession(session)
            queryClient.setQueryData(['auth', 'session'], session)
        },
    })
}
