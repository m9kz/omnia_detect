import React from 'react'
import { ConfigPanel } from '../components/ConfigPanel/ConfigPanel'
import { ImageUploader } from '../components/ImageUploader/ImageUploader'
import { ImageList } from '../components/ImageList/ImageList'
import { AnnotationCanvas } from '../components/annotation_canvas'
import { useBuilderStore } from '../shared/store/builder_store'
import { ClassSelector } from '../components/ClassSelector/ClassSelector'
import { SubmitPanel } from '../components/submit_panel'

export const DatasetBuilderPage: React.FC = () => {
    const { labeledImages, selectedImageId, updateBboxes, selectedClass } =
        useBuilderStore()

    const selectedImage = labeledImages.find((img: { id: any }) => img.id === selectedImageId)

    const handleBboxesChange = (newBboxes: any[]) => {
        if (selectedImageId) {
            updateBboxes(selectedImageId, newBboxes)
        }
    }

  return (
    <>
        {/* Sidebar */}
        <aside className="sidebar">
            <ConfigPanel />
            <ClassSelector />
            <ImageUploader />
            <ImageList />
            <SubmitPanel />
        </aside>

        {/* Main Content */}
        <main className="main-content">
            <h2>Annotation Canvas</h2>
            {selectedImage && selectedClass ? (
                <AnnotationCanvas
                    key={selectedImage.id} // Force re-mount when image changes
                    imageElement={selectedImage.imageElement}
                    bboxes={selectedImage.bboxes}
                    onBboxesChange={handleBboxesChange}
                    selectedClass={selectedClass}
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
                        {labeledImages.length === 0
                            ? 'Upload images to begin.'
                            : 'Select an image and a class to start annotating.'}
                    </p>
                </div>
            )}
        </main>
    </>
  )
}