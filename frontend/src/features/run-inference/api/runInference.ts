import type { DetectResponse } from '@/entities/inference'
import { apiClient } from '@/shared/lib/api/client'

export async function runInference(imageId: string): Promise<DetectResponse> {
    const { data } = await apiClient.post<DetectResponse>(`/images/${imageId}/detect`, null, {
        headers: { 'Content-Type': 'application/json' },
    })

    return data
}
