import type { ActivateModelResponseSchema } from '@/entities/model'
import { apiClient } from '@/shared/lib/api/client'

export async function activateModel(
    modelId: string,
): Promise<ActivateModelResponseSchema> {
    const { data } = await apiClient.post<ActivateModelResponseSchema>(
        `/model/${modelId}/activate`,
    )

    return data
}
