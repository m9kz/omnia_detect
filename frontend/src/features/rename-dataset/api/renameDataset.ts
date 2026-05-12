import type { DatasetDetailSchema } from '@/entities/dataset'
import { protectedHttp } from '@/shared/lib/api/client'

export async function renameDataset(
    datasetId: string,
    name: string,
): Promise<DatasetDetailSchema> {
    const { data } = await protectedHttp.patch<DatasetDetailSchema>(
        `/dataset/${datasetId}`,
        { name },
    )

    return data
}
