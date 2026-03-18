import type { ModelItemSchema } from '@/entities/model'
import { apiClient } from '@/shared/lib/api/client'

type TrainByDatasetArgs = {
    datasetId: string
    epochs: number
    imgsz: number
}

export async function trainByDataset({
    datasetId,
    epochs,
    imgsz,
}: TrainByDatasetArgs): Promise<ModelItemSchema> {
    const formData = new FormData()
    formData.append('dataset_id', datasetId)
    formData.append('epochs', String(epochs))
    formData.append('imgsz', String(imgsz))

    const { data } = await apiClient.post<ModelItemSchema>('/train/by-dataset', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })

    return data
}
