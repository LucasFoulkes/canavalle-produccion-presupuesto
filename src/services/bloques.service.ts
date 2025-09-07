import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'
import { Bloque } from '@/types/database'

export type { Bloque }

export const bloquesService = {
    // Get bloques by finca ID, trying offline first
    async getBloquesByFincaId(fincaId: number): Promise<Bloque[]> {
        console.log('Getting bloques for finca:', fincaId)

        // 1. Always try offline first
        try {
            const offlineBloques = await db.bloque.where('id_finca').equals(fincaId).toArray()
            if (offlineBloques.length > 0) {
                console.log('Bloques found offline:', offlineBloques)
                return sortBloques(offlineBloques)
            }
            console.log('No bloques found offline for finca, checking online...')
        } catch (error) {
            console.error('Offline bloques error:', error)
        }

        // 2. If not found offline and we're online, try online
        if (!navigator.onLine) {
            console.log('Offline and no bloques found locally for finca')
            return []
        }

        try {
            // Attempt with new Spanish column first (id_finca). If 42703 (column missing), fallback to legacy finca_id.
            const { data, error } = await supabase
                .from(TABLES.bloque)
                .select('*')
                .eq('id_finca', fincaId)

            if (error || !data) {
                console.error('Online bloques error:', error)
                return []
            }
            await db.bloque.bulkPut(data as any)
            console.log('Bloques stored offline for future use')
            return sortBloques(data as any)
        } catch (error) {
            console.error('Network error during bloques fetch:', error)
            return []
        }
    },

    // Get all bloques
    async getAllBloques(): Promise<Bloque[]> {
        console.log('Getting all bloques...')

        try {
            const offlineBloques = await db.bloque.toArray()
            if (offlineBloques.length > 0) {
                console.log('All bloques found offline:', offlineBloques)
                return sortBloques(offlineBloques)
            }
        } catch (error) {
            console.error('Offline bloques error:', error)
        }

        if (!navigator.onLine) {
            return []
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.bloque)
                .select('*')

            if (error || !data) {
                console.error('Online bloques error:', error)
                return []
            }
            await db.bloque.bulkPut(data as any)
            return sortBloques(data as any)
        } catch (error) {
            console.error('Network error during bloques fetch:', error)
            return []
        }
    },

    // Sync bloques from Supabase
    async syncBloques(): Promise<void> {
        try {
            console.log('Starting bloques sync...')
            const { data, error } = await supabase.from(TABLES.bloque).select('*')
            if (error) throw error
            if (data && Array.isArray(data)) {
                await db.bloque.bulkPut(data as any)
                console.log(`Updated ${data.length} bloque records`)
            }
            console.log('Bloques sync completed')
        } catch (error) {
            console.error('Error during bloques sync:', error)
        }
    },

    // Get bloque by ID
    async getBloqueById(id_bloque: number): Promise<Bloque | null> {
        try {
            // Try offline first
            const offlineBloque = await db.bloque.get(id_bloque)
            if (offlineBloque) return offlineBloque as any

            // If not found offline and we're online, try online
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from(TABLES.bloque)
                    .select('*')
                    .eq('id_bloque', id_bloque)
                    .single()

                if (!error && data) {
                    await db.bloque.put(data as any)
                    return data as any
                }
            }

            return null
        } catch (error) {
            console.error('Error getting bloque by ID:', error)
            return null
        }
    }
}
// Natural sort by nombre (numeric-aware). Fallback to id_bloque when nombre missing.
function sortBloques(list: Bloque[]): Bloque[] {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    return [...list].sort((a, b) =>
        collator.compare(String(a.nombre ?? a.id_bloque), String(b.nombre ?? b.id_bloque))
    )
}
