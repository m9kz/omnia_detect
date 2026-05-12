import type {
    ComponentPropsWithRef,
    ComponentPropsWithoutRef,
    ElementType,
    ReactElement,
} from 'react'

export type PolymorphicRef<E extends ElementType> = ComponentPropsWithRef<E>['ref']

type AsProp<E extends ElementType> = {
    as?: E
}

type PropsToOmit<E extends ElementType, OwnProps extends object> = keyof (AsProp<E> & OwnProps)

export type PolymorphicProps<
    E extends ElementType,
    OwnProps extends object = Record<string, never>,
> = OwnProps &
    AsProp<E> &
    Omit<ComponentPropsWithoutRef<E>, PropsToOmit<E, OwnProps>>

export type PolymorphicComponent<
    DefaultElement extends ElementType,
    OwnProps extends object = Record<string, never>,
> = (<E extends ElementType = DefaultElement>(
    props: PolymorphicProps<E, OwnProps> & { ref?: PolymorphicRef<E> },
) => ReactElement | null) & {
    displayName?: string
}
