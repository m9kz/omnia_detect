import type { FunctionComponent, SVGProps } from 'react'

import ArrowClockwiseIcon from '@/shared/assets/svg/arrow-clockwise.svg?react'
import ArrowDownIcon from '@/shared/assets/svg/arrow-down.svg?react'
import DatasetPairIcon from '@/shared/assets/svg/dataset-pair.svg?react'
import EyeIcon from '@/shared/assets/svg/eye.svg?react'
import ModelsIcon from '@/shared/assets/svg/models.svg?react'

export type IconComponent = FunctionComponent<SVGProps<SVGSVGElement>>

export const IconMapper = {
    'arrow-clockwise': ArrowClockwiseIcon,
    'arrow-down': ArrowDownIcon,
    'dataset-pair': DatasetPairIcon,
    eye: EyeIcon,
    models: ModelsIcon,
} as const satisfies Record<string, IconComponent>

export type IconName = keyof typeof IconMapper
