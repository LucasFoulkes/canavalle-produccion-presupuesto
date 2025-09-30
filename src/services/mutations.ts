import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import { resetSyncCache } from '@/services/sync-manager'
import type { Produccion, Pinche } from '@/types/tables'

export type InsertProduccionInput = {
    fincaId: number
    bloqueId: number
    variedadId: number
    cantidad: number
    createdAt?: string
}

export type InsertPincheInput = {
    bloqueId: number
    camaId: number
    variedadId: number
    cantidad: number
    tipo: string
    createdAt?: string
}

async function recordSyncEvent(tables: string | string[]) {
    const tablesList = Array.isArray(tables) ? tables : [tables]
    const createdAt = new Date().toISOString()

    try {
        const { data, error } = await supabase
            .from('sync')
            .insert({ created_at: createdAt, tables: tablesList })
            .select('id, created_at, tables')
            .single()

        if (error) throw error
        if (data) {
            await db.sync.put(data)
        }
    } catch (err) {
        console.warn('recordSyncEvent failed', err)
    } finally {
        resetSyncCache()
    }
}

function ensureIso(dateLike?: string) {
    if (!dateLike) return new Date().toISOString()
    const parsed = new Date(dateLike)
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
    return parsed.toISOString()
}

export async function insertProduccion(input: InsertProduccionInput): Promise<Produccion> {
    const created_at = ensureIso(input.createdAt)
    const payload = {
        created_at,
        finca: input.fincaId,
        bloque: input.bloqueId,
        variedad: input.variedadId,
        cantidad: input.cantidad,
    }

    const { data, error } = await supabase
        .from('produccion')
        .insert(payload)
        .select()
        .single()

    if (error) throw error

    const row = data as Produccion
    if (row && row.id != null) {
        await db.produccion.put(row)
    }
    await recordSyncEvent('produccion')
    return row
}

export async function insertPinche(input: InsertPincheInput): Promise<Pinche> {
    const created_at = ensureIso(input.createdAt)
    const payload = {
        created_at,
        bloque: input.bloqueId,
        cama: input.camaId,
        variedad: input.variedadId,
        cantidad: input.cantidad,
        tipo: input.tipo,
    }

    const { data, error } = await supabase
        .from('pinche')
        .insert(payload)
        .select()
        .single()

    if (error) throw error

    const row = data as Pinche
    if (row && row.id != null) {
        await db.pinche.put(row)
    }
    await recordSyncEvent('pinche')
    return row
}
