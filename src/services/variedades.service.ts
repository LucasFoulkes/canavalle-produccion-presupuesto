import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'
import { Variedad } from '@/types/database'

export type { Variedad }

export const variedadesService = {
    // Get all variedades, trying offline first
    async getAllVariedades(): Promise<Variedad[]> {
        console.log('Getting all variedades')

        // 1. Always try offline first
        try {
            const offlineVariedades = await db.variedades.toArray()
            if (offlineVariedades.length > 0) {
                console.log('Variedades found offline:', offlineVariedades)
                // Trigger background sync if online
                if (navigator.onLine) {
                    this.syncVariedades().catch(err => console.log('Background variedades sync failed:', err))
                }
                return offlineVariedades
            }
            console.log('No variedades found offline, checking online...')
        } catch (error) {
            console.error('Offline variedades error:', error)
        }

        // 2. If not found offline and we're online, try online
        if (!navigator.onLine) {
            console.log('Offline and no variedades found locally')
            return []
        }

        try {
            const { data, error } = await supabase
                .from('variedades')
                .select('*')

            if (error || !data) {
                console.error('Online variedades error:', error)
                return []
            }

            // 3. Store in Dexie for offline use
            await db.variedades.bulkPut(data)
            console.log('Variedades stored offline for future use')

            return data
        } catch (error) {
            console.error('Error fetching variedades:', error)
            return []
        }
    },

    // Sync variedades with Supabase
    async syncVariedades(): Promise<void> {
        if (!navigator.onLine) {
            console.log('Offline, skipping variedades sync')
            return
        }

        try {
            console.log('Syncing variedades...')

            const { data, error } = await supabase
                .from('variedades')
                .select('*')

            if (error) {
                console.error('Variedades sync error:', error)
                return
            }

            if (data && data.length > 0) {
                await db.variedades.bulkPut(data)
                console.log(`Synced ${data.length} variedades`)
            }
        } catch (error) {
            console.error('Error syncing variedades:', error)
        }
    },

    // Get variedad by ID
    async getVariedadById(id: number): Promise<Variedad | null> {
        try {
            // Try offline first
            const offlineVariedad = await db.variedades.get(id)
            if (offlineVariedad) {
                return offlineVariedad
            }

            // If not found offline and online, try online
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from('variedades')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (!error && data) {
                    // Store for offline use
                    await db.variedades.put(data)
                    return data
                }
            }

            return null
        } catch (error) {
            console.error('Error getting variedad by ID:', error)
            return null
        }
    }
}
