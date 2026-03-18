import { apiClient } from '@/shared/lib/api/client'

export async function deleteDataset(datasetId: string): Promise<void> {
    await apiClient.delete(`/dataset/${datasetId}`)
}
