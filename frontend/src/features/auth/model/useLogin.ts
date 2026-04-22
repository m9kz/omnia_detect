import { useMutation, useQueryClient } from '@tanstack/react-query'
import { loginRequest } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/model/useAuthStore'
import type { LoginCredentials } from '@/features/auth/types'

export function useLogin() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => loginRequest(credentials),
        onSuccess: (session) => {
            useAuthStore.getState().setSession(session)
            queryClient.setQueryData(['auth', 'session'], session)
        },
    })
}
