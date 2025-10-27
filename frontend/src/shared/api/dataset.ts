import axios from 'axios'
import type { DatasetItemSchema } from '../types/schemas'
import type { ImageEntity, Annotations, YoloBBox } from '../types/app'
import {
  pixelToYolo,
  yoloToLabelText,
  labelNameFor
} from '../utils/converters'

const apiClient = axios.create({
  baseURL: '/api', // Uses the proxy set in vite.config.ts
})

type BuildDatasetArgs = {
    images: ImageEntity[]                 // from store.images
    annotations: Annotations              // from store.annotations (by imageId)
    classNames: string[]                  // from store.classNames
    ratio: number                         // from store.ratio
    dimsById?: Record<string, { width: number; height: number }>
}

/**
 * The main function to build and submit the dataset.
 * This handles all the FormData creation.
 */
export async function buildDataset({
    images,
    annotations,
    classNames,
    ratio,
    dimsById,
}: BuildDatasetArgs): Promise<DatasetItemSchema> {
    if (!Array.isArray(images) || images.length === 0) {
        throw new Error('No images provided')
    }
    if (!Array.isArray(classNames) || classNames.length === 0) {
        throw new Error('classNames must contain at least one class')
    }
    if (!(ratio > 0 && ratio < 1)) {
        throw new Error('ratio must be between 0 and 1 (exclusive)')
    }

    const formData = new FormData()
    formData.append('ratio', ratio.toString())
    formData.append('class_names', classNames.join(','))

    const classMap = new Map(classNames.map((n, i) => [n, i]))

    for (const img of images) {
        // 1) append the actual image
        formData.append('image_files', img.file, img.file.name)

        // 2) generate YOLO label text from pixel boxes
        const boxesPx = annotations[img.id] ?? []
        const W = dimsById?.[img.id]?.width ?? img.imageElement.naturalWidth
        const H = dimsById?.[img.id]?.height ?? img.imageElement.naturalHeight

        const yoloObjs = boxesPx
            .map((b) => pixelToYolo(b, W, H, classMap))
            .filter((x): x is YoloBBox => !!x)

        const labelText = yoloObjs.length ? yoloToLabelText(yoloObjs) : ''
        const labelFile = new File([labelText], labelNameFor(img.file.name), { type: 'text/plain' })
        formData.append('label_files', labelFile)
    }

    const res = await apiClient.post<DatasetItemSchema>('/dataset/build', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
}