import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/compound/Card'
import { Badge } from '@/shared/ui/primitives/Badge'
import { Button } from '@/shared/ui/primitives/Button'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './ImageQueue.module.css'

export function ImageQueue() {
    const images = useImageWorkspaceStore((state) => state.images)
    const annotations = useImageWorkspaceStore((state) => state.annotations)
    const selectedImageId = useImageWorkspaceStore((state) => state.selectedImageId)
    const setSelectedImageId = useImageWorkspaceStore((state) => state.setSelectedImageId)

    return (
        <Card padding="md" gap="md">
            <Card.Content>
                <Card.Header>
                    <Card.Title>Image Queue</Card.Title>
                    <Card.Description>
                        {images.length === 0
                            ? 'No images uploaded yet.'
                            : `${images.length} image${images.length === 1 ? '' : 's'} ready.`}
                    </Card.Description>
                </Card.Header>

                <div className={styles.list}>
                    {images.map((image) => (
                        <Button
                            key={image.id}
                            variant="ghost"
                            color="neutral"
                            radius="md"
                            justify="start"
                            fluid
                            className={cn(styles.item, selectedImageId === image.id && styles.selected)}
                            onClick={() => setSelectedImageId(image.id)}
                            aria-pressed={selectedImageId === image.id}
                        >
                            <img src={image.imageUrl} alt={image.file.name} />
                            <Text as="span" size="sm" weight="medium" truncate>
                                {image.file.name}
                            </Text>
                            <Badge className={styles.count} size="sm" color="accent" variant="solid">
                                {(annotations[image.id] ?? []).length}
                            </Badge>
                        </Button>
                    ))}
                </div>
            </Card.Content>
        </Card>
    )
}
