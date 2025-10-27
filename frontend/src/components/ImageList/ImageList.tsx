import React, { useMemo } from 'react'
import { useBuilderStore } from '../../shared/store/builder_store'

import styles from './ImageList.module.css'

export const ImageList: React.FC = () => {
    const { images, annotations, selectedImageId, setSelectedImageId } = useBuilderStore()

    const bboxes = useMemo(
        () => (selectedImageId ? annotations[selectedImageId] ?? [] : []),
        [annotations, selectedImageId],
    )

    return (
        <div className="form-group">
            {images.length === 0 ? (
                <p className={styles.list_label} style={{ color: 'grey' }}>
                    No images uploaded.
                </p>
            ) : (
                <label className={styles.list_label}>
                    Image Queue ({images.length})
                </label>
            )}

            <div className={styles.image_list}>
                {images.map((image) => (
                    <div
                        key={image.id}
                        className={`${styles.image_list_item} ${
                            selectedImageId === image.id ? styles.selected : ''
                        }`}
                        onClick={() => setSelectedImageId(image.id)}
                    >
                        <img src={image.imageUrl} alt={image.file.name} />
                        <span>{image.file.name}</span>
                        <span className={styles.label_count}>{bboxes.length}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}