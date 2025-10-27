// From your provided backend schemas
export interface DatasetItemSchema {
    id: string // UUID is a string in JSON
    class_names: string[]
    ratio: number
    num_pairs: number
    train_count: number
    val_count: number
    created_at: string // datetime is a string in JSON
    download_url: string
}

export interface UploadResponse {
    image_id: string
    url: string
    width: number
    height: number
    filename: string
}

export interface BBoxSchema {
    x: number; // [0,1] left
    y: number; // [0,1] top
    w: number; // [0,1] width
    h: number; // [0,1] height
}

export interface DetectionItemSchema {
    class_name: string;
    confidence: number;
    bbox: BBoxSchema;
}

export interface DetectResponse {
    image_id: string;
    detections: DetectionItemSchema[];
}