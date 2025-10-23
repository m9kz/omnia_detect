import type { LabeledImage, PixelBBox, YoloBBox } from '../types/app'

/**
 * Converts a pixel-based bounding box to the YOLO format.
 */
export function convertPixelToYolo(
    bbox: PixelBBox,
    imageWidth: number,
    imageHeight: number,
    classMap: Map<string, number>,
): YoloBBox | null {
    const classIndex = classMap.get(bbox.className)
    if (classIndex === undefined) {
        console.error(`Unknown class name: ${bbox.className}`)
        return null
    }

    const x_center = (bbox.x + bbox.width / 2) / imageWidth
    const y_center = (bbox.y + bbox.height / 2) / imageHeight
    const width = bbox.width / imageWidth
    const height = bbox.height / imageHeight

    return { classIndex, x_center, y_center, width, height }
}

/**
 * Generates the .txt label file content for a single image.
 */
export function generateLabelFileContent(
    labeledImage: LabeledImage,
    classMap: Map<string, number>,
): string {
    const { imageElement, bboxes } = labeledImage
    const { naturalWidth, naturalHeight } = imageElement

    const yoloLines = bboxes
        .map((bbox) => {
            const yoloBox = convertPixelToYolo(
                bbox,
                naturalWidth,
                naturalHeight,
                classMap,
            )
            if (!yoloBox) return null

            return `${yoloBox.classIndex} ${yoloBox.x_center} ${yoloBox.y_center} ${yoloBox.width} ${yoloBox.height}`
        })
        .filter(Boolean) // Filter out any nulls from failed conversions

    return yoloLines.join('\n')
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