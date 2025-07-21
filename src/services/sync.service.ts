import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'

export const syncService = {
    // Sync all data after successful login
    async syncAllData(): Promise<void> {
        try {
            console.log('Starting full data sync...')

            // Fetch all data in parallel
            const [fincasResult, bloquesResult, variedadesResult, accionesResult, camasResult] = await Promise.allSettled([
                supabase.from('fincas').select('*'),
                supabase.from('bloques').select('*'),
                supabase.from('variedades').select('*'),
                supabase.from('acciones').select('*'),
                supabase.from('camas').select('*')
            ])

            // Process and store fincas
            if (fincasResult.status === 'fulfilled' && !fincasResult.value.error) {
                const fincas = fincasResult.value.data || []
                if (fincas.length > 0) {
                    await db.fincas.bulkPut(fincas) // Uses upsert - updates existing, inserts new
                    console.log(`Synced ${fincas.length} fincas`)
                }
            }

            // Process and store bloques
            if (bloquesResult.status === 'fulfilled' && !bloquesResult.value.error) {
                const bloques = bloquesResult.value.data || []
                if (bloques.length > 0) {
                    await db.bloques.bulkPut(bloques) // Uses upsert - updates existing, inserts new
                    console.log(`Synced ${bloques.length} bloques`)
                }
            }

            // Process and store variedades
            if (variedadesResult.status === 'fulfilled' && !variedadesResult.value.error) {
                const variedades = variedadesResult.value.data || []
                if (variedades.length > 0) {
                    await db.variedades.bulkPut(variedades) // Uses upsert - updates existing, inserts new
                    console.log(`Synced ${variedades.length} variedades`)
                }
            }

            // Process and store acciones
            if (accionesResult.status === 'fulfilled' && !accionesResult.value.error) {
                const acciones = accionesResult.value.data || []
                if (acciones.length > 0) {
                    await db.acciones.bulkPut(acciones) // Uses upsert - updates existing, inserts new
                    console.log(`Synced ${acciones.length} acciones`)
                }
            }

            // Skip cama syncing in general sync - let cama assignment service handle it exclusively
            // This prevents conflicts between assignment sync and general sync that cause duplicates
            if (camasResult.status === 'fulfilled' && !camasResult.value.error) {
                const serverCamas = camasResult.value.data || []
                console.log(`Skipping general sync of ${serverCamas.length} camas - handled by cama assignment service`)
            }

            console.log('Full data sync completed')
        } catch (error) {
            console.error('Error during full data sync:', error)
            // Don't throw - we want the app to continue with offline data
        }
    },

    // Try to update fincas data
    async tryUpdateFincas() {
        try {
            const { data, error } = await supabase.from('fincas').select('*')
            if (error) throw error

            const fincas = data || []
            if (fincas.length > 0) {
                await db.fincas.bulkPut(fincas) // Uses upsert - no duplicates
                console.log(`Updated ${fincas.length} fincas`)
            }
            return fincas
        } catch (error) {
            console.warn('Failed to update fincas, using offline data:', error)
            return await db.fincas.toArray()
        }
    },

    // Try to update bloques data
    async tryUpdateBloques() {
        try {
            const { data, error } = await supabase.from('bloques').select('*')
            if (error) throw error

            const bloques = data || []
            if (bloques.length > 0) {
                await db.bloques.bulkPut(bloques) // Uses upsert - no duplicates
                console.log(`Updated ${bloques.length} bloques`)
            }
            return bloques
        } catch (error) {
            console.warn('Failed to update bloques, using offline data:', error)
            return await db.bloques.toArray()
        }
    },

    // Try to update camas data
    async tryUpdateCamas() {
        try {
            const { data, error } = await supabase.from('camas').select('*')
            if (error) throw error

            const camas = data || []
            if (camas.length > 0) {
                await db.camas.bulkPut(camas) // Uses upsert - no duplicates
                console.log(`Updated ${camas.length} camas`)
            }
            return camas
        } catch (error) {
            console.warn('Failed to update camas, using offline data:', error)
            return await db.camas.toArray()
        }
    }
}
