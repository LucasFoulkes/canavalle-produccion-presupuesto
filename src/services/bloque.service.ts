import { db } from '@/lib/dexie'
import { syncService } from './sync.service'
import { Bloque, Variedad, BloqueVariedad } from '@/types/database'

// Export types for use in other modules
export type { Bloque, Variedad, BloqueVariedad }

export const bloqueService = {
    // Get all bloques for a finca - offline first
    async getBloquesByFinca(fincaId: number): Promise<Bloque[]> {
        // 1. Get offline data first (fast response)
        const allBloques = await db.bloques.toArray()
        const fincaBloques = allBloques.filter(bloque => bloque.finca_id === fincaId)

        // 2. Try to update in background (don't block UI)
        syncService.tryUpdateBloques()

        return fincaBloques
    },
}