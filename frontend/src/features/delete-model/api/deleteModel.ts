import { apiClient } from '@/shared/lib/api/client'

export async function deleteModel(modelId: string): Promise<void> {
    await apiClient.delete(`/model/${modelId}`)
}
