import { publicHttp } from '@/shared/lib/api/client'
import type { AuthSession, LoginCredentials, RegisterCredentials } from '@/features/auth/types'

export async function loginRequest(credentials: LoginCredentials): Promise<AuthSession> {
    const { data } = await publicHttp.post<AuthSession>('/auth/login', credentials)
    return data
}

export async function registerRequest(credentials: RegisterCredentials): Promise<AuthSession> {
    const { data } = await publicHttp.post<AuthSession>('/auth/register', credentials)
    return data
}

export async function logoutRequest(): Promise<void> {
    await publicHttp.post('/auth/logout')
}

export async function fetchToken(): Promise<AuthSession> {
    const { data } = await publicHttp.post<AuthSession>('/auth/token')
    return data
}
