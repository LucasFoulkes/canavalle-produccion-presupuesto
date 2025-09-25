import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Finca, Bloque, Cama, GrupoCama, Variedad, Breeder, EstadoFenologicoTipo, EstadosFenologicos } from '@/types/tables'
import * as aq from 'arquero'


export type TableResult = {
    rows: Array<Record<string, unknown>>
    columns?: string[]
}

// --- Small DRY helpers: refresh from Supabase then read from Dexie ---
type DexieTable<T> = { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }

async function refreshTable<T>(
    tableName: string,
    dexieTable: DexieTable<T>,
    select: string = '*',
    label?: string,
): Promise<void> {
    try {
        const { data, error } = await supabase.from(tableName).select(select)
        if (error) throw error
        const rows = (data ?? []) as T[]
        await dexieTable.bulkPut(rows)
    } catch (e) {
        console.warn(`${label ?? tableName}: refresh failed; using cache`, e)
    }
}

async function readAll<T>(dexieTable: DexieTable<T>): Promise<T[]> {
    return dexieTable.toArray()
}


export async function fetchFincas(): Promise<TableResult> {
    await refreshTable<Finca>('finca', db.finca, '*', 'fetchFincas')
    const list = await readAll(db.finca)
    const rows = list.map(({ id_finca, nombre }) => ({ id_finca, nombre } as Record<string, unknown>))
    return { rows, columns: ['nombre'] }
}


export async function fetchBloque(): Promise<TableResult> {
    await refreshTable<Bloque>('bloque', db.bloque, '*', 'fetchBloque')
    await refreshTable<Finca>('finca', db.finca, '*', 'fetchBloque:finca')
    const [bloques, fincas] = await Promise.all([
        readAll(db.bloque),
        readAll(db.finca),
    ])

    // If no bloques, return empty with known columns to avoid Arquero schema issues
    if (!bloques.length) {
        return { rows: [], columns: ['finca', 'nombre', 'numero_camas', 'area_m2'] }
    }

    // Normalize: ensure id_finca exists on all bloque rows
    const bloquesNorm = bloques.map((b) => ({ ...b, id_finca: b.id_finca ?? null }))

    // Build Arquero tables and perform a left join on id_finca
    const tBloque = aq.from(bloquesNorm).rename({ nombre: 'bloque_nombre', id_finca: 'bloque_id_finca' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })

    const joinedBloque = tBloque
        .join_left(tFinca, ['bloque_id_finca', 'id_finca'])
        .derive({
            finca: (d) => (d.finca_nombre ?? (d.bloque_id_finca != null ? '' + d.bloque_id_finca : '')),
        })
        .select('finca', 'bloque_nombre', 'numero_camas', 'area_m2')
        .rename({ bloque_nombre: 'nombre' })

    const rows = joinedBloque.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'nombre', 'numero_camas', 'area_m2'] }

}

// Fetch breeders and cache; return simple listing
export async function fetchBreeder(): Promise<TableResult> {
    await refreshTable<Breeder>('breeder', db.breeder, '*', 'fetchBreeder')
    const list = await readAll(db.breeder)
    const rows = list.map(({ id_breeder, nombre }) => ({ id_breeder, nombre } as Record<string, unknown>))
    return { rows, columns: ['nombre'] }
}

// Dedicated fetcher for 'cama' returning only selected columns
export async function fetchCama(): Promise<TableResult> {
    // Best-effort: refresh caches from network
    await refreshTable<Cama>('cama', db.cama, '*', 'fetchCama:cama')
    await refreshTable<GrupoCama>('grupo_cama', db.grupo_cama, '*', 'fetchCama:grupo_cama')
    await refreshTable<Bloque>('bloque', db.bloque, '*', 'fetchCama:bloque')
    await refreshTable<Finca>('finca', db.finca, '*', 'fetchCama:finca')

    // Single return path: read from cache, then join with Arquero
    const [camas, grupos, bloques, fincas] = await Promise.all([
        readAll(db.cama),
        readAll(db.grupo_cama),
        readAll(db.bloque),
        readAll(db.finca),
    ])

    // If no camas, return empty with known columns to avoid Arquero schema issues
    if (!camas.length) {
        return { rows: [], columns: ['finca', 'bloque', 'nombre', 'id_grupo', 'largo_metros'] }
    }

    const tCama = aq.from(camas).rename({ nombre: 'cama_nombre' })
    const tGrupo = aq.from(grupos).rename({ id_bloque: 'grupo_id_bloque' })
    // Normalize: ensure id_finca exists on all bloque rows used in cama join
    const bloquesNorm2 = bloques.map((b) => ({ ...b, id_finca: b.id_finca ?? null }))
    const tBloque = aq.from(bloquesNorm2).rename({ nombre: 'bloque_nombre', id_finca: 'bloque_id_finca' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })

    const joinedCama = tCama
        .join_left(tGrupo, ['id_grupo', 'id_grupo'])
        .join_left(tBloque, ['grupo_id_bloque', 'id_bloque'])
        .join_left(tFinca, ['bloque_id_finca', 'id_finca'])
        .derive({
            finca: (d) => (d.finca_nombre ?? (d.bloque_id_finca != null ? '' + d.bloque_id_finca : '')),
            bloque: (d) => (d.bloque_nombre ?? (d.id_bloque != null ? '' + d.id_bloque : '')),
        })
        .select('finca', 'bloque', 'cama_nombre', 'id_grupo', 'largo_metros')
        .rename({ cama_nombre: 'nombre' })

    const rows = joinedCama.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'bloque', 'nombre', 'id_grupo', 'largo_metros'] }
}



export async function fetchVariedad(): Promise<TableResult> {
    await refreshTable<Variedad>('variedad', db.variedad, '*', 'fetchVariedad')
    await refreshTable<Breeder>('breeder', db.breeder, '*', 'fetchVariedad:breeder')

    // Join variedad with breeder to show breeder name
    const [varList, breeders] = await Promise.all([
        readAll(db.variedad),
        readAll(db.breeder),
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
    await refreshTable<EstadoFenologicoTipo>('estado_fenologico_tipo', db.estado_fenologico_tipo, '*', 'fetchEstadoFenologicoTipo')
    const list = await readAll(db.estado_fenologico_tipo)
    const rows = list.map(({ codigo, orden }) => ({ codigo, orden } as Record<string, unknown>))
    return { rows, columns: ['codigo', 'orden'] }
}

// Basic fetch for estados_fenologicos (no joins yet)
export async function fetchEstadosFenologicos(): Promise<TableResult> {
    await refreshTable<EstadosFenologicos>('estados_fenologicos', db.estados_fenologicos, '*', 'fetchEstadosFenologicos')
    await refreshTable<Finca>('finca', db.finca, '*', 'fetchEstadosFenologicos:finca')
    await refreshTable<Bloque>('bloque', db.bloque, '*', 'fetchEstadosFenologicos:bloque')
    await refreshTable<Variedad>('variedad', db.variedad, '*', 'fetchEstadosFenologicos:variedad')
    const [estados, fincas, bloques, variedades] = await Promise.all([
        readAll(db.estados_fenologicos),
        readAll(db.finca),
        readAll(db.bloque),
        readAll(db.variedad),
    ])

    // If no estados, return empty with known columns to avoid Arquero schema issues
    if (!estados.length) {
        return {
            rows: [],
            columns: [
                'finca', 'bloque', 'variedad',
                'dias_brotacion', 'dias_cincuenta_mm', 'dias_quince_cm', 'dias_veinte_cm', 'dias_primera_hoja', 'dias_espiga', 'dias_arroz', 'dias_arveja', 'dias_garbanzo', 'dias_uva', 'dias_rayando_color', 'dias_sepalos_abiertos', 'dias_cosecha'
            ]
        }
    }

    // Normalize: ensure id_finca and id_bloque columns exist on all rows
    const estadosNorm = estados.map((e) => ({
        ...e,
        id_finca: e.id_finca ?? null,
        id_bloque: e.id_bloque ?? null,
        id_variedad: e.id_variedad ?? null,
    }))

    const tEstados = aq.from(estadosNorm).rename({ id_finca: 'estado_id_finca', id_bloque: 'estado_id_bloque', id_variedad: 'estado_id_variedad' })
    const tFincas = aq.from(fincas).rename({ nombre: 'finca_nombre' })
    const tBloques = aq.from(bloques).rename({ nombre: 'bloque_nombre' })
    const tVariedades = aq.from(variedades).rename({ nombre: 'variedad_nombre' })

    const joined = tEstados
        .join_left(tFincas, ['estado_id_finca', 'id_finca'])
        .join_left(tBloques, ['estado_id_bloque', 'id_bloque'])
        .join_left(tVariedades, ['estado_id_variedad', 'id_variedad'])
        .derive({
            finca: (d) => (d.finca_nombre ?? (d.estado_id_finca != null ? '' + d.estado_id_finca : '')),
            bloque: (d) => (d.bloque_nombre ?? (d.estado_id_bloque != null ? '' + d.estado_id_bloque : '')),
            variedad: (d) => (d.variedad_nombre ?? (d.estado_id_variedad != null ? '' + d.estado_id_variedad : '')),
        })
        .select(
            'id_estado_fenologico',
            'finca',
            'bloque',
            'variedad',
            'dias_brotacion',
            'dias_cincuenta_mm',
            'dias_quince_cm',
            'dias_veinte_cm',
            'dias_primera_hoja',
            'dias_espiga',
            'dias_arroz',
            'dias_arveja',
            'dias_garbanzo',
            'dias_uva',
            'dias_rayando_color',
            'dias_sepalos_abiertos',
            'dias_cosecha'
        )

    const rows = joined.objects() as Array<Record<string, unknown>>
    return {
        rows, columns: [
            'finca', 'bloque', 'variedad',
            'dias_brotacion', 'dias_cincuenta_mm', 'dias_quince_cm', 'dias_veinte_cm', 'dias_primera_hoja', 'dias_espiga', 'dias_arroz', 'dias_arveja', 'dias_garbanzo', 'dias_uva', 'dias_rayando_color', 'dias_sepalos_abiertos', 'dias_cosecha'
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