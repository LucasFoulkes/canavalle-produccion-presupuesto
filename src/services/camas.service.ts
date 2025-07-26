import { db } from '@/lib/dexie'
import { Cama } from '@/types/database'
import { supabase } from '@/lib/supabase'

export type { Cama }

class CamasService {
    /**
     * Get all camas for a specific bloque
     */
    async getCamasByBloqueId(bloqueId: number): Promise<Cama[]> {
        try {
            console.log('Loading camas for bloque:', bloqueId)

            // Try to get from local database first
            const localCamas = await db.camas.where('bloque_id').equals(bloqueId).toArray()
            console.log('Local camas found:', localCamas.length)

            if (localCamas.length > 0) {
                return localCamas
            }

            // If no local data, try to fetch from Supabase
            const { data: remoteCamas, error } = await supabase
                .from('camas')
                .select('*')
                .eq('bloque_id', bloqueId)

            if (error) {
                console.error('Error fetching camas from Supabase:', error)
                return localCamas // Return local data even if empty
            }

            console.log('Remote camas fetched:', remoteCamas?.length || 0)

            // Store in local database
            if (remoteCamas && remoteCamas.length > 0) {
                await db.camas.bulkPut(remoteCamas)
                return remoteCamas
            }

            return localCamas
        } catch (error) {
            console.error('Error in getCamasByBloqueId:', error)

            // Fallback to local data
            const localCamas = await db.camas.where('bloque_id').equals(bloqueId).toArray()
            return localCamas
        }
    }

    async upsertCama(cama: Omit<Cama, 'id'> & { id?: number }): Promise<Cama> {
        try {
            // Check if exists in Supabase
            const { data: existing, error: queryError } = await supabase
                .from('camas')
                .select('*')
                .eq('bloque_id', cama.bloque_id)
                .eq('nombre', cama.nombre)
                .maybeSingle()

            if (queryError) {
                console.error('Error checking existing cama in Supabase:', queryError)
                throw queryError
            }

            let result;
            if (existing) {
                // Update existing
                const { data: updated, error: updateError } = await supabase
                    .from('camas')
                    .update({
                        variedad_id: cama.variedad_id,
                        area: cama.area
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()

                if (updateError) {
                    console.error('Error updating cama in Supabase:', updateError)
                    throw updateError
                }
                result = updated
            } else {
                // Insert new
                const { data: inserted, error: insertError } = await supabase
                    .from('camas')
                    .insert(cama)
                    .select()
                    .single()

                if (insertError) {
                    console.error('Error inserting cama in Supabase:', insertError)
                    throw insertError
                }
                result = inserted
            }

            // Sync to local Dexie (put will create or update)
            await db.camas.put(result)

            console.log('Cama processed successfully:', result)
            return result
        } catch (error) {
            console.error('Error in upsertCama:', error)
            throw error
        }
    }

    /**
     * Get all camas from local database
     */
    async getAllCamas(): Promise<Cama[]> {
        try {
            return await db.camas.toArray()
        } catch (error) {
            console.error('Error getting all camas:', error)
            return []
        }
    }

    /**
     * Get a specific cama by ID
     */
    async getCamaById(id: number): Promise<Cama | undefined> {
        try {
            return await db.camas.get(id)
        } catch (error) {
            console.error('Error getting cama by ID:', error)
            return undefined
        }
    }

    /**
     * Sync camas from Supabase
     */
    async syncCamas(): Promise<void> {
        try {
            console.log('Syncing camas from Supabase...')

            const { data: remoteCamas, error } = await supabase
                .from('camas')
                .select('*')

            if (error) {
                console.error('Error syncing camas:', error)
                return
            }

            if (remoteCamas && remoteCamas.length > 0) {
                await db.camas.clear()
                await db.camas.bulkAdd(remoteCamas)
                console.log('Camas synced successfully:', remoteCamas.length)
            }
        } catch (error) {
            console.error('Error in syncCamas:', error)
        }
    }
}

export const camasService = new CamasService()