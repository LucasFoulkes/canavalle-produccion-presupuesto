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

            // Resolve grupos for this bloque (prefer grupo_cama; fallback legacy grupoPlantacion)
            const hasGrupoCama = db.tables.some(t => t.name === TABLES.grupoCama)
            if (hasGrupoCama && !(db as any).grupoCama) {
                (db as any).grupoCama = db.table(TABLES.grupoCama)
            }
            const localGrupos = hasGrupoCama
                ? await (db as any).grupoCama.where('id_bloque').equals(bloqueId).toArray()
                : (db as any).grupoPlantacion
                    ? await (db as any).grupoPlantacion.where('bloque_id').equals(bloqueId).toArray()
                    : []
            const grupoIds = localGrupos.filter((g: any) => !g.eliminado_en).map((g: any) => g.id_grupo).filter(Boolean)

            // Try to get from local camas by grupo_id if any grupos available
            let localCamas: Cama[] = []
            if (grupoIds.length) {
                // Dexie doesn't index grupo_id by default; use filter as fallback
                const allLocal = await db.cama.toArray()
                localCamas = allLocal.filter((c: any) => c.id_grupo != null && grupoIds.includes(c.id_grupo)) as any
            } else {
                // Legacy fallback removed; camas belong to grupos
                localCamas = []
            }
            console.log('Local camas found (normalized):', localCamas.length)

            if (localCamas.length > 0) {
                return localCamas.filter((c: any) => !c.eliminado_en) as any
            }

            // If no local data, try to fetch remote: first grupos, then camas by those grupos
            let remoteGrupos = localGrupos
            if (!remoteGrupos.length) {
                const { data: rg, error: rgErr } = await supabase.from(TABLES.grupoCama).select('*').eq('id_bloque', bloqueId)
                if (rgErr) {
                    console.warn('Error fetching grupos for bloque, skipping to legacy cama by bloque:', rgErr)
                } else if (rg) {
                    remoteGrupos = rg
                    if (hasGrupoCama) await (db as any).grupoCama.bulkPut(rg)
                }
            }
            const remoteGrupoIds = (remoteGrupos || []).map((g: any) => g.id_grupo).filter(Boolean)

            let remoteCamas: any[] | null = null
            let error: any | null = null
            if (remoteGrupoIds.length) {
                const { data, error: rcErr } = await supabase.from(TABLES.cama).select('*').in('id_grupo', remoteGrupoIds as number[])
                remoteCamas = data ?? null
                error = rcErr ?? null
            } else {
                remoteCamas = []
                error = null
            }

            if (error) {
                console.error('Error fetching camas from Supabase:', error)
                return localCamas // Return local data even if empty
            }

            console.log('Remote camas fetched (raw):', remoteCamas?.length || 0)

            if (remoteCamas && remoteCamas.length > 0) {
                const filtered = (remoteCamas as any[]).filter(c => !c.eliminado_en)
                await db.cama.bulkPut(filtered as any)
                console.log('Stored remote camas:', filtered.length, 'Sample:', filtered[0])
                return filtered as any
            }

            return localCamas
        } catch (error) {
            console.error('Error in getCamasByBloqueId:', error)

            // Fallback to local data by grupo if possible, else by legacy bloque_id
            try {
                const hasGrupoCama = db.tables.some(t => t.name === TABLES.grupoCama)
                const localGrupos = hasGrupoCama && (db as any).grupoCama
                    ? await (db as any).grupoCama.where('id_bloque').equals(bloqueId).toArray()
                    : []
                const grupoIds = localGrupos.filter((g: any) => !g.eliminado_en).map((g: any) => g.id_grupo).filter(Boolean)
                if (grupoIds.length) {
                    const allLocal = await db.cama.toArray()
                    return allLocal.filter((c: any) => !c.eliminado_en && c.id_grupo != null && grupoIds.includes(c.id_grupo)) as any
                }
            } catch { }
            return []
        }
    }

    async upsertCama(cama: Partial<Cama> & { id_cama?: number }): Promise<Cama> {
        try {
            // Check if exists in Supabase
            // Prefer uniqueness by (grupo_id, nombre). Fallback to (bloque_id, nombre) for legacy datasets.
            let existing: any = null
            let queryError: any = null
            if (cama.id_grupo != null) {
                const { data, error } = await supabase
                    .from(TABLES.cama)
                    .select('*')
                    .eq('id_grupo', cama.id_grupo)
                    .eq('nombre', cama.nombre)
                    .maybeSingle()
                existing = data; queryError = error
            } else {
                // Last resort: by nombre only (should not happen)
                const { data, error } = await supabase
                    .from(TABLES.cama)
                    .select('*')
                    .eq('nombre', cama.nombre)
                    .maybeSingle()
                existing = data; queryError = error
            }

            if (queryError) {
                console.error('Error checking existing cama in Supabase:', queryError)
                throw queryError
            }

            let result;
            if (existing) {
                // Update existing
                const patch: any = {}
                if (cama.nombre !== undefined) patch.nombre = cama.nombre
                if (cama.id_grupo !== undefined) patch.id_grupo = cama.id_grupo
                if (cama.largo_metros !== undefined) patch.largo_metros = cama.largo_metros
                if (cama.ancho_metros !== undefined) patch.ancho_metros = cama.ancho_metros
                if (cama.plantas_totales !== undefined) patch.plantas_totales = cama.plantas_totales

                const { data: updated, error: updateError } = await supabase
                    .from(TABLES.cama)
                    .update(patch)
                    .eq('id_cama', existing.id_cama ?? existing.id)
                    .select('*')
                    .single()

                if (updateError) {
                    console.error('Error updating cama in Supabase:', updateError)
                    throw updateError
                }
                result = updated
            } else {
                // Insert new
                const insertPayload: any = {}
                if (cama.nombre !== undefined) insertPayload.nombre = cama.nombre
                if (cama.id_grupo !== undefined) insertPayload.id_grupo = cama.id_grupo
                if (cama.largo_metros !== undefined) insertPayload.largo_metros = cama.largo_metros
                if (cama.ancho_metros !== undefined) insertPayload.ancho_metros = cama.ancho_metros
                if (cama.plantas_totales !== undefined) insertPayload.plantas_totales = cama.plantas_totales

                const { data: inserted, error: insertError } = await supabase
                    .from(TABLES.cama)
                    .insert(insertPayload)
                    .select('*')
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
            return (all as any).filter((c: any) => !c.eliminado_en)
        } catch (error) {
            console.error('Error getting all camas:', error)
            return []
        }
    }

    /**
     * Get a specific cama by ID
     */
    async getCamaById(id_cama: number): Promise<Cama | undefined> {
        try {
            const c = await db.cama.get(id_cama)
            return c as any
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
                const filtered = (remoteCamas as any[]).filter(c => !c.eliminado_en)
                await db.cama.clear()
                await db.cama.bulkAdd(filtered as any)
                console.log('Camas synced successfully:', filtered.length)
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
                const { error } = await supabase.from(TABLES.cama).delete().in('id_cama', ids)
                if (error) {
                    console.error('Error deleting camas remotely:', error)
                }
            }
        } catch (err) {
            console.error('Remote delete attempt failed:', err)
        }
        try {
            await db.cama.bulkDelete(ids as any)
            console.log('Deleted camas locally:', ids.length)
        } catch (err) {
            console.error('Local delete failed:', err)
            throw err
        }
    }
}

export const camasService = new CamasService()