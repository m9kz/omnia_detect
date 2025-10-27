import type { PixelBBox, YoloBBox } from '../types/app'
import type { DetectionItemSchema } from '../types/schemas'

import { v4 as uuidv4 } from 'uuid';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const fmt = (v: number) => clamp01(v).toFixed(6)

export const labelNameFor = (imageFilename: string) => {
    const dot = imageFilename.lastIndexOf('.')
    return (dot === -1 ? imageFilename : imageFilename.slice(0, dot)) + '.txt'
}

/**
 * Converts a pixel-based bounding box to the YOLO format.
 */
export function pixelToYolo(
    bbox: PixelBBox,
    imageWidth: number,
    imageHeight: number,
    classMap: Map<string, number>,
): YoloBBox | null {
    if (!(imageWidth > 0) || !(imageHeight > 0)) return null
    const classIndex = classMap.get(bbox.className)
    if (classIndex == null) return null

    const x_center = clamp01((bbox.x + bbox.width / 2) / imageWidth)
    const y_center = clamp01((bbox.y + bbox.height / 2) / imageHeight)
    const width = clamp01(bbox.width / imageWidth)
    const height = clamp01(bbox.height / imageHeight)

    return { classIndex, x_center, y_center, width, height }
}

export function yoloToPixel(
    y: YoloBBox,
    imgW: number,
    imgH: number,
    className: string,
): PixelBBox | null {
    if (!(imgW > 0) || !(imgH > 0)) return null
    const wPx = y.width * imgW
    const hPx = y.height * imgH
    const xPx = y.x_center * imgW - wPx / 2
    const yPx = y.y_center * imgH - hPx / 2

    return {
        id: uuidv4(),
        className,
        x: Math.round(xPx),
        y: Math.round(yPx),
        width: Math.round(wPx),
        height: Math.round(hPx),
    }
}

/**
 * Detector → Pixels.
 * If your backend returns bbox as top-left normalized (x,y,w,h), set bboxFormat='topleft'.
 * If it returns YOLO center-based, set bboxFormat='center'.
 */
export function detectionsToPixelBBoxes(
    dets: DetectionItemSchema[],
    imgW: number,
    imgH: number,
    bboxFormat: 'topleft' | 'center' = 'topleft',
): PixelBBox[] {
    return dets.map((d) => {
        const { x, y, w, h } = d.bbox

        if (bboxFormat === 'center') {
            const wPx = w * imgW
            const hPx = h * imgH
            const xPx = x * imgW - wPx / 2
            const yPx = y * imgH - hPx / 2
            
            return {
                id: uuidv4(),
                className: d.class_name,
                x: Math.round(xPx),
                y: Math.round(yPx),
                width: Math.round(wPx),
                height: Math.round(hPx),
            }
        }

        return {
            id: uuidv4(),
            className: d.class_name,
            x: Math.round(x * imgW),
            y: Math.round(y * imgH),
            width: Math.round(w * imgW),
            height: Math.round(h * imgH),
        }
    })
}

/** Format YOLO objects to label-file text (space-separated, clamped, fixed decimals). */
export function yoloToLabelText(yolos: YoloBBox[]): string {
    return yolos
        .map(
            (b) =>
                `${b.classIndex} ${fmt(b.x_center)} ${fmt(b.y_center)} ${fmt(b.width)} ${fmt(b.height,)}`,
        )
        .join('\n')
}

/**
 * Gets the corresponding .txt filename for an image file.
 * e.g., "my_image.jpg" -> "my_image.txt"
 */
export function getLabelFilename(imageFilename: string): string {
    const stem = imageFilename.lastIndexOf('.')
    if (stem === -1) {
        return `${imageFilename}.txt`
    }
    return `${imageFilename.substring(0, stem)}.txt`
}