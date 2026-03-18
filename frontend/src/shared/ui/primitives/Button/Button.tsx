import React from 'react'
import { cn } from '@/shared/lib/cn'
import type { PolymorphicComponent, PolymorphicProps, PolymorphicRef } from '@/shared/ui/lib/polymorphic'
import styles from './Button.module.css'

type ButtonOwnProps = {
    variant?: 'solid' | 'soft' | 'outline' | 'ghost'
    color?: 'accent' | 'neutral' | 'success' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    radius?: 'sm' | 'md' | 'lg' | 'pill'
    justify?: 'start' | 'center' | 'between'
    fluid?: boolean
}

type ButtonProps<E extends React.ElementType = 'button'> = PolymorphicProps<E, ButtonOwnProps>

const ButtonImpl = <E extends React.ElementType = 'button'>(
    {
        as,
        className,
        variant = 'solid',
        color = 'accent',
        size = 'md',
        radius = 'pill',
        justify = 'center',
        fluid = false,
        ...props
    }: ButtonProps<E>,
    ref: PolymorphicRef<E>,
) => {
    const Component = as ?? 'button'
    const componentProps =
        Component === 'button'
            ? { type: (props as React.ButtonHTMLAttributes<HTMLButtonElement>).type ?? 'button' }
            : {}

    return (
        <Component
            ref={ref}
            className={cn(
                styles.button,
                styles[`variant${variant[0].toUpperCase()}${variant.slice(1)}`],
                styles[`color${color[0].toUpperCase()}${color.slice(1)}`],
                styles[`size${size[0].toUpperCase()}${size.slice(1)}`],
                styles[`radius${radius[0].toUpperCase()}${radius.slice(1)}`],
                styles[`justify${justify[0].toUpperCase()}${justify.slice(1)}`],
                fluid && styles.fluid,
                className,
            )}
            {...componentProps}
            {...props}
        />
    )
}

const ButtonBase = React.forwardRef(ButtonImpl as never) as PolymorphicComponent<'button', ButtonOwnProps>

export const Button = ButtonBase

Button.displayName = 'Button'
