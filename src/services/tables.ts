import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Finca, Bloque, Cama, GrupoCama, Variedad, Breeder } from '@/types/tables'
import type { TableFetcherConfig, TableResult } from './table-registry'
import { buildRegistry } from './table-registry'
import { fetchAreaProductiva } from './area_productiva'
import { fetchObservacionesPorCama } from './observaciones_por_cama'
import { fetchResumenFenologico } from './resumen_fenologico'
import { fetchVariacionPorDia } from './variacion_por_dia'
import { keepOnlyLastCosechaDay, scaleTimelineToTotals, sumCosechaByFechaVariedad } from '@/lib/predicciones'

type SimpleRow = Record<string, unknown>

type AnyConfig = TableFetcherConfig<any>

const tableConfigs: AnyConfig[] = [
    { key: 'finca', table: 'finca', store: db.finca },
    { key: 'observaciones_tipo', table: 'observaciones_tipo', store: db.observaciones_tipo },
    { key: 'estado_fenologico_orden', table: 'estado_fenologico_orden', store: db.estado_fenologico_orden },
    { key: 'pinche', table: 'pinche', store: db.pinche },
    { key: 'produccion', table: 'produccion', store: db.produccion },
    { key: 'grupo_cama_estado', table: 'grupo_cama_estado', store: db.grupo_cama_estado },
    { key: 'grupo_cama_tipo_planta', table: 'grupo_cama_tipo_planta', store: db.grupo_cama_tipo_planta },
    { key: 'patron', table: 'patron', store: db.patron },
    { key: 'pinche_tipo', table: 'pinche_tipo', store: db.pinche_tipo },
    { key: 'puntos_gps', table: 'puntos_gps', store: db.puntos_gps },
    { key: 'seccion', table: 'seccion', store: db.seccion },
    { key: 'usuario', table: 'usuario', store: db.usuario },
    { key: 'sync', table: 'sync', store: db.sync },
    { key: 'breeder', table: 'breeder', store: db.breeder },
    {
        key: 'bloque',
        table: 'bloque',
        store: db.bloque,
        dependencies: [{ key: 'fincas', table: 'finca', store: db.finca }],
        transform: ({ rows, deps }) => {
            const fincaMap = new Map((deps.fincas as Finca[]).map((f) => [f.id_finca, f]))
            return rows.map((row) => {
                const id = row.id_finca ?? null
                const finca = id != null ? fincaMap.get(id) : undefined
                return {
                    ...row,
                    finca: id != null ? (finca?.nombre ?? String(id)) : '',
                } satisfies SimpleRow
            })
        },
    },
    {
        key: 'grupo_cama',
        table: 'grupo_cama',
        store: db.grupo_cama,
        dependencies: [
            { key: 'bloques', table: 'bloque', store: db.bloque },
            { key: 'fincas', table: 'finca', store: db.finca },
        ],
        transform: ({ rows, deps }) => {
            const bloqueMap = new Map((deps.bloques as Bloque[]).map((b) => [b.id_bloque, b]))
            const fincaMap = new Map((deps.fincas as Finca[]).map((f) => [f.id_finca, f]))
            return rows.map((row) => {
                const bloque = row.id_bloque != null ? bloqueMap.get(row.id_bloque) : undefined
                const finca = bloque?.id_finca != null ? fincaMap.get(bloque.id_finca) : undefined
                return {
                    ...row,
                    bloque: bloque?.nombre ?? (bloque?.id_bloque != null ? String(bloque.id_bloque) : ''),
                    finca: finca?.nombre ?? (bloque?.id_finca != null ? String(bloque.id_finca) : ''),
                } satisfies SimpleRow
            })
        },
    },
    {
        key: 'variedad',
        table: 'variedad',
        store: db.variedad,
        dependencies: [{ key: 'breeders', table: 'breeder', store: db.breeder }],
        transform: ({ rows, deps }) => {
            const breederMap = new Map((deps.breeders as Breeder[]).map((b) => [b.id_breeder, b]))
            return rows.map((row) => {
                const id = row.id_breeder ?? null
                const breeder = id != null ? breederMap.get(id) : undefined
                return {
                    ...row,
                    breeder: id != null ? (breeder?.nombre ?? String(id)) : '',
                } satisfies SimpleRow
            })
        },
    },
    {
        key: 'observacion',
        table: 'observacion',
        store: db.observacion,
        dependencies: [{ key: 'camas', table: 'cama', store: db.cama }],
        transform: ({ rows, deps }) => {
            const camaMap = new Map((deps.camas as Cama[]).map((c) => [c.id_cama, c]))
            return rows.map((row) => {
                const id = row.id_cama ?? null
                const cama = id != null ? camaMap.get(id) : undefined
                return {
                    ...row,
                    cama: id != null ? (cama?.nombre ?? String(id)) : '',
                } satisfies SimpleRow
            })
        },
    },
    {
        key: 'cama',
        table: 'cama',
        store: db.cama,
        dependencies: [
            { key: 'grupos', table: 'grupo_cama', store: db.grupo_cama },
            { key: 'bloques', table: 'bloque', store: db.bloque },
            { key: 'fincas', table: 'finca', store: db.finca },
        ],
        transform: ({ rows, deps }) => {
            const grupoMap = new Map((deps.grupos as GrupoCama[]).map((g) => [g.id_grupo, g]))
            const bloqueMap = new Map((deps.bloques as Bloque[]).map((b) => [b.id_bloque, b]))
            const fincaMap = new Map((deps.fincas as Finca[]).map((f) => [f.id_finca, f]))
            return rows.map((row) => {
                const grupo = row.id_grupo != null ? grupoMap.get(row.id_grupo) : undefined
                const bloque = grupo?.id_bloque != null ? bloqueMap.get(grupo.id_bloque) : undefined
                const finca = bloque?.id_finca != null ? fincaMap.get(bloque.id_finca) : undefined
                return {
                    ...row,
                    bloque: bloque?.nombre ?? (bloque?.id_bloque != null ? String(bloque.id_bloque) : ''),
                    finca: finca?.nombre ?? (bloque?.id_finca != null ? String(bloque.id_finca) : ''),
                } satisfies SimpleRow
            })
        },
    },
    {
        key: 'estados_fenologicos',
        table: 'estados_fenologicos',
        store: db.estados_fenologicos,
        dependencies: [
            { key: 'fincas', table: 'finca', store: db.finca },
            { key: 'bloques', table: 'bloque', store: db.bloque },
            { key: 'variedades', table: 'variedad', store: db.variedad },
        ],
        transform: ({ rows, deps }) => {
            const fincaMap = new Map((deps.fincas as Finca[]).map((f) => [f.id_finca, f]))
            const bloqueMap = new Map((deps.bloques as Bloque[]).map((b) => [b.id_bloque, b]))
            const variedadMap = new Map((deps.variedades as Variedad[]).map((v) => [v.id_variedad, v]))
            return rows.map((row) => {
                const finca = row.id_finca != null ? fincaMap.get(row.id_finca) : undefined
                const bloque = row.id_bloque != null ? bloqueMap.get(row.id_bloque) : undefined
                const variedad = row.id_variedad != null ? variedadMap.get(row.id_variedad) : undefined
                return {
                    ...row,
                    finca: row.id_finca != null ? (finca?.nombre ?? String(row.id_finca)) : '',
                    bloque: row.id_bloque != null ? (bloque?.nombre ?? String(row.id_bloque)) : '',
                    variedad: row.id_variedad != null ? (variedad?.nombre ?? String(row.id_variedad)) : '',
                } satisfies SimpleRow
            })
        },
    },
]

const baseRegistry = buildRegistry(tableConfigs)

const customRegistry: Record<string, () => Promise<TableResult>> = {
    area_productiva: fetchAreaProductiva,
    observaciones_por_cama: fetchObservacionesPorCama,
    resumen_fenologico: fetchResumenFenologico,
    variacion_por_dia: fetchVariacionPorDia,
    cosecha: async () => {
        const base = await fetchResumenFenologico()
        const scaled = scaleTimelineToTotals(base.rows as any)
        const lastDays = keepOnlyLastCosechaDay(scaled as any)
        const grouped = sumCosechaByFechaVariedad(lastDays as any)
        return { rows: grouped as Array<Record<string, unknown>>, columns: ['fecha', 'finca', 'bloque', 'variedad', 'dias_cosecha'] }
    },
}

export const tableRegistry: Record<string, () => Promise<TableResult>> = {
    ...baseRegistry,
    ...customRegistry,
}

export async function fetchTable(table: string): Promise<TableResult> {
    const fn = tableRegistry[table]
    if (fn) {
        return await fn()
    }
    try {
        const { data } = await supabase.from(table).select('*')
        return { rows: (data ?? []) as Array<Record<string, unknown>> }
    } catch {
        return { rows: [] }
    }
}

export type { TableResult } from './table-registry'