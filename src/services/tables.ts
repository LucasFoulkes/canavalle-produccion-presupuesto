import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Finca, Bloque, Cama, GrupoCama } from '@/types/tables'
import * as aq from 'arquero'


export type TableResult = {
    rows: Array<Record<string, unknown>>
    columns?: string[]
}


export async function fetchFincas(): Promise<TableResult> {
    try {
        const { data, error } = await supabase.from('finca').select('*')
        if (error) throw error
        const fincas = (data ?? []) as Finca[]
        await db.transaction('rw', db.finca, async () => {
            await db.finca.bulkPut(fincas)
        })
    } catch { }
    const list = await db.finca.toArray()
    const rows = list.map(({ id_finca, nombre }) => ({ id_finca, nombre } as Record<string, unknown>))
    return { rows, columns: ['nombre'] }
}


export async function fetchBloque(): Promise<TableResult> {
    try {
        const { data, error } = await supabase.from('bloque').select('*')
        if (error) throw error
        const rows = (data ?? []) as Bloque[]
        await db.transaction('rw', db.bloque, async () => {
            await db.bloque.bulkPut(rows)
        })
    } catch { }

    try { await fetchFincas() } catch { }
    const [bloques, fincas] = await Promise.all([
        db.bloque.toArray(),
        db.finca.toArray(),
    ])

    // Build Arquero tables with explicit renames to avoid name collisions
    const tBloque = aq.from(bloques).rename({ nombre: 'bloque_nombre' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })

    // Left join on id_finca and project desired columns
    const joined = tBloque
        .join_left(tFinca, ['id_finca', 'id_finca'])
        .select({
            finca: 'finca_nombre',
            nombre: 'bloque_nombre',
            numero_camas: 'numero_camas',
            // area_m2 included in underlying row but not listed in columns for now
        })

    const rows = joined.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'nombre', 'numero_camas'] }

}

// Dedicated fetcher for 'cama' returning only selected columns
export async function fetchCama(): Promise<TableResult> {
    // Best-effort: refresh caches from network
    try {
        const { data, error } = await supabase.from('cama').select('*')
        if (error) throw error
        const rows = (data ?? []) as Cama[]
        await db.transaction('rw', db.cama, async () => {
            await db.cama.bulkPut(rows)
        })
    } catch {
        // ignore and use cache below
    }
    // Refresh related references: grupo_cama and bloque, and reuse fetchFincas for finca
    try {
        const { data, error } = await supabase.from('grupo_cama').select('*')
        if (error) throw error
        const rows = (data ?? []) as GrupoCama[]
        await db.transaction('rw', db.grupo_cama, async () => {
            await db.grupo_cama.bulkPut(rows)
        })
    } catch {
        // ignore
    }
    try {
        const { data, error } = await supabase.from('bloque').select('*')
        if (error) throw error
        const rows = (data ?? []) as Bloque[]
        await db.transaction('rw', db.bloque, async () => {
            await db.bloque.bulkPut(rows)
        })
    } catch {
        // ignore
    }
    try { await fetchFincas() } catch { /* ignore */ }

    // Single return path: read from cache, project cama with bloque and finca names
    const [camas, grupos, bloques, fincas] = await Promise.all([
        db.cama.toArray(),
        db.grupo_cama.toArray(),
        db.bloque.toArray(),
        db.finca.toArray(),
    ])

    // Arquero tables with disambiguating renames
    const tCama = aq.from(camas).rename({ nombre: 'cama_nombre' })
    const tGrupo = aq.from(grupos).rename({ id_bloque: 'grupo_id_bloque' })
    const tBloque2 = aq.from(bloques).rename({ nombre: 'bloque_nombre' })
    const tFinca2 = aq.from(fincas).rename({ nombre: 'finca_nombre' })

    // Join chain: cama -> grupo_cama -> bloque -> finca
    const joined = tCama
        .join_left(tGrupo, ['id_grupo', 'id_grupo'])
        .join_left(tBloque2, ['grupo_id_bloque', 'id_bloque'])
        .join_left(tFinca2, ['id_finca', 'id_finca'])
        .select({
            finca: 'finca_nombre',
            bloque: 'bloque_nombre',
            nombre: 'cama_nombre',
            id_grupo: 'id_grupo',
            largo_metros: 'largo_metros',
        })

    const rows = joined.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'bloque', 'nombre', 'id_grupo', 'largo_metros'] }
}


// Generic fetcher by table name. If there is a matching Dexie store, use it for caching.
export async function fetchTable(table: string): Promise<TableResult> {
    switch (table) {
        case 'finca':
            return await fetchFincas()
        case 'bloque':
            return await fetchBloque()
        case 'cama':
            return await fetchCama()
        default:
            // Generic fallback: simple network fetch without caching
            try {
                const { data, error } = await supabase.from(table).select('*')
                if (error) throw error
                const rows = (data ?? []) as Array<Record<string, unknown>>
                return { rows }
            } catch {
                // Unknown table with no specific offline handler
                return { rows: [] }
            }
    }
}