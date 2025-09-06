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
            const offlineBloquesRaw = await db.bloque.where('finca_id').equals(fincaId).toArray()
            const offlineBloques = offlineBloquesRaw.map(normalizeBloque)
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
            let { data, error } = await supabase
                .from(TABLES.bloque)
                .select('*')
                .eq('id_finca', fincaId)

            if (error && (error as any).code === '42703') {
                console.warn('id_finca column missing remotely, falling back to finca_id')
                    ; ({ data, error } = await supabase
                        .from(TABLES.bloque)
                        .select('*')
                        .eq('finca_id', fincaId))
            }

            if (error || !data) {
                console.error('Online bloques error:', error)
                return []
            }
            const normalized = data.map(normalizeBloque)
            await db.bloque.bulkPut(normalized)
            console.log('Bloques stored offline for future use')
            return sortBloques(normalized)
        } catch (error) {
            console.error('Network error during bloques fetch:', error)
            return []
        }
    },

    // Get all bloques
    async getAllBloques(): Promise<Bloque[]> {
        console.log('Getting all bloques...')

        try {
            const offlineBloquesRaw = await db.bloque.toArray()
            const offlineBloques = offlineBloquesRaw.map(normalizeBloque)
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
            const normalized = data.map(normalizeBloque)
            await db.bloque.bulkPut(normalized)
            return sortBloques(normalized)
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
                if (db.tables.some(table => table.name === 'bloque')) {
                    const normalized = data.map(normalizeBloque)
                    await db.bloque.bulkPut(normalized)
                    console.log(`Updated ${normalized.length} bloque records (normalized)`)
                } else {
                    console.warn('bloque table not defined in Dexie schema, skipping sync')
                }
            }
            console.log('Bloques sync completed')
        } catch (error) {
            console.error('Error during bloques sync:', error)
        }
    },

    // Get bloque by ID
    async getBloqueById(id: number): Promise<Bloque | null> {
        try {
            // Try offline first
            const offlineBloqueRaw = await db.bloque.where('id').equals(id).first()
            if (offlineBloqueRaw) {
                return normalizeBloque(offlineBloqueRaw as Bloque)
            }

            // If not found offline and we're online, try online
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from(TABLES.bloque)
                    .select('*')
                    .eq('id', id)
                    .single()

                if (!error && data) {
                    const norm = normalizeBloque(data as Bloque)
                    await db.bloque.put(norm)
                    return norm
                }
            }

            return null
        } catch (error) {
            console.error('Error getting bloque by ID:', error)
            return null
        }
    }
}

// Helper: normalize bloque shape
function normalizeBloque(raw: any): Bloque {
    const b: any = { ...raw }
    if ((b.id === undefined || b.id === null) && b.bloque_id != null) b.id = b.bloque_id
    if (typeof b.id === 'string' && /^\d+$/.test(b.id)) b.id = Number(b.id)
    // Spanish schema uses id_finca; canonical is finca_id in code. Copy if needed.
    if ((b.finca_id == null) && b.id_finca != null) b.finca_id = b.id_finca
    if (typeof b.finca_id === 'string' && /^\d+$/.test(b.finca_id)) b.finca_id = Number(b.finca_id)
    if (!b.codigo && b.nombre != null) b.codigo = String(b.nombre)
    return b
}

// Natural sort similar to UI requirement (e.g., 3, 3a, 3b, 4)
function sortBloques(list: Bloque[]): Bloque[] {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    return [...list].sort((a, b) => collator.compare(a.codigo || String(a.id), b.codigo || String(b.id)))
}
