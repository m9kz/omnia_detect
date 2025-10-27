/**
 * Represents a bounding box in pixel coordinates (what Konva uses)
 */
export interface PixelBBox {
    id: string
    x: number
    y: number
    width: number
    height: number
    className: string
}

export interface ImageEntity {
    id: string
    file: File
    imageUrl: string
    imageElement: HTMLImageElement
}

export type Annotations = Record<string, PixelBBox[]>

export interface ServerImage {
    imageId: string
    url: string
    width: number
    height: number
    filename: string
}

export type UploadResponse = {
    image_id: string
    url: string
    width: number
    height: number
    filename: string
}

export type DetectResponse = {
    image_id: string
    detections: {
        class_name: string
        confidence: number
        bbox: { x: number; y: number; w: number; h: number }
    }[]
}

export type UploadState = {
    status: 'idle' | 'uploading' | 'uploaded' | 'error'
    error?: string | null
    server?: ServerImage
}

export interface Detection {
    class_name: string
    confidence: number
    bbox: { x: number; y: number; w: number; h: number } // normalized
}

export type InferenceState = {
    status: 'idle' | 'running' | 'done' | 'error'
    error?: string | null
    detections?: Detection[]
    detectionsPx: PixelBBox[]
}

export type DatasetExample = {
    filename: string
    width: number
    height: number
    boxes: { 
        className: string; 
        x: number; 
        y: number; 
        width: number; 
        height: number 
    }[]
}

export type DatasetPayload = {
    classes: string[]
    ratio: number
    examples: DatasetExample[]
}

/**
 * Represents a bounding box in YOLO format (normalized, center-based)
 */
export interface YoloBBox {
    classIndex: number
    x_center: number
    y_center: number
    width: number
    height: number
}