import React from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Separator.module.css'

type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
    orientation?: 'horizontal' | 'vertical'
    decorative?: boolean
    visible?: boolean
    spacing?: 'sm' | 'md' | 'lg'
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
    (
        {
            className,
            orientation = 'horizontal',
            decorative = false,
            visible = true,
            spacing = 'md',
            role,
            ...props
        },
        ref,
    ) => {
        const ariaProps = decorative
            ? { 'aria-hidden': true }
            : {
                  role: role ?? 'separator',
                  'aria-orientation': orientation,
              }

        return (
            <div
                ref={ref}
                className={cn(
                    styles.separator,
                    styles[`orientation${orientation[0].toUpperCase()}${orientation.slice(1)}`],
                    styles[`spacing${spacing[0].toUpperCase()}${spacing.slice(1)}`],
                    visible && styles.visible,
                    className,
                )}
                {...props}
                {...ariaProps}
            />
        )
    },
)

Separator.displayName = 'Separator'
