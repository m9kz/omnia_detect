import type { ModelDetailSchema } from '@/entities/model'
import { protectedHttp } from '@/shared/lib/api/client'

export async function renameModel(
    modelId: string,
    name: string,
): Promise<ModelDetailSchema> {
    const { data } = await protectedHttp.patch<ModelDetailSchema>(
        `/model/${modelId}`,
        { name },
    )

    return data
}
