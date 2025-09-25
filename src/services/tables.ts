import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Finca, Bloque, Cama, GrupoCama, Variedad, Breeder, EstadoFenologicoTipo, EstadosFenologicos } from '@/types/tables'
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
    } catch (e) {
        console.warn('fetchFincas: network refresh failed; using cache', e)
    }
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
    } catch (e) {
        console.warn('fetchBloque: refresh bloque failed; using cache', e)
    }

    try { await fetchFincas() } catch (e) { console.warn('fetchBloque: refresh finca failed; using cache', e) }
    const [bloques, fincas] = await Promise.all([
        db.bloque.toArray(),
        db.finca.toArray(),
    ])

    // Build Arquero tables and perform a left join on id_finca
    const tBloque = aq.from(bloques).rename({ nombre: 'bloque_nombre' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })

    const joinedBloque = tBloque
        .join_left(tFinca, ['id_finca', 'id_finca'])
        .derive({
            finca: (d) => (d.finca_nombre ?? (d.id_finca != null ? '' + d.id_finca : '')),
        })
        .select('finca', 'bloque_nombre', 'numero_camas', 'area_m2')
        .rename({ bloque_nombre: 'nombre' })

    const rows = joinedBloque.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'nombre', 'numero_camas', 'area_m2'] }

}

// Fetch breeders and cache; return simple listing
export async function fetchBreeder(): Promise<TableResult> {
    try {
        const { data, error } = await supabase.from('breeder').select('*')
        if (error) throw error
        const rows = (data ?? []) as Breeder[]
        await db.transaction('rw', db.breeder, async () => {
            await db.breeder.bulkPut(rows)
        })
    } catch (e) {
        console.warn('fetchBreeder: refresh failed; using cache', e)
    }
    const list = await db.breeder.toArray()
    const rows = list.map(({ id_breeder, nombre }) => ({ id_breeder, nombre } as Record<string, unknown>))
    return { rows, columns: ['nombre'] }
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
    } catch (e) {
        console.warn('fetchCama: refresh cama failed; using cache', e)
    }
    // Refresh related references: grupo_cama and bloque, and reuse fetchFincas for finca
    try {
        const { data, error } = await supabase.from('grupo_cama').select('*')
        if (error) throw error
        const rows = (data ?? []) as GrupoCama[]
        await db.transaction('rw', db.grupo_cama, async () => {
            await db.grupo_cama.bulkPut(rows)
        })
    } catch (e) {
        console.warn('fetchCama: refresh grupo_cama failed; using cache', e)
    }
    try {
        const { data, error } = await supabase.from('bloque').select('*')
        if (error) throw error
        const rows = (data ?? []) as Bloque[]
        await db.transaction('rw', db.bloque, async () => {
            await db.bloque.bulkPut(rows)
        })
    } catch (e) {
        console.warn('fetchCama: refresh bloque failed; using cache', e)
    }
    try { await fetchFincas() } catch (e) { console.warn('fetchCama: refresh finca failed; using cache', e) }

    // Single return path: read from cache, then join with Arquero
    const [camas, grupos, bloques, fincas] = await Promise.all([
        db.cama.toArray(),
        db.grupo_cama.toArray(),
        db.bloque.toArray(),
        db.finca.toArray(),
    ])

    const tCama = aq.from(camas).rename({ nombre: 'cama_nombre' })
    const tGrupo = aq.from(grupos).rename({ id_bloque: 'grupo_id_bloque' })
    const tBloque = aq.from(bloques).rename({ nombre: 'bloque_nombre' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })

    const joinedCama = tCama
        .join_left(tGrupo, ['id_grupo', 'id_grupo'])
        .join_left(tBloque, ['grupo_id_bloque', 'id_bloque'])
        .join_left(tFinca, ['id_finca', 'id_finca'])
        .derive({
            finca: (d) => (d.finca_nombre ?? (d.id_finca != null ? '' + d.id_finca : '')),
            bloque: (d) => (d.bloque_nombre ?? (d.id_bloque != null ? '' + d.id_bloque : '')),
        })
        .select('finca', 'bloque', 'cama_nombre', 'id_grupo', 'largo_metros')
        .rename({ cama_nombre: 'nombre' })

    const rows = joinedCama.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'bloque', 'nombre', 'id_grupo', 'largo_metros'] }
}



export async function fetchVariedad(): Promise<TableResult> {
    try {
        const { data, error } = await supabase.from('variedad').select('*')
        if (error) throw error
        const variedades = (data ?? []) as Variedad[]
        await db.transaction('rw', db.variedad, async () => {
            await db.variedad.bulkPut(variedades)
        })
    } catch (e) {
        console.warn('fetchVariedad: refresh failed; using cache', e)
    }
    // Ensure breeder cache is refreshed (best effort)
    try { await fetchBreeder() } catch (e) { console.warn('fetchVariedad: refresh breeder failed; using cache', e) }

    // Join variedad with breeder to show breeder name
    const [varList, breeders] = await Promise.all([
        db.variedad.toArray(),
        db.breeder.toArray(),
    ])

    const tVariedad = aq.from(varList).rename({ nombre: 'variedad_nombre' })
    const tBreeder = aq.from(breeders).rename({ nombre: 'breeder_nombre' })

    const joined = tVariedad
        .join_left(tBreeder, ['id_breeder', 'id_breeder'])
        .derive({
            breeder: (d) => (d.breeder_nombre ?? (d.id_breeder != null ? '' + d.id_breeder : '')),
        })
        .select('id_variedad', 'variedad_nombre', 'color', 'breeder')
        .rename({ variedad_nombre: 'nombre' })

    const rows = joined.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['id_variedad', 'nombre', 'color', 'breeder'] }
}



export async function fetchEstadoFenologicoTipo(): Promise<TableResult> {
    try {
        const { data, error } = await supabase.from('estado_fenologico_tipo').select('*')
        if (error) throw error
        const estados = (data ?? []) as EstadoFenologicoTipo[]
        await db.transaction('rw', db.estado_fenologico_tipo, async () => {
            await db.estado_fenologico_tipo.bulkPut(estados)
        })
    } catch (e) {
        console.warn('fetchEstadosFenologicosTipo: network refresh failed; using cache', e)
    }
    const list = await db.estado_fenologico_tipo.toArray()
    const rows = list.map(({ codigo, orden }) => ({ codigo, orden } as Record<string, unknown>))
    return { rows, columns: ['codigo', 'orden'] }
}

// Basic fetch for estados_fenologicos (no joins yet)
export async function fetchEstadosFenologicos(): Promise<TableResult> {
    try {
        const { data, error } = await supabase.from('estados_fenologicos').select('*')
        if (error) throw error
        const estados = (data ?? []) as EstadosFenologicos[]
        await db.transaction('rw', db.estados_fenologicos, async () => {
            await db.estados_fenologicos.bulkPut(estados)
        })
    } catch (e) {
        console.warn('fetchEstadosFenologicos: network refresh failed; using cache', e)
    }
    const list = await db.estados_fenologicos.toArray()
    const rows = list.map((e) => ({
        id_estado_fenologico: e.id_estado_fenologico,
        id_finca: e.id_finca,
        id_bloque: e.id_bloque,
        id_variedad: e.id_variedad,
        dias_brotacion: e.dias_brotacion,
        dias_cincuenta_mm: e.dias_cincuenta_mm,
        dias_quince_cm: e.dias_quince_cm,
        dias_veinte_cm: e.dias_veinte_cm,
        dias_primera_hoja: e.dias_primera_hoja,
        dias_espiga: e.dias_espiga,
        dias_arroz: e.dias_arroz,
        dias_arveja: e.dias_arveja,
        dias_garbanzo: e.dias_garbanzo,
        dias_uva: e.dias_uva,
        dias_rayando_color: e.dias_rayando_color,
        dias_sepalos_abiertos: e.dias_sepalos_abiertos,
        dias_cosecha: e.dias_cosecha,
        creado_en: e.creado_en,
        eliminado_en: e.eliminado_en,
    } as Record<string, unknown>))
    return {
        rows, columns: [
            'id_finca', 'id_bloque', 'id_variedad',
            'dias_brotacion', 'dias_cincuenta_mm', 'dias_quince_cm', 'dias_veinte_cm', 'dias_primera_hoja', 'dias_espiga', 'dias_arroz', 'dias_arveja', 'dias_garbanzo', 'dias_uva', 'dias_rayando_color', 'dias_sepalos_abiertos', 'dias_cosecha',
            'creado_en', 'eliminado_en'
        ]
    }
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
        case 'variedad':
            return await fetchVariedad()
        case 'breeder':
            return await fetchBreeder()
        case 'estado_fenologico_tipo':
            return await fetchEstadoFenologicoTipo()
        case 'estados_fenologicos':
            return await fetchEstadosFenologicos()
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