import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Icon.module.css'
import { IconSvg } from './IconSvg'

type IconProps = HTMLAttributes<HTMLSpanElement>

function IconRoot({ className, ...props }: IconProps) {
    return <span className={cn(styles.root, className)} {...props} />
}

export const Icon = Object.assign(IconRoot, {
    Svg: IconSvg,
})

