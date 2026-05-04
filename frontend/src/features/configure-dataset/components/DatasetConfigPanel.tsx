import { useEffect, useState } from 'react'
import { useImageWorkspaceStore } from '@/features/image-workspace/model/useImageWorkspaceStore'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Input } from '@/shared/ui/primitives/Input'
import { Textarea } from '@/shared/ui/primitives/Textarea'

export function DatasetConfigPanel() {
    const setConfig = useImageWorkspaceStore((state) => state.setConfig)
    const [classesValue, setClassesValue] = useState('кіт, собака, людина')
    const [ratio, setRatio] = useState(0.8)

    useEffect(() => {
        const classNames = classesValue
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)

        setConfig(classNames, ratio)
    }, [classesValue, ratio, setConfig])

    return (
        <Card padding="md" gap="md">
            <Card.Content>
                <Card.Header>
                    <Card.Title>Параметри датасету</Card.Title>
                    <Card.Description>
                        Класи об'єктів і частка навчальної вибірки.
                    </Card.Description>
                </Card.Header>

                <Field>
                    <Field.Label htmlFor="dataset-classes">Класи</Field.Label>
                    <Field.Control>
                        <Textarea
                            id="dataset-classes"
                            value={classesValue}
                            onChange={(event) => setClassesValue(event.target.value)}
                            placeholder="кіт, собака, людина"
                        />
                    </Field.Control>
                </Field>

                <Field>
                    <Field.Label htmlFor="dataset-ratio">Частка train/val</Field.Label>
                    <Field.Control>
                        <Input
                            id="dataset-ratio"
                            type="number"
                            min="0.1"
                            max="0.9"
                            step="0.1"
                            value={ratio}
                            onChange={(event) => setRatio(Number.parseFloat(event.target.value))}
                        />
                    </Field.Control>
                </Field>
            </Card.Content>
        </Card>
    )
}
