export interface PixelBBox {
    id: string
    x: number
    y: number
    width: number
    height: number
    className: string
}

export type Annotations = Record<string, PixelBBox[]>

export interface YoloBBox {
    classIndex: number
    x_center: number
    y_center: number
    width: number
    height: number
}
