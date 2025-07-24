import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'
import { Bloque } from '@/types/database'

export type { Bloque }

export const bloquesService = {
    // Get bloques by finca ID, trying offline first
    async getBloquesByFincaId(fincaId: number): Promise<Bloque[]> {
        console.log('Getting bloques for finca:', fincaId)

        // 1. Always try offline first
        try {
            const offlineBloques = await db.bloques.where('finca_id').equals(fincaId).toArray()
            if (offlineBloques.length > 0) {
                console.log('Bloques found offline:', offlineBloques)
                // Trigger background sync if online
                if (navigator.onLine) {
                    this.syncBloques().catch(err => console.log('Background bloques sync failed:', err))
                }
                return offlineBloques
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
            const { data, error } = await supabase
                .from('bloques')
                .select('*')
                .eq('finca_id', fincaId)

            if (error || !data) {
                console.error('Online bloques error:', error)
                return []
            }

            // 3. Store in Dexie for offline use
            await db.bloques.bulkPut(data)
            console.log('Bloques stored offline for future use')

            return data
        } catch (error) {
            console.error('Network error during bloques fetch:', error)
            return []
        }
    },

    // Get all bloques
    async getAllBloques(): Promise<Bloque[]> {
        console.log('Getting all bloques...')

        try {
            const offlineBloques = await db.bloques.toArray()
            if (offlineBloques.length > 0) {
                console.log('All bloques found offline:', offlineBloques)
                if (navigator.onLine) {
                    this.syncBloques().catch(err => console.log('Background bloques sync failed:', err))
                }
                return offlineBloques
            }
        } catch (error) {
            console.error('Offline bloques error:', error)
        }

        if (!navigator.onLine) {
            return []
        }

        try {
            const { data, error } = await supabase
                .from('bloques')
                .select('*')

            if (error || !data) {
                console.error('Online bloques error:', error)
                return []
            }

            await db.bloques.bulkPut(data)
            return data
        } catch (error) {
            console.error('Network error during bloques fetch:', error)
            return []
        }
    },

    // Sync bloques from Supabase
    async syncBloques(): Promise<void> {
        try {
            console.log('Starting bloques sync...')
            const { data, error } = await supabase.from('bloques').select('*')
            if (error) throw error
            if (data && Array.isArray(data)) {
                if (db.tables.some(table => table.name === 'bloques')) {
                    await db.bloques.bulkPut(data)
                    console.log(`Updated ${data.length} bloques records`)
                } else {
                    console.warn('bloques table not defined in Dexie schema, skipping sync')
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
            const offlineBloque = await db.bloques.where('id').equals(id).first()
            if (offlineBloque) {
                return offlineBloque
            }

            // If not found offline and we're online, try online
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from('bloques')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (!error && data) {
                    await db.bloques.put(data)
                    return data
                }
            }

            return null
        } catch (error) {
            console.error('Error getting bloque by ID:', error)
            return null
        }
    }
}
