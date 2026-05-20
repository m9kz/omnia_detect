export interface DatasetItemSchema {
    id: string
    name: string
    class_names: string[]
    ratio: number
    num_pairs: number
    train_count: number
    val_count: number
    size_bytes: number
    created_at: string
    download_url: string
}

export interface DatasetDetailSchema extends DatasetItemSchema {
    zip_relpath: string
    zip_exists: boolean
}
