import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type { Cama, GrupoCama, Bloque, Finca, Variedad, Observacion, Seccion, EstadoFenologicoTipo } from '@/types/tables'
import * as aq from 'arquero'
import { normText, readAll, refreshAllPages, toNumber } from '@/lib/data-utils'

// Observaciones por Finca–Bloque–Variedad y Sección, incluyendo estados detectados y área de la sección
export async function fetchObservacionesPorSeccion(): Promise<TableResult> {
    // Refresh all required tables (best-effort, paginated)
    await Promise.all([
        refreshAllPages<Cama>('cama', db.cama, '*'),
        refreshAllPages<GrupoCama>('grupo_cama', db.grupo_cama, '*'),
        refreshAllPages<Bloque>('bloque', db.bloque, '*'),
        refreshAllPages<Finca>('finca', db.finca, '*'),
        refreshAllPages<Variedad>('variedad', db.variedad, '*'),
        refreshAllPages<Observacion>('observacion', db.observacion, '*'),
        refreshAllPages<Seccion & { id?: number }>('seccion', db.seccion, '*'),
        refreshAllPages<EstadoFenologicoTipo>('estado_fenologico_tipo', db.estado_fenologico_tipo, '*'),
    ])

    const [camas, grupos, bloques, fincas, variedades, observaciones, secciones, estadosTipo] = await Promise.all([
        readAll<Cama>(db.cama),
        readAll<GrupoCama>(db.grupo_cama),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
        readAll<Variedad>(db.variedad),
        readAll<Observacion>(db.observacion),
        readAll<Seccion & { id?: number }>(db.seccion),
        readAll<EstadoFenologicoTipo>(db.estado_fenologico_tipo),
    ])

    if (!observaciones.length) {
        const stageCols: string[] = estadosTipo
            .slice()
            .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.codigo.localeCompare(b.codigo))
            .map((e) => e.codigo)
        return { rows: [], columns: ['finca', 'bloque', 'variedad', 'seccion', ...stageCols, 'area_seccion_m2'] }
    }

    // Build normalized tables for joins
    const tObs = aq.from(observaciones)
    const tCama = aq.from(camas).rename({ nombre: 'cama_nombre' })
    const tGrupo = aq.from(grupos).rename({ id_bloque: 'grupo_id_bloque', id_variedad: 'grupo_id_variedad' })
    const tBloque = aq.from(bloques).rename({ nombre: 'bloque_nombre', id_finca: 'bloque_id_finca' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })
    const tVariedad = aq.from(variedades).rename({ nombre: 'variedad_nombre' })
    // seccion table has only largo_m; we treat ubicacion_seccion string as the section key label
    const seccionLargoMap = new Map<number, number>()
    // If 'seccion' table has a single row with a global largo_m, use it as default
    if (secciones.length === 1 && typeof secciones[0]?.largo_m !== 'undefined') {
        seccionLargoMap.set(0, toNumber(secciones[0].largo_m))
    }

    // Join obs -> cama -> grupo -> bloque -> finca/variedad
    const joined = tObs
        .join_left(tCama, ['id_cama', 'id_cama'])
        .join_left(tGrupo, ['id_grupo', 'id_grupo'])
        .join_left(tBloque, ['grupo_id_bloque', 'id_bloque'])
        .join_left(tFinca, ['bloque_id_finca', 'id_finca'])
        .join_left(tVariedad, ['grupo_id_variedad', 'id_variedad'])
        .derive({
            finca: aq.escape((d: { finca_nombre?: string | null; bloque_id_finca?: number | null }) =>
                d.finca_nombre ?? (d.bloque_id_finca != null ? String(d.bloque_id_finca) : '')
            ),
            bloque: aq.escape((d: { bloque_nombre?: string | null; grupo_id_bloque?: number | null }) =>
                d.bloque_nombre ?? (d.grupo_id_bloque != null ? String(d.grupo_id_bloque) : '')
            ),
            variedad: aq.escape((d: { variedad_nombre?: string | null; grupo_id_variedad?: number | null }) =>
                d.variedad_nombre ?? (d.grupo_id_variedad != null ? String(d.grupo_id_variedad) : '')
            ),
            seccion: aq.escape((d: { ubicacion_seccion?: string | null }) => (d.ubicacion_seccion ?? '').toString()),
            ancho_m: aq.escape((d: { ancho_metros?: number | string | null }) => toNumber(d.ancho_metros)),
            largo_m: aq.escape(() => seccionLargoMap.get(0) ?? 0),
            estado: aq.escape((d: { tipo_observacion?: string | null }) => (d.tipo_observacion ?? '').toString().trim()),
            cantidad: aq.escape((d: { cantidad?: number | string | null }) => toNumber(d.cantidad)),
        })
        .select('finca', 'bloque', 'variedad', 'seccion', 'estado', 'cantidad', 'ancho_m', 'largo_m')

    type Row = { finca: string; bloque: string; variedad: string; seccion: string; estado: string; cantidad: number; ancho_m: number; largo_m: number }
    const rows = joined.objects() as Row[]

    // Build stage column list from estado_fenologico_tipo
    const stageList = estadosTipo
        .slice()
        .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.codigo.localeCompare(b.codigo))
    const stageCols = stageList.map((e) => e.codigo)

    // Aggregate: group by FBV + seccion. Sum cantidades per stage and compute area using ancho * largo_m.
    const byKey = new Map<string, { finca: string; bloque: string; variedad: string; seccion: string; counts: Map<string, number>; area_seccion_m2: number }>()
    for (const r of rows) {
        const key = `${r.finca}||${r.bloque}||${r.variedad}||${r.seccion}`
        const current = byKey.get(key)
        if (!current) {
            byKey.set(key, { finca: r.finca, bloque: r.bloque, variedad: r.variedad, seccion: r.seccion, counts: new Map<string, number>(), area_seccion_m2: 0 })
        }
        const agg = byKey.get(key)!
        // Sum cantidades per normalized stage name
        const est = normText(r.estado)
        if (est) agg.counts.set(est, (agg.counts.get(est) ?? 0) + toNumber(r.cantidad))
        // Area: ancho of cama × seccion largo
        const area = toNumber(r.ancho_m) * toNumber(r.largo_m)
        // If multiple observations in the same seccion, area should not stack; take max as a safe guard
        agg.area_seccion_m2 = Math.max(agg.area_seccion_m2, area)
    }

    const result = Array.from(byKey.values()).map((g) => {
        const row: Record<string, unknown> = {
            finca: g.finca,
            bloque: g.bloque,
            variedad: g.variedad,
            seccion: g.seccion,
            area_seccion_m2: g.area_seccion_m2,
        }
        // Fill stage columns with total cantidades per stage (sum)
        for (const stage of stageList) {
            const codeNorm = normText(stage.codigo)
            const codeAlt = normText(stage.codigo.split('_').join(' '))
            const v1 = g.counts.get(codeNorm) ?? 0
            const v2 = codeAlt === codeNorm ? 0 : (g.counts.get(codeAlt) ?? 0)
            row[stage.codigo] = v1 + v2
        }
        return row
    })

    return { rows: result, columns: ['finca', 'bloque', 'variedad', 'seccion', ...stageCols, 'area_seccion_m2'] }
}