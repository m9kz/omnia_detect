export type TrainJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface TrainJobItemSchema {
    id: string
    dataset_id: string
    status: TrainJobStatus
    progress: number
    current_epoch: number | null
    total_epochs: number
    epochs: number
    imgsz: number
    base_weights: string
    base_model_id: string | null
    model_id: string | null
    message: string | null
    error: string | null
    created_at: string
    started_at: string | null
    finished_at: string | null
}

