import type { TrainJobItemSchema } from '@/entities/job/types'
import { apiClient } from '@/shared/lib/api/client'

type CreateTrainJobArgs = {
    datasetId: string
    epochs: number
    imgsz: number
}

export async function createTrainJob({
    datasetId,
    epochs,
    imgsz,
}: CreateTrainJobArgs): Promise<TrainJobItemSchema> {
    const { data } = await apiClient.post<TrainJobItemSchema>('/jobs/train', {
        dataset_id: datasetId,
        epochs,
        imgsz,
    })
    return data
}

export async function listTrainJobs(): Promise<TrainJobItemSchema[]> {
    const { data } = await apiClient.get<TrainJobItemSchema[]>('/jobs')
    return data
}

export async function getTrainJob(jobId: string): Promise<TrainJobItemSchema> {
    const { data } = await apiClient.get<TrainJobItemSchema>(`/jobs/${jobId}`)
    return data
}

