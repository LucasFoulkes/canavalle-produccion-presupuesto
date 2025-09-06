import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'
import { GrupoCama } from '@/types/database'

export type { GrupoCama }

export const gruposPlantacionService = {
    async getByBloqueId(bloqueId: number): Promise<GrupoCama[]> {
        try {
            // Prefer new grupoCama table; fallback to legacy if empty
            const hasGrupoCama = db.tables.some(t => t.name === TABLES.grupoCama)
            if (hasGrupoCama && !(db as any).grupoCama) {
                (db as any).grupoCama = db.table(TABLES.grupoCama)
            }
            const local = hasGrupoCama ? await (db as any).grupoCama.where('bloque_id').equals(bloqueId).toArray() : []
            if (local.length) return local.filter((g: any) => !g.deleted_at)
            // Legacy fallback
            if (!(db as any).grupoPlantacion) {
                (db as any).grupoPlantacion = db.table(TABLES.grupoPlantacion)
            }
            const legacy = await db.grupoPlantacion.where('bloque_id').equals(bloqueId).toArray()
            if (legacy.length) return legacy.filter(g => !g.deleted_at) as any
            if (local.length) return local
            if (!navigator.onLine) return []
            const { data, error } = await supabase.from(TABLES.grupoCama).select('*').eq('bloque_id', bloqueId)
            if (error || !data) return []
            if (hasGrupoCama) {
                await (db as any).grupoCama.bulkPut(data)
            } else {
                await db.grupoPlantacion.bulkPut(data)
            }
            return data.filter(d => !d.deleted_at)
        } catch (e) {
            console.error('Error loading grupos_plantacion:', e)
            return []
        }
    },
    async get(grupo_id: number): Promise<GrupoCama | undefined> {
        const hasGrupoCama = db.tables.some(t => t.name === TABLES.grupoCama)
        if (hasGrupoCama && !(db as any).grupoCama) {
            (db as any).grupoCama = db.table(TABLES.grupoCama)
        }
        const local = hasGrupoCama ? await (db as any).grupoCama.get(grupo_id) : await db.grupoPlantacion.get(grupo_id)
        if (local) return (local as any).deleted_at ? undefined : local
        if (!navigator.onLine) return undefined
        const { data, error } = await supabase.from(TABLES.grupoCama).select('*').eq('grupo_id', grupo_id).maybeSingle()
        if (error || !data) return undefined
        if (hasGrupoCama) {
            await (db as any).grupoCama.put(data)
        } else {
            await db.grupoPlantacion.put(data)
        }
        return data
    },
    async upsert(entity: Omit<GrupoCama, 'grupo_id'> & { grupo_id?: number }): Promise<GrupoCama | null> {
        try {
            // If grupo_id provided, try update else insert
            let result: GrupoCama | null = null
            if (entity.grupo_id) {
                const { data, error } = await supabase.from(TABLES.grupoCama)
                    .update({ ...entity })
                    .eq('grupo_id', entity.grupo_id)
                    .select()
                    .single()
                if (!error && data) result = data as GrupoCama
            } else {
                const { data, error } = await supabase.from(TABLES.grupoCama)
                    .insert({ ...entity })
                    .select()
                    .single()
                if (!error && data) result = data as GrupoCama
            }
            if (result) {
                const hasGrupoCama = db.tables.some(t => t.name === TABLES.grupoCama)
                if (hasGrupoCama) await (db as any).grupoCama.put(result)
                else await db.grupoPlantacion.put(result as any)
            }
            return result
        } catch (e) {
            console.error('Error upserting grupo_plantacion:', e)
            return null
        }
    },
    async softDelete(grupo_id: number): Promise<boolean> {
        try {
            const timestamp = new Date().toISOString()
            if (navigator.onLine) {
                const { error } = await supabase.from(TABLES.grupoCama)
                    .update({ deleted_at: timestamp })
                    .eq('grupo_id', grupo_id)
                if (error) console.error('Remote soft delete error:', error)
            }
            const hasGrupoCama = db.tables.some(t => t.name === TABLES.grupoCama)
            if (hasGrupoCama) await (db as any).grupoCama.update(grupo_id, { deleted_at: timestamp })
            else await db.grupoPlantacion.update(grupo_id, { deleted_at: timestamp })
            return true
        } catch (e) {
            console.error('Error soft deleting grupo_plantacion:', e)
            return false
        }
    }
}
