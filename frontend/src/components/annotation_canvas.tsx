import React, { useRef, useState, useCallback, useMemo } from 'react'
import { Transformer } from 'react-konva'
import { type PixelBBox } from '../shared/types/app'
import { v4 as uuidv4 } from 'uuid'
import Konva from 'konva'

import { BaseCanvas, type BaseCanvasHandle } from './base_canvas'
import { getClassColor } from '../shared/utils/classColors'

interface Props {
    imageElement: HTMLImageElement
    bboxes: PixelBBox[]
    onBboxesChange: (bboxes: PixelBBox[]) => void
    selectedClass: string
}

export const AnnotationCanvas: React.FC<Props> = ({
    imageElement,
    bboxes,
    onBboxesChange,
    selectedClass,
}) => {
    const canvasRef = useRef<BaseCanvasHandle | null>(null)
    const trRef = useRef<Konva.Transformer | null>(null)

    const containerWidth = 800
    const scale = useMemo(() => containerWidth / imageElement.naturalWidth, [containerWidth, imageElement])

    const [isDrawing, setIsDrawing] = useState(false)
    const [newBox, setNewBox] = useState<{ x: number; y: number; width?: number; height?: number } | null>(null)
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)

    const handleDragEnd = useCallback(
        (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
            const { x, y } = e.target.position()
            const newBboxes = bboxes.map(b => (b.id === id ? { ...b, x, y } : b))
            onBboxesChange(newBboxes)
        },
        [bboxes, onBboxesChange]
    )

    const handleTransformEnd = useCallback(
        (id: string, e: Konva.KonvaEventObject<Event>) => {
            const node = e.target as Konva.Rect
            const next = {
                x: node.x(),
                y: node.y(),
                width: node.width() * node.scaleX(),
                height: node.height() * node.scaleY()
            }

            const newBboxes = bboxes.map(b => (b.id === id ? { ...b, ...next } : b))
            onBboxesChange(newBboxes)

            node.scaleX(1)
            node.scaleY(1)
        },
        [bboxes, onBboxesChange]
    )

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.hasName('image');
        
        if (e.evt?.button === 2) {
            return
        };

        if (!clickedOnEmpty) {
            // Find the Konva.Rect associated with the click
            const rectNode = e.target.findAncestor('Rect', true);
            if (rectNode) {
                setSelectedBoxId(rectNode.id());
                return;
            }
        };

        setSelectedBoxId(null);
        setIsDrawing(true)
        const pos = e.target.getStage()?.getPointerPosition()
        if (pos) {
            setNewBox({ x: pos.x / scale, y: pos.y / scale }) // Descale to image coords
        }
    }

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing || !newBox) {
            return
        }
        const pos = e.target.getStage()?.getPointerPosition()
        if (pos) {
            setNewBox({
                ...newBox, // Spreads { x, y }
                width: pos.x / scale - newBox.x, // Descale to image coords
                height: pos.y / scale - newBox.y,
            })
        }
    }

    const handleMouseUp = () => {
        setIsDrawing(false)
        if (newBox && newBox.width && newBox.height) {
            // Ensure width/height are positive
            const newBBox: PixelBBox = {
                id: uuidv4(),
                className: selectedClass,
                x: newBox.width > 0 ? newBox.x : newBox.x + newBox.width,
                y: newBox.height > 0 ? newBox.y : newBox.y + newBox.height,
                width: Math.abs(newBox.width),
                height: Math.abs(newBox.height),
            }
            onBboxesChange([...bboxes, newBBox])
        }
        setNewBox(null)
    }

    // Handle deletion of a selected box
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId) {
                onBboxesChange(bboxes.filter((box) => box.id !== selectedBoxId))
                setSelectedBoxId(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedBoxId, bboxes, onBboxesChange])

    // Attach/detach transformer
    React.useEffect(() => {
        const stage = canvasRef.current?.getStage()
        if (!trRef.current || !stage) {
            return
        }
        
        const node = selectedBoxId ? stage.findOne('#' + selectedBoxId) : null
        trRef.current.nodes(node ? [node as Konva.Node] : [])
        trRef.current.getLayer()?.batchDraw()
    }, [selectedBoxId])

    const overlay =
        newBox
        && typeof newBox.width === 'number'
        && typeof newBox.height === 'number'
        && Math.abs(newBox.width) > 0
        && Math.abs(newBox.height) > 0
        ? {
            x: newBox.width > 0 ? newBox.x : newBox.x + newBox.width,
            y: newBox.height > 0 ? newBox.y : newBox.y + newBox.height,
            width: Math.abs(newBox.width),
            height: Math.abs(newBox.height),
            stroke: getClassColor(selectedClass),
            strokeWidth: 2 / scale,
            dash: [4 / scale, 2 / scale]
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
                ref={trRef}
                boundBoxFunc={(_oldBox, newBox) => {
                    const imageRect = {
                        x: 0,
                        y: 0,
                        width: imageElement.naturalWidth,
                        height: imageElement.naturalHeight
                    }

                    const clippedBox = { ...newBox }
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