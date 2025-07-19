import { db } from '@/lib/dexie'
import { syncService } from './sync.service'
import { Cama } from '@/types/database'

export type { Cama }

export const camaService = {
    // Get all camas for a bloque - offline first
    async getCamasByBloque(bloqueId: number): Promise<Cama[]> {
        // 1. Get offline data first (fast response) - using Dexie orderBy + filter
        const bloqueCamas = await db.camas
            .orderBy('nombre')
            .filter(cama => cama.bloque_id === bloqueId)
            .toArray()

        // 2. Try to update in background (don't block UI)
        syncService.tryUpdateCamas()

        return bloqueCamas
    },    // Get stored camas from local DB
    async getStoredCamas(): Promise<Cama[]> {
        return await db.camas.toArray()
    },
}
