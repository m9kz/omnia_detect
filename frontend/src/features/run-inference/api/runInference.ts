import type { DetectResponse } from '@/entities/inference'
import { protectedHttp } from '@/shared/lib/api/client'

export async function runInference(imageId: string): Promise<DetectResponse> {
    const { data } = await protectedHttp.post<DetectResponse>(`/images/${imageId}/detect`, null, {
        headers: { 'Content-Type': 'application/json' },
    })

    return data
}
