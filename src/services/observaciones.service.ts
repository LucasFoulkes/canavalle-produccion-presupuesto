import { db } from '@/lib/dexie'
import { Observacion } from '@/types/database'
import { supabase } from '@/lib/supabase'

export const observacionesService = {
    async listTipos() {
        const { data, error } = await supabase.from('estado_fenologico_tipo').select('*').order('orden')
        if (error) {
            // Fallback to local
            return db.estadoFenologicoTipo.orderBy('orden').toArray()
        }
        // cache locally
        if (data?.length) await db.estadoFenologicoTipo.bulkPut(data as any)
        return data as any
    },

    async listByCama(id_cama: number) {
        const rows = await db.observacion.where('id_cama').equals(id_cama).and(o => !o.eliminado_en).toArray()
        return rows
    },

    async upsertLocal(row: Partial<Observacion>) {
        const now = new Date().toISOString()
        const rec: Observacion = {
            id: row.id ?? Date.now(),
            id_cama: row.id_cama!,
            tipo_observacion: (row as any).tipo_observacion ?? (row as any).estado_fenologico!,
            cantidad: row.cantidad ?? 0,
            // Use creado_en as the local timestamp source for grouping
            creado_en: row.creado_en ?? now,
            ubicacion_seccion: row.ubicacion_seccion ?? null,
            id_usuario: row.id_usuario ?? null,
            eliminado_en: null,
        }
        await db.observacion.put(rec as any)
        return rec
    },

    async syncUpsert(row: Observacion) {
        // Only send columns that exist on the server (avoid created_at, etc.)
        // If we don't have a server id yet, omit id_observacion so Postgres generates it.
        const hasServerId = !!row.id_observacion
        const payload: any = {
            id_cama: row.id_cama,
            ubicacion_seccion: row.ubicacion_seccion ?? null,
            tipo_observacion: (row as any).tipo_observacion ?? (row as any).estado_fenologico,
            cantidad: row.cantidad,
            id_usuario: row.id_usuario ?? null,
            // Do not send fecha/hora; DB will set timestamp. creado_en is server-managed; omit.
        }
        if (hasServerId) payload.id_observacion = row.id_observacion
        const { data, error } = await supabase
            .from('observacion')
            .upsert(payload as any, { onConflict: 'id_observacion' })
            .select('*')
            .single()
        if (error) throw error
        const normalized = { ...(data as any), id: (data as any).id_observacion, id_observacion: (data as any).id_observacion }
        await db.observacion.put(normalized)
        return normalized as any
    }
}
