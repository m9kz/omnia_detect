import type { DatasetDetailSchema, DatasetItemSchema } from '@/entities/dataset/types'
import { protectedHttp } from '@/shared/lib/api/client'

export async function listDatasets(): Promise<DatasetItemSchema[]> {
    const { data } = await protectedHttp.get<DatasetItemSchema[]>('/dataset')
    return data
}

export async function getDataset(datasetId: string): Promise<DatasetDetailSchema> {
    const { data } = await protectedHttp.get<DatasetDetailSchema>(`/dataset/${datasetId}`)
    return data
}
