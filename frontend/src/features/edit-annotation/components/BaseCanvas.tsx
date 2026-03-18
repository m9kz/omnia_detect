import React, { useImperativeHandle, useMemo, useRef } from 'react'
import { Group, Image as KImage, Label, Layer, Rect, Stage, Tag, Text } from 'react-konva'
import Konva from 'konva'
import type { PixelBBox } from '@/entities/annotation'
import { getClassColor } from '@/shared/lib/classColors'
import styles from './BaseCanvas.module.css'

export type OverlayBox = {
    x: number
    y: number
    width: number
    height: number
    stroke?: string
    strokeWidth?: number
    dash?: number[]
}

export interface BaseCanvasHandle {
    getStage: () => Konva.Stage | null
}

type BaseCanvasProps = {
    imageElement: HTMLImageElement
    bboxes: PixelBBox[]
    containerWidth?: number
    rectDraggable?: boolean
    onRectDragEnd?: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void
    onRectTransformEnd?: (id: string, event: Konva.KonvaEventObject<Event>) => void
    onStageMouseDown?: (event: Konva.KonvaEventObject<MouseEvent>) => void
    onStageMouseMove?: (event: Konva.KonvaEventObject<MouseEvent>) => void
    onStageMouseUp?: (event: Konva.KonvaEventObject<MouseEvent>) => void
    overlayBox?: OverlayBox
    children?: React.ReactNode
}

export const BaseCanvas = React.forwardRef<BaseCanvasHandle, BaseCanvasProps>(
    (
        {
            imageElement,
            bboxes,
            containerWidth = 800,
            rectDraggable = false,
            onRectDragEnd,
            onRectTransformEnd,
            onStageMouseDown,
            onStageMouseMove,
            onStageMouseUp,
            overlayBox,
            children,
        },
        ref,
    ) => {
        const stageRef = useRef<Konva.Stage | null>(null)

        const { scale, stageWidth, stageHeight } = useMemo(() => {
            const scale = containerWidth / imageElement.naturalWidth

            return {
                scale,
                stageWidth: containerWidth,
                stageHeight: imageElement.naturalHeight * scale,
            }
        }, [containerWidth, imageElement])

        useImperativeHandle(ref, () => ({
            getStage: () => stageRef.current,
        }))

        return (
            <div className={styles.container} style={{ width: stageWidth, height: stageHeight }}>
                <Stage
                    ref={stageRef}
                    width={stageWidth}
                    height={stageHeight}
                    scaleX={scale}
                    scaleY={scale}
                    onMouseDown={onStageMouseDown}
                    onMouseMove={onStageMouseMove}
                    onMouseUp={onStageMouseUp}
                >
                    <Layer>
                        <KImage
                            image={imageElement}
                            width={imageElement.naturalWidth}
                            height={imageElement.naturalHeight}
                            name="image"
                        />

                        {bboxes.map((bbox) => {
                            const color = getClassColor(bbox.className)

                            return (
                                <Group key={bbox.id}>
                                    <Rect
                                        id={bbox.id}
                                        x={bbox.x}
                                        y={bbox.y}
                                        width={bbox.width}
                                        height={bbox.height}
                                        stroke={color}
                                        strokeWidth={2 / scale}
                                        strokeScaleEnabled={false}
                                        shadowForStrokeEnabled={false}
                                        draggable={rectDraggable}
                                        onDragEnd={
                                            onRectDragEnd
                                                ? (event) => onRectDragEnd(bbox.id, event)
                                                : undefined
                                        }
                                        onTransformEnd={
                                            onRectTransformEnd
                                                ? (event) => onRectTransformEnd(bbox.id, event)
                                                : undefined
                                        }
                                    />

                                    <Label x={bbox.x} y={Math.max(0, bbox.y - 20 / scale)} listening={false}>
                                        <Tag
                                            fill="rgba(0, 0, 0, 0.5)"
                                            stroke={color}
                                            strokeWidth={1 / scale}
                                            cornerRadius={4 / scale}
                                        />
                                        <Text
                                            text={bbox.className}
                                            fontSize={12 / scale}
                                            padding={4 / scale}
                                            fill="#fff"
                                        />
                                    </Label>
                                </Group>
                            )
                        })}

                        {overlayBox ? (
                            <Rect
                                x={overlayBox.x}
                                y={overlayBox.y}
                                width={overlayBox.width}
                                height={overlayBox.height}
                                stroke={overlayBox.stroke}
                                strokeWidth={overlayBox.strokeWidth}
                                dash={overlayBox.dash}
                                hitStrokeWidth={10 / scale}
                                perfectDrawEnabled={false}
                            />
                        ) : null}

                        {children}
                    </Layer>
                </Stage>
            </div>
        )
    },
)

BaseCanvas.displayName = 'BaseCanvas'
