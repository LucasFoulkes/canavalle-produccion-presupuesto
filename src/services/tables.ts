import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Finca, Bloque, Cama, GrupoCama, Variedad, Breeder, EstadoFenologicoTipo, EstadosFenologicos, Observacion, Pinche, Produccion, GrupoCamaEstado, GrupoCamaTipoPlanta, Patron, PincheTipo, PuntosGPS, Seccion, Usuario } from '@/types/tables'
import * as aq from 'arquero'


export type TableResult = {
    rows: Array<Record<string, unknown>>
    columns?: string[]
}

export type FetchOptions = {
    // network-first: wait for Supabase refresh then read cache (current behavior)
    // cache-first: read cache immediately and refresh in background
    strategy?: 'network-first' | 'cache-first'
}

type DexieTable<T> = { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }

async function refreshTable<T>(
    tableName: string,
    dexieTable: DexieTable<T>,
    select: string = '*',
): Promise<void> {
    try {
        const { data, error } = await supabase.from(tableName).select(select)
        if (error) throw error
        const rows = (data ?? []) as T[]
        await dexieTable.bulkPut(rows)
    } catch (e) {
        console.warn(`${tableName}: refresh failed; using cache`, e)
    }
}

async function readAll<T>(dexieTable: DexieTable<T>): Promise<T[]> {
    return dexieTable.toArray()
}

// Fire-and-forget a promise and swallow errors to avoid unhandled rejections
function background<T>(p: Promise<T>): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    p.catch(() => { /* noop */ })
}


export async function fetchFincas(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Finca>('finca', db.finca, '*')
    } else {
        background(refreshTable<Finca>('finca', db.finca, '*'))
    }
    const list = await readAll(db.finca)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['nombre'] }
}


// Fetch breeders and cache; return simple listing
export async function fetchBreeder(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Breeder>('breeder', db.breeder, '*')
    } else {
        background(refreshTable<Breeder>('breeder', db.breeder, '*'))
    }
    const list = await readAll(db.breeder)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['nombre'] }
}


export async function fetchBloque(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Bloque>('bloque', db.bloque, '*')
        await refreshTable<Finca>('finca', db.finca, '*')
    } else {
        background(refreshTable<Bloque>('bloque', db.bloque, '*'))
        background(refreshTable<Finca>('finca', db.finca, '*'))
    }
    const [bloques, fincas] = await Promise.all([
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
    ])

    // If no bloques, return empty with known columns to avoid Arquero schema issues
    if (!bloques.length) {
        return { rows: [], columns: ['finca', 'nombre', 'numero_camas', 'area_m2'] }
    }

    // Use Arquero for a simple left join to get finca display name
    const tBloque = aq.from(bloques)
    const tFinca = aq.from(fincas)
        .select('id_finca', 'nombre')
        .rename({ nombre: 'finca' })

    const joinedBloque = tBloque
        .join_left(tFinca, ['id_finca', 'id_finca'])
        .derive({
            finca: aq.escape((d: { finca?: string | null; id_finca?: number | null }) =>
                d.finca ?? (d.id_finca != null ? String(d.id_finca) : '')
            ),
        })
        .select('finca', 'nombre', 'numero_camas', 'area_m2')

    const rows = joinedBloque.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'nombre', 'numero_camas', 'area_m2'] }

}

// Dedicated fetcher for 'cama' returning only selected columns
export async function fetchCama(options: FetchOptions = {}): Promise<TableResult> {
    // Best-effort: refresh caches from network
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Cama>('cama', db.cama, '*')
        await refreshTable<GrupoCama>('grupo_cama', db.grupo_cama, '*')
        await refreshTable<Bloque>('bloque', db.bloque, '*')
        await refreshTable<Finca>('finca', db.finca, '*')
    } else {
        background(refreshTable<Cama>('cama', db.cama, '*'))
        background(refreshTable<GrupoCama>('grupo_cama', db.grupo_cama, '*'))
        background(refreshTable<Bloque>('bloque', db.bloque, '*'))
        background(refreshTable<Finca>('finca', db.finca, '*'))
    }

    // Single return path: read from cache, then join with Arquero
    const [camas, grupos, bloques, fincas] = await Promise.all([
        readAll<Cama>(db.cama),
        readAll<GrupoCama>(db.grupo_cama),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
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
            finca: aq.escape((d: { finca_nombre?: string | null; bloque_id_finca?: number | null }) =>
                d.finca_nombre ?? (d.bloque_id_finca != null ? String(d.bloque_id_finca) : '')
            ),
            bloque: aq.escape((d: { bloque_nombre?: string | null; id_bloque?: number | null }) =>
                d.bloque_nombre ?? (d.id_bloque != null ? String(d.id_bloque) : '')
            ),
        })
        .select('finca', 'bloque', 'cama_nombre', 'id_grupo', 'largo_metros')
        .rename({ cama_nombre: 'nombre' })

    const rows = joinedCama.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'bloque', 'nombre', 'id_grupo', 'largo_metros'] }
}



export async function fetchVariedad(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Variedad>('variedad', db.variedad, '*')
        await refreshTable<Breeder>('breeder', db.breeder, '*')
    } else {
        background(refreshTable<Variedad>('variedad', db.variedad, '*'))
        background(refreshTable<Breeder>('breeder', db.breeder, '*'))
    }

    // Join variedad with breeder to show breeder name
    const [varList, breeders] = await Promise.all([
        readAll<Variedad>(db.variedad),
        readAll<Breeder>(db.breeder),
    ])

    const tVariedad = aq.from(varList).rename({ nombre: 'variedad_nombre' })
    const tBreeder = aq.from(breeders).rename({ nombre: 'breeder_nombre' })

    const joined = tVariedad
        .join_left(tBreeder, ['id_breeder', 'id_breeder'])
        .derive({
            breeder: aq.escape((d: { breeder_nombre?: string | null; id_breeder?: number | null }) =>
                d.breeder_nombre ?? (d.id_breeder != null ? String(d.id_breeder) : '')
            ),
        })
        .select('id_variedad', 'variedad_nombre', 'color', 'breeder')
        .rename({ variedad_nombre: 'nombre' })

    const rows = joined.objects() as Array<Record<string, unknown>>
    return { rows, columns: ['id_variedad', 'nombre', 'color', 'breeder'] }
}



export async function fetchEstadoFenologicoTipo(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<EstadoFenologicoTipo>('estado_fenologico_tipo', db.estado_fenologico_tipo, '*')
    } else {
        background(refreshTable<EstadoFenologicoTipo>('estado_fenologico_tipo', db.estado_fenologico_tipo, '*'))
    }
    const list = await readAll(db.estado_fenologico_tipo)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['codigo', 'orden'] }
}

// Basic fetch for estados_fenologicos (no joins yet)
export async function fetchEstadosFenologicos(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<EstadosFenologicos>('estados_fenologicos', db.estados_fenologicos, '*')
        await refreshTable<Finca>('finca', db.finca, '*')
        await refreshTable<Bloque>('bloque', db.bloque, '*')
        await refreshTable<Variedad>('variedad', db.variedad, '*')
    } else {
        background(refreshTable<EstadosFenologicos>('estados_fenologicos', db.estados_fenologicos, '*'))
        background(refreshTable<Finca>('finca', db.finca, '*'))
        background(refreshTable<Bloque>('bloque', db.bloque, '*'))
        background(refreshTable<Variedad>('variedad', db.variedad, '*'))
    }
    const [estados, fincas, bloques, variedades] = await Promise.all([
        readAll<EstadosFenologicos>(db.estados_fenologicos),
        readAll<Finca>(db.finca),
        readAll<Bloque>(db.bloque),
        readAll<Variedad>(db.variedad),
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
            finca: aq.escape((d: { finca_nombre?: string | null; estado_id_finca?: number | null }) =>
                d.finca_nombre ?? (d.estado_id_finca != null ? String(d.estado_id_finca) : '')
            ),
            bloque: aq.escape((d: { bloque_nombre?: string | null; estado_id_bloque?: number | null }) =>
                d.bloque_nombre ?? (d.estado_id_bloque != null ? String(d.estado_id_bloque) : '')
            ),
            variedad: aq.escape((d: { variedad_nombre?: string | null; estado_id_variedad?: number | null }) =>
                d.variedad_nombre ?? (d.estado_id_variedad != null ? String(d.estado_id_variedad) : '')
            ),
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


export async function fetchObservacion(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Observacion>('observacion', db.observacion, '*')
    } else {
        background(refreshTable<Observacion>('observacion', db.observacion, '*'))
    }
    const list = await readAll(db.observacion)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['id_cama', 'ubicacion_seccion', 'cantidad', 'tipo_observacion', 'punto_gps', 'creado_en'] }
}

export async function fetchPinche(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Pinche>('pinche', db.pinche, '*')
    } else {
        background(refreshTable<Pinche>('pinche', db.pinche, '*'))
    }
    const list = await readAll(db.pinche)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['bloque', 'cama', 'variedad', 'cantidad', 'tipo', 'created_at'] }
}

export async function fetchProduccion(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Produccion>('produccion', db.produccion, '*')
    } else {
        background(refreshTable<Produccion>('produccion', db.produccion, '*'))
    }
    const list = await readAll(db.produccion)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'bloque', 'variedad', 'cantidad', 'created_at'] }
}

// Additional simple fetchers for remaining tables
export async function fetchGrupoCama(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<GrupoCama>('grupo_cama', db.grupo_cama, '*')
    } else {
        background(refreshTable<GrupoCama>('grupo_cama', db.grupo_cama, '*'))
    }
    const list = await readAll(db.grupo_cama)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['id_bloque', 'id_variedad', 'fecha_siembra', 'estado', 'patron', 'tipo_planta', 'numero_camas', 'total_plantas'] }
}

export async function fetchGrupoCamaEstado(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<GrupoCamaEstado>('grupo_cama_estado', db.grupo_cama_estado, '*')
    } else {
        background(refreshTable<GrupoCamaEstado>('grupo_cama_estado', db.grupo_cama_estado, '*'))
    }
    const list = await readAll(db.grupo_cama_estado)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['codigo'] }
}

export async function fetchGrupoCamaTipoPlanta(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<GrupoCamaTipoPlanta>('grupo_cama_tipo_planta', db.grupo_cama_tipo_planta, '*')
    } else {
        background(refreshTable<GrupoCamaTipoPlanta>('grupo_cama_tipo_planta', db.grupo_cama_tipo_planta, '*'))
    }
    const list = await readAll(db.grupo_cama_tipo_planta)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['codigo'] }
}

export async function fetchPatron(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Patron>('patron', db.patron, '*')
    } else {
        background(refreshTable<Patron>('patron', db.patron, '*'))
    }
    const list = await readAll(db.patron)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['codigo', 'proveedor'] }
}

export async function fetchPincheTipo(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<PincheTipo>('pinche_tipo', db.pinche_tipo, '*')
    } else {
        background(refreshTable<PincheTipo>('pinche_tipo', db.pinche_tipo, '*'))
    }
    const list = await readAll(db.pinche_tipo)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['codigo'] }
}

export async function fetchPuntosGPS(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<PuntosGPS>('puntos_gps', db.puntos_gps, '*')
    } else {
        background(refreshTable<PuntosGPS>('puntos_gps', db.puntos_gps, '*'))
    }
    const list = await readAll(db.puntos_gps)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['latitud', 'longitud', 'precision', 'altitud', 'capturado_en', 'observacion', 'usuario_id'] }
}

export async function fetchSeccion(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Seccion & { id?: number }>('seccion', db.seccion, '*')
    } else {
        background(refreshTable<Seccion & { id?: number }>('seccion', db.seccion, '*'))
    }
    const list = await readAll(db.seccion)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['largo_m'] }
}

export async function fetchUsuario(options: FetchOptions = {}): Promise<TableResult> {
    const wait = (options.strategy ?? 'network-first') === 'network-first'
    if (wait) {
        await refreshTable<Usuario>('usuario', db.usuario, '*')
    } else {
        background(refreshTable<Usuario>('usuario', db.usuario, '*'))
    }
    const list = await readAll(db.usuario)
    const rows = list as Array<Record<string, unknown>>
    return { rows, columns: ['nombres', 'apellidos', 'rol', 'cedula', 'creado_en'] }
}



// Generic fetcher by table name. If there is a matching Dexie store, use it for caching.
export async function fetchTable(table: string, options: FetchOptions = {}): Promise<TableResult> {
    switch (table) {
        case 'finca':
            return await fetchFincas(options)
        case 'bloque':
            return await fetchBloque(options)
        case 'cama':
            return await fetchCama(options)
        case 'grupo_cama':
            return await fetchGrupoCama(options)
        case 'grupo_cama_estado':
            return await fetchGrupoCamaEstado(options)
        case 'grupo_cama_tipo_planta':
            return await fetchGrupoCamaTipoPlanta(options)
        case 'variedad':
            return await fetchVariedad(options)
        case 'breeder':
            return await fetchBreeder(options)
        case 'patron':
            return await fetchPatron(options)
        case 'estado_fenologico_tipo':
            return await fetchEstadoFenologicoTipo(options)
        case 'estados_fenologicos':
            return await fetchEstadosFenologicos(options)
        case 'observacion':
            return await fetchObservacion(options)
        case 'pinche':
            return await fetchPinche(options)
        case 'pinche_tipo':
            return await fetchPincheTipo(options)
        case 'produccion':
            return await fetchProduccion(options)
        case 'puntos_gps':
            return await fetchPuntosGPS(options)
        case 'usuario':
            return await fetchUsuario(options)
        case 'seccion':
            return await fetchSeccion(options)
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