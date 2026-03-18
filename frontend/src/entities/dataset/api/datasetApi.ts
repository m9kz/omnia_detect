import type { DatasetDetailSchema, DatasetItemSchema } from '@/entities/dataset/types'
import { apiClient } from '@/shared/lib/api/client'

export async function listDatasets(): Promise<DatasetItemSchema[]> {
    const { data } = await apiClient.get<DatasetItemSchema[]>('/dataset')
    return data
}

export async function getDataset(datasetId: string): Promise<DatasetDetailSchema> {
    const { data } = await apiClient.get<DatasetDetailSchema>(`/dataset/${datasetId}`)
    return data
}
