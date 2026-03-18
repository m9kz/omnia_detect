export interface ModelItemSchema {
    id: string
    dataset_id: string
    best_weights_path: string
    epochs: number
    imgsz: number
    created_at: string
    metrics_path: string | null
}

export interface ModelDetailSchema extends ModelItemSchema {
    is_active: boolean
    download_weights_url: string
    artifact_urls: Record<string, string>
    preview_urls: Record<string, string>
}

export interface CurrentModelSchema {
    version: string
    model_id: string | null
    weights_path: string | null
    yolo_impl_id: number
}

export interface ActivateModelResponseSchema {
    model: ModelItemSchema
    runtime: CurrentModelSchema
}
