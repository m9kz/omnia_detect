import type { ChangeEvent } from 'react'
import UploadIcon from '@/shared/assets/upload.svg?react'
import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { Card } from '@/shared/ui/compound/Card'
import styles from './ImageUploader.module.css'

export function ImageUploader() {
    const addImages = useImageWorkspaceStore((state) => state.addImages)

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) {
            return
        }

        void addImages(Array.from(event.target.files))
    }

    return (
        <Card padding="md" gap="md">
            <Card.Content>
                <Card.Header>
                    <Card.Title>Зображення</Card.Title>
                    <Card.Description>
                        PNG або JPEG для розмітки й детекції.
                    </Card.Description>
                </Card.Header>

                <label htmlFor="image-upload" className={styles.trigger}>
                    <UploadIcon className={styles.icon} />
                    <span className={styles.copy}>Перетягніть файли або оберіть з диска</span>
                    <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/png, image/jpeg"
                        onChange={handleFileChange}
                        className={styles.input}
                    />
                </label>
            </Card.Content>
        </Card>
    )
}
