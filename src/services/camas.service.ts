import { db, TABLES } from '@/lib/dexie'
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
            // Support Spanish schema where foreign key field may be id_bloque. Dexie index is on bloque_id, but we may
            // have stored records where normalization already copied id_bloque -> bloque_id. Query bloque_id only.
            const localCamasRaw = await db.cama.where('bloque_id').equals(bloqueId).toArray()
            const localCamas = localCamasRaw.map(normalizeCama)
            console.log('Local camas found (normalized):', localCamas.length)

            if (localCamas.length > 0) {
                return localCamas.filter(c => !c.deleted_at)
            }

            // If no local data, try to fetch from Supabase
            let { data: remoteCamas, error } = await supabase
                .from('cama')
                .select('*')
                .eq('id_bloque', bloqueId)

            if (error && (error as any).code === '42703') {
                console.warn('id_bloque column missing remotely, falling back to bloque_id')
                    ; ({ data: remoteCamas, error } = await supabase
                        .from('cama')
                        .select('*')
                        .eq('bloque_id', bloqueId))
            }

            if (error) {
                console.error('Error fetching camas from Supabase:', error)
                return localCamas // Return local data even if empty
            }

            console.log('Remote camas fetched (raw):', remoteCamas?.length || 0)

            if (remoteCamas && remoteCamas.length > 0) {
                const normalized = remoteCamas.map(normalizeCama).filter(c => !c.deleted_at)
                await db.cama.bulkPut(normalized)
                console.log('Stored normalized remote camas:', normalized.length, 'Sample:', normalized[0])
                return normalized
            }

            return localCamas
        } catch (error) {
            console.error('Error in getCamasByBloqueId:', error)

            // Fallback to local data
            const localCamas = await db.cama.where('bloque_id').equals(bloqueId).toArray()
            return localCamas.map(normalizeCama).filter(c => !c.deleted_at)
        }
    }

    async upsertCama(cama: Omit<Cama, 'id'> & { id?: number }): Promise<Cama> {
        try {
            // Check if exists in Supabase
            const { data: existing, error: queryError } = await supabase
                .from(TABLES.cama)
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
                    .from(TABLES.cama)
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
                    .from(TABLES.cama)
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
            await db.cama.put(result)

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
            const all = await db.cama.toArray()
            return all.map(normalizeCama).filter(c => !c.deleted_at)
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
            const c = await db.cama.get(id)
            return c ? normalizeCama(c) : undefined
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
                .from(TABLES.cama)
                .select('*')

            if (error) {
                console.error('Error syncing camas:', error)
                return
            }

            if (remoteCamas && remoteCamas.length > 0) {
                const normalized = remoteCamas.map(normalizeCama).filter(c => !c.deleted_at)
                await db.cama.clear()
                await db.cama.bulkAdd(normalized)
                console.log('Camas synced successfully (normalized):', normalized.length)
            }
        } catch (error) {
            console.error('Error in syncCamas:', error)
        }
    }

    /**
     * Delete multiple camas by their IDs (used for deleting a grouped range).
     * Attempts remote deletion first when online, then removes from local Dexie.
     */
    async deleteCamasByIds(ids: number[]): Promise<void> {
        if (!ids.length) return
        try {
            if (navigator.onLine) {
                const { error } = await supabase.from(TABLES.cama).delete().in('id', ids)
                if (error) {
                    console.error('Error deleting camas remotely:', error)
                }
            }
        } catch (err) {
            console.error('Remote delete attempt failed:', err)
        }
        try {
            await db.cama.bulkDelete(ids)
            console.log('Deleted camas locally:', ids.length)
        } catch (err) {
            console.error('Local delete failed:', err)
            throw err
        }
    }
}

export const camasService = new CamasService()

function normalizeCama(raw: any): Cama {
    const c: any = { ...raw }
    if ((c.id === undefined || c.id === null) && c.cama_id != null) c.id = c.cama_id
    if ((c.bloque_id == null) && c.id_bloque != null) c.bloque_id = c.id_bloque
    if (typeof c.id === 'string' && /^\d+$/.test(c.id)) c.id = Number(c.id)
    if (typeof c.bloque_id === 'string' && /^\d+$/.test(c.bloque_id)) c.bloque_id = Number(c.bloque_id)
    if (c.area == null && c.area_m2 != null) c.area = c.area_m2
    return c
}