import type { Annotations, YoloBBox } from '@/entities/annotation'
import type { DatasetItemSchema } from '@/entities/dataset'
import type { ImageEntity } from '@/entities/image'
import { protectedHttp } from '@/shared/lib/api/client'
import { labelNameFor, pixelToYolo, yoloToLabelText } from '@/shared/lib/converters'

type BuildDatasetArgs = {
    images: ImageEntity[]
    annotations: Annotations
    classNames: string[]
    ratio: number
    dimsById?: Record<string, { width: number; height: number }>
}

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

    const classMap = new Map(classNames.map((name, index) => [name, index]))

    for (const image of images) {
        formData.append('image_files', image.file, image.file.name)

        const boxesPx = annotations[image.id] ?? []
        const width = dimsById?.[image.id]?.width ?? image.imageElement.naturalWidth
        const height = dimsById?.[image.id]?.height ?? image.imageElement.naturalHeight

        const yoloBoxes = boxesPx
            .map((bbox) => pixelToYolo(bbox, width, height, classMap))
            .filter((bbox): bbox is YoloBBox => bbox !== null)

        const labelText = yoloBoxes.length > 0 ? yoloToLabelText(yoloBoxes) : ''
        const labelFile = new File([labelText], labelNameFor(image.file.name), {
            type: 'text/plain',
        })

        formData.append('label_files', labelFile)
    }

    const { data } = await protectedHttp.post<DatasetItemSchema>('/dataset/build', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })

    return data
}
