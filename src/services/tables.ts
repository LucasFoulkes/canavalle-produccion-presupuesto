import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Finca, NewFinca, Bloque, Cama } from '@/types/tables'

// Fetch from network when possible and keep a local Dexie cache for offline usage
export async function fetchFincas(): Promise<Finca[]> {
    try {
        const { data, error } = await supabase
            .from('finca')
            .select('*')
            .order('nombre', { ascending: true })
        if (error) throw error

        const fincas = (data ?? []) as Finca[]
        // Update local cache in a single transaction
        await db.transaction('rw', db.finca, async () => {
            // Strategy: simple refresh cache – clear and bulkAdd
            await db.finca.clear()
            await db.finca.bulkAdd(fincas)
        })
        return fincas
    } catch {
        // Offline or network error: return cached data
        const cached = await db.finca.orderBy('nombre').toArray()
        return cached
    }
}

export async function insertFinca(payload: NewFinca): Promise<Finca> {
    // First attempt to insert online
    try {
        const { data, error } = await supabase
            .from('finca')
            .insert(payload)
            .select('*')
            .single()
        if (error) throw error
        const created = data as Finca
        await db.finca.put(created)
        return created
    } catch {
        // Offline fallback: create a local record with a temp id
        const offlineRecord: Finca = {
            id_finca: await db.finca.add({
                id_finca: 0 as unknown as number, // Dexie will set auto id
                nombre: payload.nombre,
                creado_en: new Date().toISOString(),
                eliminado_en: null,
            } as unknown as Finca),
            nombre: payload.nombre,
            creado_en: new Date().toISOString(),
            eliminado_en: null,
        }
        return offlineRecord
    }
}

// Generic fetcher by table name. If there is a matching Dexie store, use it for caching.
export async function fetchTable(table: string): Promise<Array<Record<string, unknown>>> {
    // Try network first
    try {
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw error
        const rows = (data ?? []) as Array<Record<string, unknown>>

        // If we know this table locally, refresh the cache
        if (table === 'finca') {
            await db.transaction('rw', db.finca, async () => {
                await db.finca.clear()
                await db.finca.bulkAdd(rows as Finca[])
            })
        } else if (table === 'bloque') {
            await db.transaction('rw', db.bloque, async () => {
                await db.bloque.clear()
                await db.bloque.bulkAdd(rows as Bloque[])
            })
        } else if (table === 'cama') {
            await db.transaction('rw', db.cama, async () => {
                await db.cama.clear()
                await db.cama.bulkAdd(rows as Cama[])
            })
        }
        return rows
    } catch {
        // On failure, try to read from Dexie when we have a store for it
        if (table === 'finca') {
            const cached = await db.finca.toArray()
            return cached
        } else if (table === 'bloque') {
            const cached = await db.bloque.toArray()
            return cached
        } else if (table === 'cama') {
            const cached = await db.cama.toArray()
            return cached
        }
        // Unknown table with no local cache
        return []
    }
}


