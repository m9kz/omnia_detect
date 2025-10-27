import React, { useMemo, useRef, useImperativeHandle } from 'react'
import { Stage, Layer, Image as KImage, Rect, Text, Label, Tag, Group } from 'react-konva'
import Konva from 'konva'
import { type PixelBBox } from '../shared/types/app'
import { getClassColor } from '../shared/utils/classColors'

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

interface BaseCanvasProps {
    imageElement: HTMLImageElement
    bboxes: PixelBBox[]
    containerWidth?: number

    // interactivity hooks (optional)
    rectDraggable?: boolean
    onRectDragEnd?: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void
    onRectTransformEnd?: (id: string, e: Konva.KonvaEventObject<Event>) => void

    // stage-level mouse hooks (optional)
    onStageMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void
    onStageMouseMove?: (e: Konva.KonvaEventObject<MouseEvent>) => void
    onStageMouseUp?: (e: Konva.KonvaEventObject<MouseEvent>) => void

    // draw a dashed overlay rectangle (e.g., while drawing)
    overlayBox?: OverlayBox

    // let wrappers render extra nodes (e.g., Transformer) in the same Layer
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
            children
        },
        ref
    ) => {
        const stageRef = useRef<Konva.Stage | null>(null)

        const { scale, stageWidth, stageHeight } = useMemo(() => {
        const scale = containerWidth / imageElement.naturalWidth
        
        return {
            scale,
            stageWidth: containerWidth,
            stageHeight: imageElement.naturalHeight * scale
        }
        }, [containerWidth, imageElement])

        useImperativeHandle(ref, () => ({
            getStage: () => stageRef.current
        }))

        return (
            <div className="canvas-container" style={{ width: stageWidth, height: stageHeight }}>
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
                        {/* Uploaded image */}
                        <KImage
                            image={imageElement}
                            width={imageElement.naturalWidth}
                            height={imageElement.naturalHeight}
                            name="image"
                        />

                        {/* Existing boxes */}
                        {bboxes.map((bbox) => {
                            const color = getClassColor(bbox.className);
                            const label = `${bbox.className}`;
                            // const label = `${bbox.className}${bbox.confidence != null ? ` ${(bbox.confidence * 100).toFixed(1)}%` : ''}`;    

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
                                        onDragEnd={onRectDragEnd ? (e) => onRectDragEnd(bbox.id, e) : undefined}
                                        onTransformEnd={onRectTransformEnd ? (e) => onRectTransformEnd(bbox.id, e) : undefined}
                                    />

                                    <Label
                                        x={bbox.x}
                                        y={Math.max(0, bbox.y - (20 / scale))}
                                        listening={false}
                                    >
                                        <Tag
                                            fill="rgba(0,0,0,0.5)"
                                            stroke={color}
                                            strokeWidth={1 / scale}
                                            cornerRadius={4 / scale}
                                        />
                                        <Text
                                            text={label}
                                            fontSize={12 / scale}
                                            padding={4 / scale}
                                            fill="#fff"
                                        />
                                    </Label>
                                </Group>
                            );
                        })}


                        {/* Overlay (e.g., the box being drawn) */}
                        {overlayBox && (
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
                        )}

                        {/* Extra nodes from wrappers, e.g. <Transformer /> */}
                        {children}
                    </Layer>
                </Stage>
            </div>
        )
    }
)

BaseCanvas.displayName = 'BaseCanvas'
