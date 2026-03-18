import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/compound/Card'
import { Button } from '@/shared/ui/primitives/Button'
import styles from './ClassSelector.module.css'

export function ClassSelector() {
    const classNames = useImageWorkspaceStore((state) => state.classNames)
    const selectedClass = useImageWorkspaceStore((state) => state.selectedClass)
    const setSelectedClass = useImageWorkspaceStore((state) => state.setSelectedClass)

    if (classNames.length === 0) {
        return null
    }

    return (
        <Card padding="md" gap="md">
            <Card.Content>
                <Card.Header>
                    <Card.Title>Select Class</Card.Title>
                    <Card.Description>
                        Choose which class the next bounding box should use.
                    </Card.Description>
                </Card.Header>

                <div className={styles.list}>
                    {classNames.map((name) => (
                        <Button
                            key={name}
                            variant="soft"
                            color="accent"
                            size="sm"
                            radius="sm"
                            className={cn(styles.chip, selectedClass === name && styles.selected)}
                            onClick={() => setSelectedClass(name)}
                            aria-pressed={selectedClass === name}
                        >
                            {name}
                        </Button>
                    ))}
                </div>
            </Card.Content>
        </Card>
    )
}
