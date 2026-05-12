import type { PixelBBox, YoloBBox } from '@/entities/annotation'
import type { DetectionItemSchema } from '@/entities/inference'

export function pixelToYolo(
    bbox: PixelBBox,
    width: number,
    height: number,
    classMap: Map<string, number>,
): YoloBBox | null {
    const classIndex = classMap.get(bbox.className)

    if (classIndex == null || width <= 0 || height <= 0) {
        return null
    }

    return {
        classIndex,
        x_center: (bbox.x + bbox.width / 2) / width,
        y_center: (bbox.y + bbox.height / 2) / height,
        width: bbox.width / width,
        height: bbox.height / height,
    }
}

export function yoloToLabelText(boxes: YoloBBox[]) {
    return boxes
        .map(
            (bbox) =>
                `${bbox.classIndex} ${bbox.x_center} ${bbox.y_center} ${bbox.width} ${bbox.height}`,
        )
        .join('\n')
}

export function labelNameFor(filename: string) {
    return filename.replace(/\.[^.]+$/, '.txt')
}

export function detectionsToPixelBBoxes(
    detections: DetectionItemSchema[],
    width: number,
    height: number,
): PixelBBox[] {
    return detections.map((detection, index) => ({
        id: `${detection.class_name}-${index}`,
        className: detection.class_name,
        x: detection.bbox.x * width,
        y: detection.bbox.y * height,
        width: detection.bbox.w * width,
        height: detection.bbox.h * height,
    }))
}
