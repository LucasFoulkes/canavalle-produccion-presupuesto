import { db } from '@/lib/dexie'
import { Cama } from '@/types/database'

export type { Cama }

export const camaService = {
    // Get all camas for a bloque - offline first
    async getCamasByBloque(bloqueId: number): Promise<Cama[]> {
        // 1. Get offline data first (fast response) - using Dexie filter then sort numerically
        const bloqueCamas = await db.camas
            .filter(cama => cama.bloque_id === bloqueId)
            .toArray()

        // 2. Sort numerically by converting nombre to number
        bloqueCamas.sort((a, b) => {
            const numA = parseInt(a.nombre) || 0
            const numB = parseInt(b.nombre) || 0
            return numA - numB
        })

        // 3. Skip background cama sync - handled by cama assignment service
        // syncService.tryUpdateCamas() // Disabled to prevent duplicates

        return bloqueCamas
    },    // Get stored camas from local DB
    async getStoredCamas(): Promise<Cama[]> {
        return await db.camas.toArray()
    },
}
