import { create } from 'zustand'
import { type Annotations, type PixelBBox } from '../types/app'

import type { ImageEntity, UploadState, InferenceState } from '../types/app'
import { detectionsToPixelBBoxes } from '../utils/converters'

import { v4 as uuidv4 } from 'uuid'

type BuilderState = {
    // --- Config ---
    classNames: string[]
    ratio: number
    selectedClass: string | null

    // --- Data ---
    images: ImageEntity[]
    annotations: Annotations

    // --- Process State ---
    uploads: Record<string, UploadState>
    inferences: Record<string, InferenceState>

    // --- UI State ---
    selectedImageId: string | null
    isLoading: boolean
    error: string | null
    submissionResult: { downloadUrl?: string; fileName?: string } | null

    // --- Actions ---
    setConfig: (classes: string[], ratio: number) => void
    setSelectedClass: (className: string) => void

    addImages: (files: File[]) => Promise<void>
    setSelectedImageId: (id: string) => void

    updateBboxes: (imageId: string, bboxes: PixelBBox[]) => void
    submitDataset: () => Promise<void>

    uploadImage: (imageIdOrIds: string | string[]) => Promise<void>
    inferenceImage: (imageIdOrIds: string | string[]) => Promise<void>

    // uploadImage: (imageId: string) => Promise<void>
    // uploadAllPending: () => Promise<void>
    // runInference: (imageId: string) => Promise<void>
    // runInferenceForAll: () => Promise<void>
}

export function createImageEntity(file: File, el: HTMLImageElement): ImageEntity {
    return { id: uuidv4(), file, imageUrl: URL.createObjectURL(file), imageElement: el }
}

function toArray<T>(x: T | T[]): T[] {
    return Array.isArray(x) ? x : [x]
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
    // --- Initial State ---
    classNames: [],
    ratio: 0.8,
    selectedClass: null,

    images: [],
    annotations: {},

    uploads: {},
    inferences: {},

    selectedImageId: null,
    isLoading: false,
    error: null,
    submissionResult: null,

    setConfig: (classes, ratio) =>
        set({
            classNames: classes,
            ratio,
            selectedClass: classes.includes(get().selectedClass || '')
                ? get().selectedClass
                : classes[0] || null,
        }),

    setSelectedClass: (className) => set({ selectedClass: className }),

    addImages: async (files) => {
        const newImages: ImageEntity[] = []
        await Promise.all(files.map(file =>
            new Promise<void>((resolve, reject) => {
                const img = new Image()
                img.src = URL.createObjectURL(file)
                img.onload = () => { newImages.push(createImageEntity(file, img)); resolve() }
                img.onerror = reject
            })
        ))

        set((s) => ({
            images: [...s.images, ...newImages],
                // ensure annotation buckets & process state exist
            annotations: {
                ...s.annotations,
                ...Object.fromEntries(newImages.map(i => [i.id, s.annotations[i.id] ?? []])),
            },
            uploads: {
                ...s.uploads,
                ...Object.fromEntries(newImages.map(i => [i.id, s.uploads[i.id] ?? { status: 'idle' }])),
            },
            inferences: {
                ...s.inferences,
                ...Object.fromEntries(newImages.map(i => [i.id, s.inferences[i.id] ?? { status: 'idle' }])),
            },
            selectedImageId: s.selectedImageId ?? newImages[0]?.id ?? null,
        }))
    },

    setSelectedImageId: (id) => set({ selectedImageId: id }),

    updateBboxes: (imageId, bboxes) =>
        set((s) => ({ annotations: { ...s.annotations, [imageId]: bboxes } })),

    submitDataset: async () => {
        const { images, annotations, classNames, ratio } = get()
        
        if (images.length === 0 || classNames.length === 0) {
            set({ error: 'Please add images and define class names.' }); 
            return
        }
        
        set({ isLoading: true, error: null, submissionResult: null })
        
        try {
            const { buildDataset } = await import('../api/dataset')
            const result = await buildDataset({ images, annotations, classNames, ratio })
            set({ isLoading: false, submissionResult: { downloadUrl: result.download_url } })
        } catch (err: any) {
            console.error(err)
            set({ isLoading: false, error: err?.response?.data?.detail || err?.message || 'An error occurred.' })
        }
    },

    uploadImage: async (imageIdOrIds) => {
        const ids = toArray(imageIdOrIds)
        const { images } = get()

        // optimistically mark as uploading
        set((s) => ({
            uploads: {
                ...s.uploads,
                ...Object.fromEntries(
                    ids.map((id) => [
                        id,
                        { 
                            ...(s.uploads[id] ?? { status: 'idle' }), 
                            status: 'uploading', 
                            error: null 
                        },
                    ])
                ),
            },
        }))

        await Promise.all(
            ids.map(async (id) => {
                try {
                    const img = images.find((i) => i.id === id)
                    if (!img) throw new Error('Image not found in store')

                    const { uploadImage } = await import('../api/upload_image')    
                    const data = await uploadImage(img)

                    set((s) => ({
                        uploads: {
                            ...s.uploads,
                            [id]: {
                                status: 'uploaded',
                                error: null,
                                server: {
                                    imageId: data.image_id,
                                    url: data.url,
                                    width: data.width,
                                    height: data.height,
                                    filename: data.filename,
                                },
                            },
                        },
                    }))
                } catch (err: any) {
                    set((s) => ({
                        uploads: {
                            ...s.uploads,
                            [id]: {
                                ...(s.uploads[id] ?? { status: 'idle' }),
                                status: 'error',
                                error: err?.message ?? 'Upload error',
                            },
                        },
                    }))
                }
            })
        )
    },

    inferenceImage: async (imageIdOrIds) => {
        const ids = toArray(imageIdOrIds)
        const state = get()

        // mark as running
        set((s) => ({
            inferences: {
                ...s.inferences,
                ...Object.fromEntries(
                    ids.map((id) => [
                        id,
                        { 
                            ...(s.inferences[id] ?? { status: 'idle' }), 
                            status: 'running', 
                            error: null 
                        },
                    ])
                ),
            },
        }))

        await Promise.all(
            ids.map(async (id) => {
                try {
                    let serverImageId = state.uploads[id]?.server?.imageId

                    // if not uploaded yet, upload first
                    if (!serverImageId) {
                        await get().uploadImage(id)
                        serverImageId = get().uploads[id]?.server?.imageId
                    }

                    if (!serverImageId) {
                        throw new Error('Image is not uploaded (missing server image id)')
                    }

                    const { inferenceImage } = await import('../api/inference')    
                    const det = await inferenceImage(serverImageId)

                    const W = get().uploads[id]?.server?.width ?? 0;
                    const H = get().uploads[id]?.server?.height ?? 0;

                    const pixelBoxes = detectionsToPixelBBoxes(det.detections ?? [], W, H);

                    set((s) => ({
                        inferences: {
                            ...s.inferences,
                            [id]: {
                                status: 'done',
                                error: null,
                                detections: det.detections,
                                detectionsPx: pixelBoxes
                            },
                        },
                    }));
                } catch (err: any) {
                    set((s) => ({
                        inferences: {
                            ...s.inferences,
                            [id]: {
                                ...(s.inferences[id] ?? { status: 'idle' }),
                                status: 'error',
                                error: err?.message ?? 'Inference error',
                            },
                        },
                    }))
                }
            })
        )
    },
}))