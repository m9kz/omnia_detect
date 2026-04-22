import type { ActivateModelResponseSchema } from '@/entities/model'
import { protectedHttp } from '@/shared/lib/api/client'

export async function activateModel(
    modelId: string,
): Promise<ActivateModelResponseSchema> {
    const { data } = await protectedHttp.post<ActivateModelResponseSchema>(
        `/model/${modelId}/activate`,
    )

    return data
}
