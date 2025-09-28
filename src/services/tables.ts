import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Finca, Bloque, Cama, GrupoCama, Variedad, Breeder, EstadoFenologicoTipo, EstadosFenologicos, Observacion, Pinche, Produccion, GrupoCamaEstado, GrupoCamaTipoPlanta, Patron, PincheTipo, PuntosGPS, Seccion, Usuario, Sync } from '@/types/tables'
import { mapByKey } from '@/lib/data-utils'
import { fetchAreaProductiva } from './area_productiva'
import { fetchObservacionesPorCama } from './observaciones_por_cama'
import { fetchResumenFenologico } from './resumen_fenologico'
import { refreshAllPages, readAll } from '@/lib/data-utils'
import { scaleTimelineToTotals, keepOnlyLastCosechaDay, sumCosechaByFechaVariedad } from '@/lib/predicciones'

export type TableResult<T = Record<string, unknown>> = {
    rows: T[]
    columns?: string[]
}

// done
export async function fetchFincas(): Promise<TableResult<Finca>> {
    await refreshAllPages<Finca>('finca', db.finca, '*')
    return { rows: await readAll<Finca>(db.finca) }
}

export async function fetchEstadoFenologicoTipo(): Promise<TableResult<EstadoFenologicoTipo>> {
    await refreshAllPages<EstadoFenologicoTipo>('estado_fenologico_tipo', db.estado_fenologico_tipo, '*')
    return { rows: await readAll<EstadoFenologicoTipo>(db.estado_fenologico_tipo) }
}

export async function fetchPinche(): Promise<TableResult<Pinche>> {
    await refreshAllPages<Pinche>('pinche', db.pinche, '*')
    return { rows: await readAll<Pinche>(db.pinche) }
}

export async function fetchProduccion(): Promise<TableResult<Produccion>> {
    await refreshAllPages<Produccion>('produccion', db.produccion, '*')
    return { rows: await readAll<Produccion>(db.produccion) }
}

export async function fetchGrupoCama(): Promise<TableResult> {
    await refreshAllPages<GrupoCama>('grupo_cama', db.grupo_cama, '*')
    await refreshAllPages<Bloque>('bloque', db.bloque, '*')
    await refreshAllPages<Finca>('finca', db.finca, '*')

    const grupos = await readAll<GrupoCama>(db.grupo_cama)
    if (!grupos.length) return { rows: [] }

    const bloqueById = await mapByKey<Bloque, number>(db.bloque as any, grupos.map(g => g.id_bloque ?? null))
    const fincaById = await mapByKey<Finca, number>(db.finca as any, Array.from(bloqueById.values()).map(b => b.id_finca ?? null))

    const rows = grupos.map(g => {
        const bloque = bloqueById.get(g.id_bloque)
        const finca = bloque ? fincaById.get(bloque.id_finca ?? -1) : undefined
        return {
            ...g,
            bloque: bloque?.nombre ?? (bloque?.id_bloque != null ? String(bloque.id_bloque) : ''),
            finca: finca?.nombre ?? (bloque?.id_finca != null ? String(bloque.id_finca) : ''),
        }
    }) as Array<Record<string, unknown>>

    return { rows }
}

export async function fetchGrupoCamaEstado(): Promise<TableResult<GrupoCamaEstado>> {
    await refreshAllPages<GrupoCamaEstado>('grupo_cama_estado', db.grupo_cama_estado, '*')
    return { rows: await readAll<GrupoCamaEstado>(db.grupo_cama_estado) }
}

export async function fetchGrupoCamaTipoPlanta(): Promise<TableResult<GrupoCamaTipoPlanta>> {
    await refreshAllPages<GrupoCamaTipoPlanta>('grupo_cama_tipo_planta', db.grupo_cama_tipo_planta, '*')
    return { rows: await readAll<GrupoCamaTipoPlanta>(db.grupo_cama_tipo_planta) }
}

export async function fetchPatron(): Promise<TableResult<Patron>> {
    await refreshAllPages<Patron>('patron', db.patron, '*')
    return { rows: await readAll<Patron>(db.patron) }
}

export async function fetchPincheTipo(): Promise<TableResult<PincheTipo>> {
    await refreshAllPages<PincheTipo>('pinche_tipo', db.pinche_tipo, '*')
    return { rows: await readAll<PincheTipo>(db.pinche_tipo) }
}

export async function fetchPuntosGPS(): Promise<TableResult<PuntosGPS>> {
    await refreshAllPages<PuntosGPS>('puntos_gps', db.puntos_gps, '*')
    return { rows: await readAll<PuntosGPS>(db.puntos_gps) }
}

export async function fetchSeccion(): Promise<TableResult<Seccion>> {
    await refreshAllPages<Seccion>('seccion', db.seccion, '*')
    return { rows: await readAll<Seccion>(db.seccion) }
}

export async function fetchUsuario(): Promise<TableResult<Usuario>> {
    await refreshAllPages<Usuario>('usuario', db.usuario, '*')
    return { rows: await readAll<Usuario>(db.usuario) }
}

export async function fetchSync(): Promise<TableResult<Sync>> {
    await refreshAllPages<Sync>('sync', db.sync, '*')
    return { rows: await readAll<Sync>(db.sync) }
}

export async function fetchBreeder(): Promise<TableResult<Breeder>> {
    await refreshAllPages<Breeder>('breeder', db.breeder, '*')
    return { rows: await readAll<Breeder>(db.breeder) }
}

export async function fetchObservacion(): Promise<TableResult> {
    await refreshAllPages<Observacion>('observacion', db.observacion, '*')
    // Join cama to show its nombre instead of the raw id
    await refreshAllPages<Cama>('cama', db.cama, '*')
    const obs = await readAll<Observacion>(db.observacion)
    if (!obs.length) return { rows: [] }

    const camaById = await mapByKey<Cama, number>(db.cama as any, obs.map(o => o.id_cama ?? null))
    const rows = obs.map(o => ({
        ...o,
        cama: (o.id_cama != null ? camaById.get(o.id_cama)?.nombre : undefined) ?? (o.id_cama != null ? String(o.id_cama) : ''),
    })) as Array<Record<string, unknown>>

    return { rows }
}



export async function fetchVariedad(): Promise<TableResult> {
    await refreshAllPages<Variedad>('variedad', db.variedad, '*')
    await refreshAllPages<Breeder>('breeder', db.breeder, '*')

    // Join variedad with breeder to show breeder name without Arquero
    const varList = await readAll<Variedad>(db.variedad)
    const breederMap = await mapByKey<Breeder, number>(db.breeder as any, varList.map(v => v.id_breeder ?? null))
    const rows = varList.map(v => ({
        ...v,
        breeder: (v.id_breeder != null ? breederMap.get(v.id_breeder)?.nombre : undefined) ?? (v.id_breeder != null ? String(v.id_breeder) : ''),
    })) as Array<Record<string, unknown>>
    return { rows }
}

// done
export async function fetchBloque(): Promise<TableResult> {
    await refreshAllPages<Bloque>('bloque', db.bloque, '*')
    await refreshAllPages<Finca>('finca', db.finca, '*')
    const bloques = await readAll<Bloque>(db.bloque)

    if (!bloques.length) {
        return { rows: [] }
    }

    const fincaById = await mapByKey<Finca, number>(db.finca as any, bloques.map(b => b.id_finca ?? null))
    const rows = bloques.map(b => ({
        ...b,
        finca: fincaById.get(b.id_finca ?? -1)?.nombre ?? (b.id_finca != null ? String(b.id_finca) : ''),
    })) as Array<Record<string, unknown>>
    return { rows }

}

// done
export async function fetchCama(): Promise<TableResult> {
    // Best-effort: refresh caches from network
    await refreshAllPages<Cama>('cama', db.cama, '*')
    await refreshAllPages<GrupoCama>('grupo_cama', db.grupo_cama, '*')
    await refreshAllPages<Bloque>('bloque', db.bloque, '*')
    await refreshAllPages<Finca>('finca', db.finca, '*')

    const camas = await readAll<Cama>(db.cama)
    if (!camas.length) {
        return { rows: [] }
    }

    const grupoById = await mapByKey<GrupoCama, number>(db.grupo_cama as any, camas.map(c => c.id_grupo ?? null))
    const bloqueById = await mapByKey<Bloque, number>(db.bloque as any, Array.from(grupoById.values()).map(g => g.id_bloque ?? null))
    const fincaById = await mapByKey<Finca, number>(db.finca as any, Array.from(bloqueById.values()).map(b => b.id_finca ?? null))

    const rows = camas.map(c => {
        const grupo = grupoById.get(c.id_grupo)
        const bloque = grupo ? bloqueById.get(grupo.id_bloque) : undefined
        const finca = bloque ? fincaById.get(bloque.id_finca ?? -1) : undefined
        return {
            ...c,
            bloque: bloque?.nombre ?? (bloque?.id_bloque != null ? String(bloque.id_bloque) : ''),
            finca: finca?.nombre ?? (bloque?.id_finca != null ? String(bloque.id_finca) : ''),
        }
    }) as Array<Record<string, unknown>>

    return { rows }
}


// Basic fetch for estados_fenologicos (no joins yet)
export async function fetchEstadosFenologicos(): Promise<TableResult> {
    await refreshAllPages<EstadosFenologicos>('estados_fenologicos', db.estados_fenologicos, '*')
    await refreshAllPages<Finca>('finca', db.finca, '*')
    await refreshAllPages<Bloque>('bloque', db.bloque, '*')
    await refreshAllPages<Variedad>('variedad', db.variedad, '*')
    const estados = await readAll<EstadosFenologicos>(db.estados_fenologicos)

    // If no estados, return empty with known columns to avoid Arquero schema issues
    if (!estados.length) return { rows: [] }

    // Normalize: ensure id_finca and id_bloque columns exist on all rows
    const fincaById = await mapByKey<Finca, number>(db.finca as any, estados.map(e => e.id_finca ?? null))
    const bloqueById = await mapByKey<Bloque, number>(db.bloque as any, estados.map(e => e.id_bloque ?? null))
    const variedadById = await mapByKey<Variedad, number>(db.variedad as any, estados.map(e => e.id_variedad ?? null))

    const rows = estados.map(e => ({
        ...e,
        finca: (e.id_finca != null ? fincaById.get(e.id_finca)?.nombre : undefined) ?? (e.id_finca != null ? String(e.id_finca) : ''),
        bloque: (e.id_bloque != null ? bloqueById.get(e.id_bloque)?.nombre : undefined) ?? (e.id_bloque != null ? String(e.id_bloque) : ''),
        variedad: (e.id_variedad != null ? variedadById.get(e.id_variedad)?.nombre : undefined) ?? (e.id_variedad != null ? String(e.id_variedad) : ''),
    })) as Array<Record<string, unknown>>

    return { rows }
}



type Fetcher = () => Promise<TableResult>

const registry: Record<string, Fetcher> = {
    area_productiva: fetchAreaProductiva,
    observaciones_por_cama: fetchObservacionesPorCama,
    resumen_fenologico: fetchResumenFenologico,
    cosecha: async () => {
        // Reuse resumen_fenologico rows and derive cosecha table
        const base = await fetchResumenFenologico()
        const scaled = scaleTimelineToTotals(base.rows as any)
        const lastDays = keepOnlyLastCosechaDay(scaled as any)
        const grouped = sumCosechaByFechaVariedad(lastDays as any)
        return { rows: grouped as Array<Record<string, unknown>>, columns: ['fecha', 'variedad', 'dias_cosecha'] }
    },
    sync: fetchSync,
    finca: fetchFincas,
    bloque: fetchBloque,
    cama: fetchCama,
    grupo_cama: fetchGrupoCama,
    grupo_cama_estado: fetchGrupoCamaEstado,
    grupo_cama_tipo_planta: fetchGrupoCamaTipoPlanta,
    variedad: fetchVariedad,
    breeder: fetchBreeder,
    patron: fetchPatron,
    estado_fenologico_tipo: fetchEstadoFenologicoTipo,
    estados_fenologicos: fetchEstadosFenologicos,
    observacion: fetchObservacion,
    pinche: fetchPinche,
    pinche_tipo: fetchPincheTipo,
    produccion: fetchProduccion,
    puntos_gps: fetchPuntosGPS,
    usuario: fetchUsuario,
    seccion: fetchSeccion,
}

export async function fetchTable(table: string): Promise<TableResult> {
    const fn = registry[table]
    if (fn) return await fn()
    // Generic fallback: simple network fetch without caching
    try {
        const { data } = await supabase.from(table).select('*')
        const rows = (data ?? []) as Array<Record<string, unknown>>
        return { rows }
    } catch {
        return { rows: [] }
    }
}