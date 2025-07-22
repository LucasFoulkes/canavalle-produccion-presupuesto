import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'

export const syncService = {
    // Sync all data after successful login
    async syncAllData(): Promise<void> {
        try {
            console.log('Starting full data sync...')

            // Fetch all data in parallel
            const [
                fincasResult,
                bloquesResult,
                variedadesResult,
                accionesResult,
                camasResult,
                bloqueVariedadResult,
                estadosFenologicosResult
            ] = await Promise.allSettled([
                supabase.from('fincas').select('*'),
                supabase.from('bloques').select('*'),
                supabase.from('variedades').select('*'),
                supabase.from('acciones').select('*'),
                supabase.from('camas').select('*'),
                supabase.from('bloque_variedad').select('*'),
                supabase.from('estados_fenologicos').select('*')
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

            // Process and store camas
            if (camasResult.status === 'fulfilled' && !camasResult.value.error) {
                const camas = camasResult.value.data || []
                if (camas.length > 0) {
                    await db.camas.bulkPut(camas) // Uses upsert - updates existing, inserts new
                    console.log(`Synced ${camas.length} camas`)
                }
            }

            // Process and store bloque_variedad
            if (bloqueVariedadResult.status === 'fulfilled' && !bloqueVariedadResult.value.error) {
                const bloqueVariedades = bloqueVariedadResult.value.data || []
                if (bloqueVariedades.length > 0) {
                    await db.bloqueVariedades.bulkPut(bloqueVariedades) // Uses upsert - updates existing, inserts new
                    console.log(`Synced ${bloqueVariedades.length} bloque_variedad records`)
                }
            }

            // Process and store estados_fenologicos
            if (estadosFenologicosResult.status === 'fulfilled' && !estadosFenologicosResult.value.error) {
                const estadosFenologicos = estadosFenologicosResult.value.data || []
                if (estadosFenologicos.length > 0) {
                    // Check if the table exists in the schema
                    if (db.tables.some(table => table.name === 'estadosFenologicos')) {
                        await db.table('estadosFenologicos').bulkPut(estadosFenologicos)
                        console.log(`Synced ${estadosFenologicos.length} estados fenologicos records`)
                    } else {
                        console.warn('Estados fenologicos table not defined in Dexie schema, skipping sync')
                    }
                }
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
    },

    // Try to update bloque_variedad data
    async tryUpdateBloqueVariedades() {
        try {
            const { data, error } = await supabase.from('bloque_variedad').select('*')
            if (error) throw error

            const bloqueVariedades = data || []
            if (bloqueVariedades.length > 0) {
                await db.bloqueVariedades.bulkPut(bloqueVariedades) // Uses upsert - no duplicates
                console.log(`Updated ${bloqueVariedades.length} bloque_variedad records`)
            }
            return bloqueVariedades
        } catch (error) {
            console.warn('Failed to update bloque_variedad, using offline data:', error)
            return await db.bloqueVariedades.toArray()
        }
    },

    // Try to update estados_fenologicos data
    async tryUpdateEstadosFenologicos() {
        try {
            const { data, error } = await supabase.from('estados_fenologicos').select('*')
            if (error) throw error

            const estadosFenologicos = data || []
            if (estadosFenologicos.length > 0) {
                // Check if the table exists in the schema
                if (db.tables.some(table => table.name === 'estadosFenologicos')) {
                    await db.table('estadosFenologicos').bulkPut(estadosFenologicos)
                    console.log(`Updated ${estadosFenologicos.length} estados fenologicos records`)
                    return estadosFenologicos
                } else {
                    console.warn('Estados fenologicos table not defined in Dexie schema, skipping sync')
                    return []
                }
            }
            return estadosFenologicos
        } catch (error) {
            console.warn('Failed to update estados_fenologicos, using offline data:', error)
            if (db.tables.some(table => table.name === 'estadosFenologicos')) {
                return await db.table('estadosFenologicos').toArray()
            }
            return []
        }
    }
}
