import React from 'react'
import { useBuilderStore } from '../../shared/store/builder_store'

import UploadIcon from '../../assets/upload.svg?react'
import styles from './ImageUploader.module.css'

export const ImageUploader: React.FC = () => {
    const { addImages } = useBuilderStore()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            addImages(files)
        }
    }

    return (
        <div className="form-group">
            <label htmlFor="image-upload" className={styles.uploader_label}>Upload Images</label>
            <div className={styles.uploader__trigger}>
                <UploadIcon className={styles.upload__icon}/>
                <input
                    id="image-upload"
                    type="file"
                    multiple
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    className={styles.uploader__input}
                />
            </div>
        </div>
    )
}