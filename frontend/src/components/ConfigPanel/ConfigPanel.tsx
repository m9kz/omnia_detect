import React, { useState, useEffect } from 'react'
import { useBuilderStore } from '../../shared/store/builder_store'

import styles from './ConfigPanel.module.css'

export const ConfigPanel: React.FC = () => {
    const { setConfig } = useBuilderStore()
    const [classesStr, setClassesStr] = useState('cat, dog, person')
    const [ratio, setRatio] = useState(0.8)

  // Update global store when local state changes
    useEffect(() => {
        const classNames = classesStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        setConfig(classNames, ratio)
    }, [classesStr, ratio, setConfig])

    return (
        <div className="form-group">
            <label htmlFor="classes" className={styles.textarea_label}>Class Names (comma-separated)</label>
            <div className={styles.textarea_field}>
               <textarea
                id="classes"
                value={classesStr}
                onChange={(e) => setClassesStr(e.target.value)}
                placeholder="e.g., cat, dog, person"
                className={styles.textarea}
            /> 
            </div>
            <label htmlFor="ratio" className={styles.input_label}>Train/Validation Ratio</label>
            <div className={styles.input_field}>
                <input
                    id="ratio"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="0.9"
                    value={ratio}
                    className={styles.input}
                    onChange={(e) => setRatio(parseFloat(e.target.value))}
                />
            </div>
        </div>
    )
}