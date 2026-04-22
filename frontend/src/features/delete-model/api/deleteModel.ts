import { protectedHttp } from '@/shared/lib/api/client'

export async function deleteModel(modelId: string): Promise<void> {
    await protectedHttp.delete(`/model/${modelId}`)
}
