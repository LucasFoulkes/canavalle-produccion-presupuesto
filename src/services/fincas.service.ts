import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'
import { Finca } from '@/types/database'

export type { Finca }

export const fincasService = {
    // Get all fincas, trying offline first
    async getAllFincas(): Promise<Finca[]> {
        console.log('Getting all fincas...')

        // 1. Always try offline first
        try {
            const offlineFincas = await db.finca.toArray()
            if (offlineFincas.length > 0) {
                console.log('Fincas found offline:', offlineFincas)
                return offlineFincas
            }
            console.log('No fincas found offline, checking online...')
        } catch (error) {
            console.error('Offline fincas error:', error)
        }

        // 2. If not found offline and we're online, try online
        if (!navigator.onLine) {
            console.log('Offline and no fincas found locally')
            return []
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.finca)
                .select('*')

            if (error || !data) {
                console.error('Online fincas error:', error)
                return []
            }

            // 3. Store in Dexie for offline use
            await db.finca.bulkPut(data)
            console.log('Fincas stored offline for future use')

            return data
        } catch (error) {
            console.error('Network error during fincas fetch:', error)
            return []
        }
    },

    // Sync fincas from Supabase
    async syncFincas(): Promise<void> {
        try {
            console.log('Starting fincas sync...')
            const { data, error } = await supabase.from(TABLES.finca).select('*')
            if (error) throw error
            if (data && Array.isArray(data)) {
                if (db.tables.some(table => table.name === 'finca')) {
                    await db.finca.bulkPut(data)
                    console.log(`Updated ${data.length} finca records`)
                } else {
                    console.warn('finca table not defined in Dexie schema, skipping sync')
                }
            }
            console.log('Fincas sync completed')
        } catch (error) {
            console.error('Error during fincas sync:', error)
        }
    },

    // Get finca by ID
    async getFincaById(id: number): Promise<Finca | null> {
        try {
            // Try offline first
            const offlineFinca = await db.finca.where('id').equals(id).first()
            if (offlineFinca) {
                return offlineFinca
            }

            // If not found offline and we're online, try online
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from(TABLES.finca)
                    .select('*')
                    .eq('id', id)
                    .single()

                if (!error && data) {
                    await db.finca.put(data)
                    return data
                }
            }

            return null
        } catch (error) {
            console.error('Error getting finca by ID:', error)
            return null
        }
    }
}
