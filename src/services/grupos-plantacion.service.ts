import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'
import { GrupoCama } from '@/types/database'

export type { GrupoCama }

export const gruposPlantacionService = {
    async getByBloqueId(bloqueId: number): Promise<GrupoCama[]> {
        try {
            // Prefer new grupo_cama table (Supabase-native)
            const local = await db.grupoCama.where('id_bloque').equals(bloqueId).toArray()
            if (local.length) return local.filter((g: any) => !g.eliminado_en)

            // If offline and nothing local
            if (!navigator.onLine) return []

            const { data, error } = await supabase
                .from(TABLES.grupoCama)
                .select('*')
                .eq('id_bloque', bloqueId)
            if (error || !data) return []
            await db.grupoCama.bulkPut(data as any)
            return (data as any).filter((d: any) => !d.eliminado_en)
        } catch (e) {
            console.error('Error loading grupos_plantacion:', e)
            return []
        }
    },
    async get(id_grupo: number): Promise<GrupoCama | undefined> {
        const local = await db.grupoCama.get(id_grupo)
        if (local) return (local as any).eliminado_en ? undefined : (local as any)
        if (!navigator.onLine) return undefined
        const { data, error } = await supabase
            .from(TABLES.grupoCama)
            .select('*')
            .eq('id_grupo', id_grupo)
            .maybeSingle()
        if (error || !data) return undefined
        await db.grupoCama.put(data as any)
        return data as any
    },
    async upsert(entity: Partial<GrupoCama> & Pick<GrupoCama, 'id_bloque' | 'id_variedad' | 'fecha_siembra'> & { id_grupo?: number }): Promise<GrupoCama | null> {
        try {
            // If grupo_id provided, try update else insert
            let result: GrupoCama | null = null
            if (entity.id_grupo) {
                const { data, error } = await supabase
                    .from(TABLES.grupoCama)
                    .update({ ...entity })
                    .eq('id_grupo', entity.id_grupo)
                    .select()
                    .single()
                if (!error && data) result = data as any
            } else {
                const { data, error } = await supabase
                    .from(TABLES.grupoCama)
                    .insert({ ...entity })
                    .select()
                    .single()
                if (!error && data) result = data as any
            }
            if (result) await db.grupoCama.put(result as any)
            return result
        } catch (e) {
            console.error('Error upserting grupo_plantacion:', e)
            return null
        }
    },
    async softDelete(id_grupo: number): Promise<boolean> {
        try {
            const timestamp = new Date().toISOString()
            if (navigator.onLine) {
                const { error } = await supabase
                    .from(TABLES.grupoCama)
                    .update({ eliminado_en: timestamp })
                    .eq('id_grupo', id_grupo)
                if (error) console.error('Remote soft delete error:', error)
            }
            await db.grupoCama.update(id_grupo, { eliminado_en: timestamp } as any)
            return true
        } catch (e) {
            console.error('Error soft deleting grupo_plantacion:', e)
            return false
        }
    }
}
