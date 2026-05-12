import { protectedHttp } from '@/shared/lib/api/client'

function stripApiBasePath(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const apiPath = normalizedPath.replace(/^\/api(?=\/|$)/, '')

    return apiPath || '/'
}

function toApiPath(url: string) {
    let path = url

    if (url.startsWith('/')) {
        return stripApiBasePath(url)
    }

    try {
        const parsed = new URL(url)
        path = `${parsed.pathname}${parsed.search}`
    } catch {
        path = url
    }

    return stripApiBasePath(path)
}

function extractFileName(contentDisposition: string | undefined) {
    if (!contentDisposition) {
        return null
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1])
    }

    const basicMatch = /filename="?([^"]+)"?/i.exec(contentDisposition)
    return basicMatch?.[1] ?? null
}

async function fetchProtectedBlob(url: string) {
    const response = await protectedHttp.get<Blob>(toApiPath(url), {
        responseType: 'blob',
    })

    return {
        blob: response.data,
        fileName: extractFileName(response.headers['content-disposition']),
    }
}

function clickObjectUrl(url: string, attributes: Partial<HTMLAnchorElement>) {
    const anchor = document.createElement('a')
    anchor.href = url
    Object.assign(anchor, attributes)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
}

export async function downloadProtectedFile(url: string, fallbackFileName?: string) {
    const { blob, fileName } = await fetchProtectedBlob(url)
    const objectUrl = URL.createObjectURL(blob)

    try {
        clickObjectUrl(objectUrl, {
            download: fileName ?? fallbackFileName ?? 'download',
        })
    } finally {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    }
}

export async function openProtectedFile(url: string) {
    const { blob } = await fetchProtectedBlob(url)
    const objectUrl = URL.createObjectURL(blob)

    clickObjectUrl(objectUrl, {
        rel: 'noreferrer noopener',
        target: '_blank',
    })

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export async function createProtectedObjectUrl(url: string) {
    const { blob } = await fetchProtectedBlob(url)
    return URL.createObjectURL(blob)
}
