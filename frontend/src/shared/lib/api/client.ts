import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { ROUTES } from '@/app/routes'
import { useAuthStore } from '@/features/auth/model/useAuthStore'
import type { AuthSession } from '@/features/auth/types'

const baseConfig = {
    baseURL: '/api',
    withCredentials: true,
}

function createUnauthorizedError() {
    return Object.assign(new Error('Access token is missing'), { status: 401 })
}

export const publicHttp = axios.create(baseConfig)
export const protectedHttp = axios.create(baseConfig)

let refreshSessionPromise: Promise<AuthSession> | null = null

async function refreshSession() {
    if (!refreshSessionPromise) {
        refreshSessionPromise = publicHttp
            .post<AuthSession>('/auth/token')
            .then(({ data }) => {
                useAuthStore.getState().setSession(data)
                return data
            })
            .finally(() => {
                refreshSessionPromise = null
            })
    }

    return refreshSessionPromise
}

type RetriableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean
}

protectedHttp.interceptors.request.use(async (config) => {
    let token = useAuthStore.getState().accessToken

    if (!token) {
        try {
            const session = await refreshSession()
            token = session.accessToken
        } catch {
            useAuthStore.getState().clearSession()
            return Promise.reject(createUnauthorizedError())
        }
    }

    if (!token) {
        return Promise.reject(createUnauthorizedError())
    }    

    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers

    return config
})

protectedHttp.interceptors.response.use(
    (response) => response,
    async (error) => {
        const requestConfig = error.config as RetriableRequestConfig | undefined

        if (
            error.response?.status === 401 &&
            requestConfig &&
            !requestConfig._retry
        ) {
            requestConfig._retry = true

            try {
                const session = await refreshSession()
                const headers = AxiosHeaders.from(requestConfig.headers)
                headers.set('Authorization', `Bearer ${session.accessToken}`)
                requestConfig.headers = headers

                return protectedHttp(requestConfig)
            } catch {
                useAuthStore.getState().clearSession()
            }
        }

        if (error.response?.status === 401) {
            useAuthStore.getState().clearSession()

            if (
                typeof window !== 'undefined' &&
                window.location.pathname !== ROUTES.LOGIN
            ) {
                window.location.assign(ROUTES.LOGIN)
            }
        }

        return Promise.reject(error)
    },
)
