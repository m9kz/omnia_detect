import React from 'react'
import { useBuilderStore } from '../../shared/store/builder_store'

import styles from './ImageList.module.css'

export const ImageList: React.FC = () => {
    const { labeledImages, selectedImageId, setSelectedImageId } = useBuilderStore()

    return (
        <div className="form-group">
            {labeledImages.length === 0 ? (
                <p className={styles.list_label} style={{ color: 'grey' }}>
                    No images uploaded.
                </p>
            ) : (
                <label className={styles.list_label}>
                    Image Queue ({labeledImages.length})
                </label>
            )}

            <div className={styles.image_list}>
                {labeledImages.map((image) => (
                    <div
                        key={image.id}
                        className={`${styles.image_list_item} ${
                            selectedImageId === image.id ? styles.selected : ''
                        }`}
                        onClick={() => setSelectedImageId(image.id)}
                    >
                        <img src={image.imageUrl} alt={image.file.name} />
                        <span>{image.file.name}</span>
                        <span className={styles.label_count}>{image.bboxes.length}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}