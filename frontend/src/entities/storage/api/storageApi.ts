import type { StorageUsageSchema } from '@/entities/storage/types'
import { protectedHttp } from '@/shared/lib/api/client'

export async function getStorageUsage(): Promise<StorageUsageSchema> {
    const { data } = await protectedHttp.get<StorageUsageSchema>('/storage')
    return data
}
