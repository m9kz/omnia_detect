import React from 'react'
import { useBuilderStore } from '../../shared/store/builder_store'

import styles from './ClassSelector.module.css'

export const ClassSelector: React.FC = () => {
    const { classNames, selectedClass, setSelectedClass } = useBuilderStore()

    if (classNames.length === 0) {
        return null
    }

    return (
        <div className="form-group">
            <label className={styles.selector_label}>Select Class to Annotate</label>
            <div className={styles.class_list}>
                {classNames.map((name) => (
                    <div
                        key={name}
                        className={`${styles.class_chip} ${selectedClass === name ? styles.selected : ''}`}
                        onClick={() => setSelectedClass(name)}
                    >
                        {name}
                    </div>
                ))}
            </div>
        </div>
    )
}