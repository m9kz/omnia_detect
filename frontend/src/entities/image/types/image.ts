export interface ImageEntity {
    id: string
    file: File
    imageUrl: string
    imageElement: HTMLImageElement
}

export interface ServerImage {
    imageId: string
    url: string
    width: number
    height: number
    filename: string
}

export interface UploadResponse {
    image_id: string
    url: string
    width: number
    height: number
    filename: string
}

export type UploadState = {
    status: 'idle' | 'uploading' | 'uploaded' | 'error'
    error?: string | null
    server?: ServerImage
}
