import React, { useCallback, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Transformer } from 'react-konva'
import { v4 as uuidv4 } from 'uuid'
import type { PixelBBox } from '@/entities/annotation'
import { getClassColor } from '@/shared/lib/classColors'
import { BaseCanvas, type BaseCanvasHandle } from './BaseCanvas'

type AnnotationCanvasProps = {
    imageElement: HTMLImageElement
    bboxes: PixelBBox[]
    onBboxesChange: (bboxes: PixelBBox[]) => void
    selectedClass: string
}

export function AnnotationCanvas({
    imageElement,
    bboxes,
    onBboxesChange,
    selectedClass,
}: AnnotationCanvasProps) {
    const canvasRef = useRef<BaseCanvasHandle | null>(null)
    const transformerRef = useRef<Konva.Transformer | null>(null)
    const containerWidth = 800
    const scale = useMemo(
        () => containerWidth / imageElement.naturalWidth,
        [containerWidth, imageElement],
    )
    const [isDrawing, setIsDrawing] = useState(false)
    const [newBox, setNewBox] = useState<{
        x: number
        y: number
        width?: number
        height?: number
    } | null>(null)
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)

    const handleDragEnd = useCallback(
        (id: string, event: Konva.KonvaEventObject<DragEvent>) => {
            const { x, y } = event.target.position()
            const nextBoxes = bboxes.map((bbox) => (bbox.id === id ? { ...bbox, x, y } : bbox))
            onBboxesChange(nextBoxes)
        },
        [bboxes, onBboxesChange],
    )

    const handleTransformEnd = useCallback(
        (id: string, event: Konva.KonvaEventObject<Event>) => {
            const node = event.target as Konva.Rect
            const next = {
                x: node.x(),
                y: node.y(),
                width: node.width() * node.scaleX(),
                height: node.height() * node.scaleY(),
            }

            const nextBoxes = bboxes.map((bbox) => (bbox.id === id ? { ...bbox, ...next } : bbox))
            onBboxesChange(nextBoxes)

            node.scaleX(1)
            node.scaleY(1)
        },
        [bboxes, onBboxesChange],
    )

    const handleMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
        const clickedOnEmpty = event.target === event.target.getStage() || event.target.hasName('image')

        if (event.evt?.button === 2) {
            return
        }

        if (!clickedOnEmpty) {
            const rectNode = event.target.findAncestor('Rect', true)

            if (rectNode) {
                setSelectedBoxId(rectNode.id())
                return
            }
        }

        setSelectedBoxId(null)
        setIsDrawing(true)

        const position = event.target.getStage()?.getPointerPosition()

        if (position) {
            setNewBox({ x: position.x / scale, y: position.y / scale })
        }
    }

    const handleMouseMove = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing || !newBox) {
            return
        }

        const position = event.target.getStage()?.getPointerPosition()

        if (position) {
            setNewBox({
                ...newBox,
                width: position.x / scale - newBox.x,
                height: position.y / scale - newBox.y,
            })
        }
    }

    const handleMouseUp = () => {
        setIsDrawing(false)

        if (newBox && newBox.width && newBox.height) {
            const nextBox: PixelBBox = {
                id: uuidv4(),
                className: selectedClass,
                x: newBox.width > 0 ? newBox.x : newBox.x + newBox.width,
                y: newBox.height > 0 ? newBox.y : newBox.y + newBox.height,
                width: Math.abs(newBox.width),
                height: Math.abs(newBox.height),
            }

            onBboxesChange([...bboxes, nextBox])
        }

        setNewBox(null)
    }

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBoxId) {
                onBboxesChange(bboxes.filter((bbox) => bbox.id !== selectedBoxId))
                setSelectedBoxId(null)
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedBoxId, bboxes, onBboxesChange])

    React.useEffect(() => {
        const stage = canvasRef.current?.getStage()

        if (!transformerRef.current || !stage) {
            return
        }

        const node = selectedBoxId ? stage.findOne(`#${selectedBoxId}`) : null
        transformerRef.current.nodes(node ? [node as Konva.Node] : [])
        transformerRef.current.getLayer()?.batchDraw()
    }, [selectedBoxId])

    const overlay =
        newBox &&
        typeof newBox.width === 'number' &&
        typeof newBox.height === 'number' &&
        Math.abs(newBox.width) > 0 &&
        Math.abs(newBox.height) > 0
            ? {
                  x: newBox.width > 0 ? newBox.x : newBox.x + newBox.width,
                  y: newBox.height > 0 ? newBox.y : newBox.y + newBox.height,
                  width: Math.abs(newBox.width),
                  height: Math.abs(newBox.height),
                  stroke: getClassColor(selectedClass),
                  strokeWidth: 2 / scale,
                  dash: [4 / scale, 2 / scale],
              }
            : undefined

    return (
        <BaseCanvas
            ref={canvasRef}
            imageElement={imageElement}
            bboxes={bboxes}
            containerWidth={containerWidth}
            rectDraggable
            onRectDragEnd={handleDragEnd}
            onRectTransformEnd={handleTransformEnd}
            onStageMouseDown={handleMouseDown}
            onStageMouseMove={handleMouseMove}
            onStageMouseUp={handleMouseUp}
            overlayBox={overlay}
        >
            <Transformer
                ref={transformerRef}
                boundBoxFunc={(_oldBox, nextBox) => {
                    const imageRect = {
                        x: 0,
                        y: 0,
                        width: imageElement.naturalWidth,
                        height: imageElement.naturalHeight,
                    }

                    const clippedBox = { ...nextBox }

                    if (clippedBox.x < imageRect.x) {
                        clippedBox.x = imageRect.x
                    }

                    if (clippedBox.y < imageRect.y) {
                        clippedBox.y = imageRect.y
                    }

                    if (clippedBox.x + clippedBox.width > imageRect.width) {
                        clippedBox.width = imageRect.width - clippedBox.x
                    }

                    if (clippedBox.y + clippedBox.height > imageRect.height) {
                        clippedBox.height = imageRect.height - clippedBox.y
                    }

                    return clippedBox
                }}
            />
        </BaseCanvas>
    )
}
