import { protectedHttp } from '@/shared/lib/api/client'

export async function deleteDataset(datasetId: string): Promise<void> {
    await protectedHttp.delete(`/dataset/${datasetId}`)
}
