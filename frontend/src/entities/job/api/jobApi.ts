import type { TrainJobItemSchema } from '@/entities/job/types'
import { protectedHttp } from '@/shared/lib/api/client'

type CreateTrainJobArgs = {
    datasetId: string
    epochs: number
    imgsz: number
    modelName?: string
}

export async function createTrainJob({
    datasetId,
    epochs,
    imgsz,
    modelName,
}: CreateTrainJobArgs): Promise<TrainJobItemSchema> {
    const { data } = await protectedHttp.post<TrainJobItemSchema>('/jobs/train', {
        dataset_id: datasetId,
        epochs,
        imgsz,
        model_name: modelName?.trim() || undefined,
    })
    return data
}

export async function listTrainJobs(): Promise<TrainJobItemSchema[]> {
    const { data } = await protectedHttp.get<TrainJobItemSchema[]>('/jobs')
    return data
}

export async function getTrainJob(jobId: string): Promise<TrainJobItemSchema> {
    const { data } = await protectedHttp.get<TrainJobItemSchema>(`/jobs/${jobId}`)
    return data
}
