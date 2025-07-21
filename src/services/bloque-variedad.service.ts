import { db } from '@/lib/dexie'
import { supabase } from '@/lib/supabase'
import { BloqueVariedad, Variedad } from '@/types/database'

export type { BloqueVariedad }

export interface BloqueVariedadWithVariedad extends BloqueVariedad {
    variedad?: Variedad
}

export const bloqueVariedadService = {
    // Get varieties assigned to a specific bloque
    async getVariedadesByBloque(bloqueId: number): Promise<BloqueVariedadWithVariedad[]> {
        try {
            console.log('Getting varieties for bloque:', bloqueId)

            // First, try to get from local database
            let bloqueVariedadRecords = await db.bloqueVariedades
                .where('bloque_id')
                .equals(bloqueId)
                .toArray()

            console.log('Found local bloque_variedad records:', bloqueVariedadRecords)

            // If no local data, try to fetch from Supabase
            if (bloqueVariedadRecords.length === 0) {
                console.log('No local data, fetching from Supabase...')
                await this.syncBloqueVariedadesFromServer(bloqueId)

                // Try again after sync
                bloqueVariedadRecords = await db.bloqueVariedades
                    .where('bloque_id')
                    .equals(bloqueId)
                    .toArray()

                console.log('Found bloque_variedad records after sync:', bloqueVariedadRecords)
            }

            if (bloqueVariedadRecords.length === 0) {
                return []
            }

            // Then get the variety details for each record
            const result: BloqueVariedadWithVariedad[] = []

            for (const record of bloqueVariedadRecords) {
                let variedad = await db.variedades.get(record.variedad_id)

                // If variety not found locally, try to fetch from server
                if (!variedad) {
                    console.log('Variety not found locally, fetching from server:', record.variedad_id)
                    await this.syncVariedadFromServer(record.variedad_id)
                    variedad = await db.variedades.get(record.variedad_id)
                }

                console.log('Found variedad:', variedad, 'for variedad_id:', record.variedad_id)

                result.push({
                    id: record.id,
                    bloque_id: record.bloque_id,
                    variedad_id: record.variedad_id,
                    variedad: variedad
                })
            }

            console.log('Final result:', result)
            return result
        } catch (error) {
            console.error('Error getting varieties for bloque:', error)
            return []
        }
    },

    // Check if a bloque has any varieties assigned
    async hasVariedades(bloqueId: number): Promise<boolean> {
        try {
            const count = await db.bloqueVariedades.where('bloque_id').equals(bloqueId).count()
            return count > 0
        } catch (error) {
            console.error('Error checking if bloque has varieties:', error)
            return false
        }
    },

    // Get all varieties available in the system
    async getAllVariedades(): Promise<Variedad[]> {
        try {
            return await db.variedades.toArray()
        } catch (error) {
            console.error('Error getting all varieties:', error)
            return []
        }
    },

    // Debug method to check what data exists
    async debugData(): Promise<void> {
        try {
            const allBloqueVariedades = await db.bloqueVariedades.toArray()
            const allVariedades = await db.variedades.toArray()

            console.log('All bloque_variedad records:', allBloqueVariedades)
            console.log('All variedad records:', allVariedades)
        } catch (error) {
            console.error('Error debugging data:', error)
        }
    },

    // Method to add test data (for development)
    async addTestData(bloqueId: number): Promise<void> {
        try {
            // First, add some test varieties if they don't exist
            const testVariedades = ['Tomate Cherry', 'Lechuga', 'Pepino']

            for (const nombreVariedad of testVariedades) {
                let variedad = await db.variedades.where('nombre').equals(nombreVariedad).first()

                if (!variedad) {
                    const id = await db.variedades.add({ nombre: nombreVariedad } as Variedad)
                    variedad = { id, nombre: nombreVariedad } as Variedad
                }

                // Check if this bloque-variedad relationship already exists
                const existing = await db.bloqueVariedades
                    .where('bloque_id').equals(bloqueId)
                    .and(record => record.variedad_id === variedad!.id)
                    .first()

                if (!existing) {
                    await db.bloqueVariedades.add({
                        bloque_id: bloqueId,
                        variedad_id: variedad.id
                    } as BloqueVariedad)
                }
            }

            console.log('Test data added for bloque:', bloqueId)
        } catch (error) {
            console.error('Error adding test data:', error)
        }
    },

    // Sync bloque_variedad data from server for a specific bloque
    async syncBloqueVariedadesFromServer(bloqueId: number): Promise<void> {
        try {
            console.log('Syncing bloque_variedad from server for bloque:', bloqueId)

            const { data, error } = await supabase
                .from('bloque_variedad')
                .select('*')
                .eq('bloque_id', bloqueId)

            if (error) {
                console.error('Error fetching bloque_variedad from server:', error)
                return
            }

            if (data && data.length > 0) {
                console.log('Fetched bloque_variedad data from server:', data)

                // Store in local database
                for (const record of data) {
                    await db.bloqueVariedades.put({
                        id: record.id,
                        bloque_id: record.bloque_id,
                        variedad_id: record.variedad_id
                    })
                }

                console.log('Stored bloque_variedad data locally')
            }
        } catch (error) {
            console.error('Error syncing bloque_variedad from server:', error)
        }
    },

    // Sync a specific variety from server
    async syncVariedadFromServer(variedadId: number): Promise<void> {
        try {
            console.log('Syncing variedad from server:', variedadId)

            const { data, error } = await supabase
                .from('variedades')
                .select('*')
                .eq('id', variedadId)
                .single()

            if (error) {
                console.error('Error fetching variedad from server:', error)
                return
            }

            if (data) {
                console.log('Fetched variedad data from server:', data)

                // Store in local database
                await db.variedades.put({
                    id: data.id,
                    nombre: data.nombre
                })

                console.log('Stored variedad data locally')
            }
        } catch (error) {
            console.error('Error syncing variedad from server:', error)
        }
    }
}