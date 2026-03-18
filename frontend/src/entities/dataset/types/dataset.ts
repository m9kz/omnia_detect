export interface DatasetItemSchema {
    id: string
    class_names: string[]
    ratio: number
    num_pairs: number
    train_count: number
    val_count: number
    created_at: string
    download_url: string
}

export interface DatasetDetailSchema extends DatasetItemSchema {
    zip_relpath: string
    zip_exists: boolean
}
