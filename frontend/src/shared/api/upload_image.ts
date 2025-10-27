import axios from 'axios'
import type { UploadResponse } from '../types/schemas'
import type { ImageEntity } from '../types/app';

const apiClient = axios.create({
    baseURL: '/api', // Uses the proxy set in vite.config.ts
})

/**
 * The main function to build and submit the dataset.
 * This handles all the FormData creation.
 */
export async function uploadImage(image: ImageEntity): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', image.file, image.file.name);

    const { data } = await apiClient.post<UploadResponse>('/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as UploadResponse;
}