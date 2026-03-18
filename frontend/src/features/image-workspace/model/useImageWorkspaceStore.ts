import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Annotations, PixelBBox } from '@/entities/annotation'
import type { ImageEntity, UploadState } from '@/entities/image'
import type { InferenceState } from '@/entities/inference'
import { getErrorMessage } from '@/shared/lib/errors'

type SubmissionState = {
    isLoading: boolean
    error: string | null
    result: { downloadUrl?: string; fileName?: string } | null
}

type ImageWorkspaceState = {
    classNames: string[]
    ratio: number
    selectedClass: string | null
    images: ImageEntity[]
    annotations: Annotations
    uploads: Record<string, UploadState>
    inferences: Record<string, InferenceState>
    selectedImageId: string | null
    error: string | null
    submission: SubmissionState
    setConfig: (classes: string[], ratio: number) => void
    setSelectedClass: (className: string) => void
    addImages: (files: File[]) => Promise<void>
    setSelectedImageId: (id: string) => void
    updateBboxes: (imageId: string, bboxes: PixelBBox[]) => void
    setWorkspaceError: (error: string | null) => void
    setSubmission: (next: Partial<SubmissionState>) => void
    setUploadState: (imageId: string, next: Partial<UploadState>) => void
    setInferenceState: (imageId: string, next: Partial<InferenceState>) => void
}

function createUploadState(): UploadState {
    return { status: 'idle', error: null }
}

function createInferenceState(): InferenceState {
    return { status: 'idle', error: null, detectionsPx: [] }
}

function createImageEntity(
    file: File,
    imageElement: HTMLImageElement,
    imageUrl: string,
): ImageEntity {
    return { id: uuidv4(), file, imageUrl, imageElement }
}

async function loadImage(file: File): Promise<ImageEntity> {
    const imageUrl = URL.createObjectURL(file)

    return new Promise((resolve, reject) => {
        const image = new Image()
        image.src = imageUrl
        image.onload = () => resolve(createImageEntity(file, image, imageUrl))
        image.onerror = () => reject(new Error(`Failed to load image "${file.name}"`))
    })
}

export const useImageWorkspaceStore = create<ImageWorkspaceState>((set, get) => ({
    classNames: [],
    ratio: 0.8,
    selectedClass: null,
    images: [],
    annotations: {},
    uploads: {},
    inferences: {},
    selectedImageId: null,
    error: null,
    submission: {
        isLoading: false,
        error: null,
        result: null,
    },
    setConfig: (classes, ratio) =>
        set({
            classNames: classes,
            ratio,
            selectedClass: classes.includes(get().selectedClass ?? '')
                ? get().selectedClass
                : classes[0] ?? null,
        }),
    setSelectedClass: (className) => set({ selectedClass: className }),
    addImages: async (files) => {
        try {
            const newImages = await Promise.all(files.map((file) => loadImage(file)))

            set((state) => ({
                error: null,
                images: [...state.images, ...newImages],
                annotations: {
                    ...state.annotations,
                    ...Object.fromEntries(newImages.map((image) => [image.id, []])),
                },
                uploads: {
                    ...state.uploads,
                    ...Object.fromEntries(newImages.map((image) => [image.id, createUploadState()])),
                },
                inferences: {
                    ...state.inferences,
                    ...Object.fromEntries(
                        newImages.map((image) => [image.id, createInferenceState()]),
                    ),
                },
                selectedImageId: state.selectedImageId ?? newImages[0]?.id ?? null,
            }))
        } catch (error: unknown) {
            set({ error: getErrorMessage(error, 'Failed to load images') })
        }
    },
    setSelectedImageId: (id) => set({ selectedImageId: id }),
    updateBboxes: (imageId, bboxes) =>
        set((state) => ({
            annotations: { ...state.annotations, [imageId]: bboxes },
        })),
    setWorkspaceError: (error) => set({ error }),
    setSubmission: (next) =>
        set((state) => ({
            submission: { ...state.submission, ...next },
        })),
    setUploadState: (imageId, next) =>
        set((state) => ({
            uploads: {
                ...state.uploads,
                [imageId]: {
                    ...createUploadState(),
                    ...state.uploads[imageId],
                    ...next,
                },
            },
        })),
    setInferenceState: (imageId, next) =>
        set((state) => ({
            inferences: {
                ...state.inferences,
                [imageId]: {
                    ...createInferenceState(),
                    ...state.inferences[imageId],
                    ...next,
                },
            },
        })),
}))
