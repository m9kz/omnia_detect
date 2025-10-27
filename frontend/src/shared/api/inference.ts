import axios from 'axios'
import type { DetectResponse } from '../types/schemas'

const apiClient = axios.create({
    baseURL: '/api', // Uses the proxy set in vite.config.ts
})

/**
 * The main function to build and submit the dataset.
 * This handles all the FormData creation.
 */
export async function inferenceImage(imageId: string): Promise<DetectResponse> {
    const { data } = await apiClient.post<DetectResponse>(`/images/${imageId}/detect`, {
        headers: { 'Content-Type': 'text' },
    });
    return data as DetectResponse;
}