import type { PixelBBox } from '@/entities/annotation'

export interface BBoxSchema {
    x: number
    y: number
    w: number
    h: number
}

export interface DetectionItemSchema {
    class_name: string
    confidence: number
    bbox: BBoxSchema
}

export interface DetectResponse {
    image_id: string
    detections: DetectionItemSchema[]
}

export type InferenceState = {
    status: 'idle' | 'running' | 'done' | 'error'
    error?: string | null
    detections?: DetectionItemSchema[]
    detectionsPx: PixelBBox[]
}
