import React, { useMemo } from 'react'
import { ImageUploader } from '../components/ImageUploader/ImageUploader'
import { ImageList } from '../components/ImageList/ImageList'
import { useBuilderStore } from '../shared/store/builder_store'
import { ImageSubmitPanel } from '../components/image_submit_panel'

import { InferenceCanvas } from '../components/inference_canvas'
import type { PixelBBox } from '../shared/types/app'


export const ImageInferencePage: React.FC = () => {
    const { images, inferences, selectedImageId } = useBuilderStore()
    
    const selectedImage = useMemo(
        () => images.find((img) => img.id === selectedImageId) ?? null,
        [images, selectedImageId],
    )

    const inf = inferences[selectedImageId ?? ""];

    const bboxes: PixelBBox[] =
        inf?.status === "done" ? inf?.detectionsPx ?? [] : [];

    return (
        <>
            {/* Sidebar */}
            <aside className="sidebar">
                <ImageUploader />
                <ImageList />
                <ImageSubmitPanel />
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <h2>Image Inference</h2>
                {selectedImage ? (
                    <InferenceCanvas
                        imageElement={selectedImage.imageElement}
                        bboxes={bboxes}
                    />
                ) : (
                    <div
                        className="canvas-container"
                        style={{
                            width: 800,
                            height: 600,
                            display: 'grid',
                            placeItems: 'center',
                        }}
                    >
                        <p>
                            {images.length === 0
                                ? 'Upload images to begin.'
                                : 'Select an image.'}
                        </p>
                    </div>
                )}
            </main>
        </>
    )
}