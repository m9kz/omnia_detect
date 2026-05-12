import { isAxiosError } from 'axios'

type ApiValidationItem = {
    msg?: string
}

type ApiErrorPayload = {
    detail?: string | ApiValidationItem[]
    message?: string
}

function extractApiErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
        return null
    }

    const data = payload as ApiErrorPayload

    if (typeof data.detail === 'string' && data.detail.trim().length > 0) {
        return data.detail
    }

    if (Array.isArray(data.detail)) {
        const messages = data.detail
            .map((item) => item?.msg?.trim())
            .filter((value): value is string => Boolean(value))

        if (messages.length > 0) {
            return messages.join('; ')
        }
    }

    if (typeof data.message === 'string' && data.message.trim().length > 0) {
        return data.message
    }

    return null
}

export function getErrorMessage(error: unknown, fallback = 'Щось пішло не так') {
    if (isAxiosError(error)) {
        const apiMessage = extractApiErrorMessage(error.response?.data)
        if (apiMessage) {
            return apiMessage
        }

        if (error.message) {
            return error.message
        }
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (typeof error === 'string' && error.trim().length > 0) {
        return error
    }

    return fallback
}
