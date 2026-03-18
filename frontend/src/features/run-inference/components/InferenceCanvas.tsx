import type { PixelBBox } from '@/entities/annotation'
import { BaseCanvas } from '@/features/edit-annotation/components/BaseCanvas'

type InferenceCanvasProps = {
    imageElement: HTMLImageElement
    bboxes: PixelBBox[]
    containerWidth?: number
}

export function InferenceCanvas({
    imageElement,
    bboxes,
    containerWidth,
}: InferenceCanvasProps) {
    return (
        <BaseCanvas
            imageElement={imageElement}
            bboxes={bboxes}
            containerWidth={containerWidth}
            rectDraggable={false}
        />
    )
}
