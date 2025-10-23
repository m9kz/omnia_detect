import React, { useRef, useState } from 'react'
import { Stage, Layer, Image, Rect, Transformer } from 'react-konva'
import { type PixelBBox } from '../shared/types/app'
import { v4 as uuidv4 } from 'uuid'
import Konva from 'konva'

interface Props {
    imageElement: HTMLImageElement
    bboxes: PixelBBox[]
    onBboxesChange: (bboxes: PixelBBox[]) => void
    selectedClass: string
}

// Helper to get color based on class
const a = [
    '#FF0000', 
    '#00FF00', 
    '#0000FF', 
    '#FFFF00', 
    '#00FFFF', 
    '#FF00FF', 
    '#C0C0C0',
    '#800000', 
    '#008000', 
    '#000080', 
    '#808000', 
    '#008080', 
    '#800080', 
    '#808080',
    '#FF8080', 
    '#80FF80', 
    '#8080FF', 
    '#FFFF80', 
    '#80FFFF', 
    '#FF80FF'
];

const CLASS_COLORS: Record<string, string> = {};
const getClassColor = (className: string) => {
    if (!CLASS_COLORS[className]) {
        CLASS_COLORS[className] = a[Object.keys(CLASS_COLORS).length % a.length];
    }
    return CLASS_COLORS[className];
};

export const AnnotationCanvas: React.FC<Props> = ({
    imageElement,
    bboxes,
    onBboxesChange,
    selectedClass,
}) => {
    const [isDrawing, setIsDrawing] = useState(false)
    const [newBox, setNewBox] = useState<{ x: number; y: number; width?: number; height?: number } | null>(null)
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
    
    const trRef = useRef<Konva.Transformer | null>(null);
    const stageRef = useRef<Konva.Stage | null>(null);

    const containerWidth = 800
    const scale = containerWidth / imageElement.naturalWidth
    const stageWidth = containerWidth
    const stageHeight = imageElement.naturalHeight * scale

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.hasName('image');
        
        if (!clickedOnEmpty) {
            // Find the Konva.Rect associated with the click
            const rectNode = e.target.findAncestor('Rect', true);
            if (rectNode) {
                setSelectedBoxId(rectNode.id());
                return;
            }
        }
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
        if (trRef.current && stageRef.current) {
            const stage = stageRef.current;
            const selectedNode = stage.findOne('#' + selectedBoxId);
            
            if (selectedNode) {
                trRef.current.nodes([selectedNode]);
            } else {
                trRef.current.nodes([]);
            }
            trRef.current.getLayer()?.batchDraw();
        }
    }, [selectedBoxId]);

    return (
        <div className="canvas-container" style={{ width: stageWidth, height: stageHeight }}>
            <Stage
                ref={stageRef}
                width={stageWidth}
                height={stageHeight}
                scaleX={scale}
                scaleY={scale}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <Layer>
                    <Image image={imageElement} width={imageElement.naturalWidth} height={imageElement.naturalHeight} name="image" />
                    
                    {/* Existing BBoxes */}
                    {bboxes.map((bbox) => (
                        <Rect
                            key={bbox.id}
                            id={bbox.id}
                            x={bbox.x}
                            y={bbox.y}
                            width={bbox.width}
                            height={bbox.height}
                            stroke={getClassColor(bbox.className)}
                            strokeWidth={2 / scale} // Keep stroke width constant regardless of scale
                            draggable
                            onDragEnd={(e) => {
                                const newBboxes = bboxes.map(b => 
                                    b.id === bbox.id ? {...b, x: e.target.x(), y: e.target.y()} : b
                                );
                                onBboxesChange(newBboxes);
                            }}
                            onTransformEnd={(e) => {
                                const node = e.target;
                                const newBboxes = bboxes.map(b => 
                                    b.id === bbox.id ? {
                                        ...b, 
                                        x: node.x(), 
                                        y: node.y(), 
                                        width: node.width() * node.scaleX(), 
                                        height: node.height() * node.scaleY()
                                    } : b
                                );
                                onBboxesChange(newBboxes);
                                // Reset scale after transform
                                node.scaleX(1);
                                node.scaleY(1);
                            }}
                        />
                    ))}

                    {/* New BBox being drawn */}
                    {newBox && typeof newBox.width === 'number' && typeof newBox.height === 'number' && 
                    Math.abs(newBox.width) > 0 && Math.abs(newBox.height) > 0
                    ? (
                        <Rect
                            x={newBox.width > 0 ? newBox.x : newBox.x + newBox.width}
                            y={newBox.height > 0 ? newBox.y : newBox.y + newBox.height}
                            width={Math.abs(newBox.width)}
                            height={Math.abs(newBox.height)}
                            stroke={getClassColor(selectedClass)}
                            strokeWidth={2 / scale}
                            dash={[4 / scale, 2 / scale]}
                        />
                        )
                    : null}

                    {/* Transformer for resizing/moving */}
                    <Transformer
                        ref={trRef}
                        boundBoxFunc={(_oldBox, newBox) => {
                            // Limit resizing to be within the image boundaries
                            const imageRect = {
                                x: 0,
                                y: 0,
                                width: imageElement.naturalWidth,
                                height: imageElement.naturalHeight,
                            };
                            
                            // Create a copy to avoid modifying the newBox argument directly
                            const clippedBox = { ...newBox };

                            if (clippedBox.x < imageRect.x) {
                                clippedBox.x = imageRect.x;
                            }
                            if (clippedBox.y < imageRect.y) {
                                clippedBox.y = imageRect.y;
                            }
                            if (clippedBox.x + clippedBox.width > imageRect.width) {
                                clippedBox.width = imageRect.width - clippedBox.x;
                            }
                            if (clippedBox.y + clippedBox.height > imageRect.height) {
                                clippedBox.height = imageRect.height - clippedBox.y;
                            }

                            // Return the new clippedBox. 
                            // Since it's a copy of newBox, it still has the 'rotation' property.
                            return clippedBox;
                        }}
                    />
                </Layer>
            </Stage>
        </div>
    ) 
}