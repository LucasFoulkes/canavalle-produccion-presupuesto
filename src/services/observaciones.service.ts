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
        const rows = await db.observacion.where('id_cama').equals(id_cama).and(o => !o.deleted_at && !o.eliminado_en).toArray()
        return rows
    },

    async upsertLocal(row: Partial<Observacion>) {
        const now = new Date().toISOString()
        const rec: Observacion = {
            id: row.id ?? Date.now(),
            id_cama: row.id_cama!,
            estado_fenologico: row.estado_fenologico!,
            cantidad: row.cantidad ?? 0,
            fecha_observacion: row.fecha_observacion ?? now.slice(0, 10),
            hora_observacion: row.hora_observacion ?? now.slice(11, 19),
            ubicacion_seccion: row.ubicacion_seccion ?? null,
            id_usuario: row.id_usuario ?? null,
            created_at: row.created_at ?? now,
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
            fecha_observacion: row.fecha_observacion ?? null,
            hora_observacion: row.hora_observacion ?? null,
            estado_fenologico: row.estado_fenologico,
            cantidad: row.cantidad,
            id_usuario: row.id_usuario ?? null,
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
