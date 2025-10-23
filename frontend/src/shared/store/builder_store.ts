import { create } from 'zustand'
import { type LabeledImage, type PixelBBox, createLabeledImage } from '../types/app'

type BuilderState = {
    // --- Config ---
    classNames: string[]
    ratio: number
    selectedClass: string | null

    // --- Data ---
    labeledImages: LabeledImage[]
    selectedImageId: string | null

    // --- UI State ---
    isLoading: boolean
    error: string | null
    submissionResult: { downloadUrl: string } | null

    // --- Actions ---
    setConfig: (classes: string[], ratio: number) => void
    setSelectedClass: (className: string) => void

    addImages: (files: File[]) => Promise<void>
    setSelectedImageId: (id: string) => void

    updateBboxes: (imageId: string, bboxes: PixelBBox[]) => void
    submitDataset: () => Promise<void>
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
    // --- Initial State ---
    classNames: [],
    ratio: 0.8,
    selectedClass: null,
    labeledImages: [],
    selectedImageId: null,
    isLoading: false,
    error: null,
    submissionResult: null,

    // --- Actions ---
    setConfig: (classes, ratio) =>
        set({
            classNames: classes,
            ratio,
            // If the current selected class is no longer valid, reset it
            selectedClass: classes.includes(get().selectedClass || '')
                ? get().selectedClass
                : classes[0] || null,
        }),

    setSelectedClass: (className) => set({ selectedClass: className }),

    addImages: async (files) => {
        const newLabeledImages: LabeledImage[] = []

        // Use Promise.all to load all image elements concurrently
        await Promise.all(
            files.map((file) => {
                return new Promise<void>((resolve, reject) => {
                    const imageElement = new Image()
                    imageElement.src = URL.createObjectURL(file)
                    imageElement.onload = () => {
                        newLabeledImages.push(createLabeledImage(file, imageElement))
                        resolve()
                    }
                    imageElement.onerror = reject
                })
            }),
        )

        set((state) => ({
            labeledImages: [...state.labeledImages, ...newLabeledImages],
            // If no image is selected, select the first one added
            selectedImageId: state.selectedImageId ?? newLabeledImages[0]?.id,
        }))
    },

    setSelectedImageId: (id) => set({ selectedImageId: id }),

    updateBboxes: (imageId, bboxes) =>
        set((state) => ({
            labeledImages: state.labeledImages.map((img) =>
                img.id === imageId ? { ...img, bboxes } : img,
            ),
        })),

    submitDataset: async () => {
        const { labeledImages, classNames, ratio } = get()
        
        // Lazy import API to avoid circular dependencies if API needs store
        const { buildDataset } = await import('../api/dataset')
        
        // Basic validation
        if (labeledImages.length === 0 || classNames.length === 0) {
            set({ error: 'Please add images and define class names.' })
            return
        }

        set({ isLoading: true, error: null, submissionResult: null })

        try {
            const result = await buildDataset(labeledImages, classNames, ratio)
            set({
                isLoading: false,
                submissionResult: { downloadUrl: result.download_url },
            })
        } catch (err: any) {
            console.error(err)
            set({
                isLoading: false,
                error: err.response?.data?.detail || err.message || 'An error occurred.',
            })
        }
    },
}))