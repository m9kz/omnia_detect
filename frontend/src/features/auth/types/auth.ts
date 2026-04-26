export type LoginCredentials = {
    login: string
    password: string
}

export type RegisterCredentials = {
    login: string
    password: string
    name?: string
}

export type AuthUser = {
    id: string
    login: string
    name?: string | null
}

export type AuthSession = {
    accessToken: string
    user: AuthUser
}
