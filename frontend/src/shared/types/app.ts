import { v4 as uuidv4 } from 'uuid'

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

/**
 * Represents a single image being labeled.
 */
export interface LabeledImage {
  id: string
  file: File
  imageUrl: string // For <img /> src and Konva.Image
  imageElement: HTMLImageElement // To get naturalWidth/Height
  bboxes: PixelBBox[]
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

// Helper to create a new, empty LabeledImage from a File
export function createLabeledImage(
  file: File,
  imageElement: HTMLImageElement,
): LabeledImage {
  return {
    id: uuidv4(),
    file,
    imageUrl: URL.createObjectURL(file),
    imageElement,
    bboxes: [],
  }
}