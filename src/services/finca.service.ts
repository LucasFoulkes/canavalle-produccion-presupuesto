import { db } from '@/lib/dexie'
import { syncService } from './sync.service'
import { Finca, Bloque } from '@/types/database'

export type { Finca, Bloque }

export const fincaService = {
    // Get all fincas - offline first, try update in background
    async getAllFincas(): Promise<Finca[]> {
        // 1. Get offline data first (fast response)
        const offlineFincas = await db.fincas.toArray()

        // 2. Try to update in background (don't block UI)
        syncService.tryUpdateFincas()

        return offlineFincas
    },

    // Get stored fincas from local DB
    async getStoredFincas(): Promise<Finca[]> {
        return await db.fincas.toArray()
    },
}
