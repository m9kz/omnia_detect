import React from 'react'
import { type PixelBBox } from '../shared/types/app'
import { BaseCanvas } from './base_canvas'

interface Props {
    imageElement: HTMLImageElement
    bboxes: PixelBBox[]
    containerWidth?: number
}

export const InferenceCanvas: React.FC<Props> = ({ imageElement, bboxes, containerWidth }) => {
  return (
    <BaseCanvas
        imageElement={imageElement}
        bboxes={bboxes}
        containerWidth={containerWidth}
        rectDraggable={false}
    />
  )
}
