import type { ImageEntity, UploadResponse } from '@/entities/image'
import { apiClient } from '@/shared/lib/api/client'

export async function uploadImage(image: ImageEntity): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', image.file, image.file.name)

    const { data } = await apiClient.post<UploadResponse>('/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })

    return data
}
