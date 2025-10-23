import axios from 'axios'
import type { DatasetItemSchema } from '../types/schemas'
import type { LabeledImage } from '../types/app'
import {
  generateLabelFileContent,
  getLabelFilename,
} from '../utils/converters'

const apiClient = axios.create({
  baseURL: '/api', // Uses the proxy set in vite.config.ts
})

/**
 * The main function to build and submit the dataset.
 * This handles all the FormData creation.
 */
export async function buildDataset(
    labeledImages: LabeledImage[],
    classNames: string[],
    ratio: number,
): Promise<DatasetItemSchema> {
    const formData = new FormData()

    formData.append('ratio', ratio.toString())
    formData.append('class_names', classNames.join(','))

    const classMap = new Map(classNames.map((name, i) => [name, i]))

    for (const labeledImage of labeledImages) {
            formData.append('image_files', labeledImage.file, labeledImage.file.name)

            const labelContent = generateLabelFileContent(labeledImage, classMap)
            const labelFilename = getLabelFilename(labeledImage.file.name)
            const labelFile = new File([labelContent], labelFilename, {
            type: 'text/plain',
        })

        formData.append('label_files', labelFile)
    }

    const response = await apiClient.post<DatasetItemSchema>(
        '/dataset/build',
        formData,
        { 
            headers: { 'Content-Type': 'multipart/form-data' } 
        },
    )

    return response.data
}