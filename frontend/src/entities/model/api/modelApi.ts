import type {
    CurrentModelSchema,
    ModelDetailSchema,
    ModelItemSchema,
} from '@/entities/model/types'
import { apiClient } from '@/shared/lib/api/client'

export async function listModels(): Promise<ModelItemSchema[]> {
    const { data } = await apiClient.get<ModelItemSchema[]>('/model')
    return data
}

export async function getModelDetail(modelId: string): Promise<ModelDetailSchema> {
    const { data } = await apiClient.get<ModelDetailSchema>(`/model/${modelId}`)
    return data
}

export async function getCurrentModel(): Promise<CurrentModelSchema> {
    const { data } = await apiClient.get<CurrentModelSchema>('/model/current')
    return data
}
