import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { IconMapper } from '@/shared/lib/iconMapper'
import type { IconName } from '@/shared/lib/iconMapper'
import styles from './Icon.module.css'

type IconSvgProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    name: IconName
    size?: 'sm' | 'md' | 'lg' | 'xl'
    label?: string
    svgClassName?: string
}

export function IconSvg({
    name,
    size = 'md',
    label,
    className,
    svgClassName,
    ...props
}: IconSvgProps) {
    const SvgIcon = IconMapper[name]

    return (
        <span
            className={cn(
                styles.icon,
                styles[`size${size[0].toUpperCase()}${size.slice(1)}`],
                className,
            )}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            {...props}
        >
            <SvgIcon className={cn(styles.svg, svgClassName)} focusable="false" aria-hidden="true" />
        </span>
    )
}

