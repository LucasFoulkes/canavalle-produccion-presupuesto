import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type { Cama, GrupoCama, Bloque, Finca, Variedad, Observacion, Seccion, EstadoFenologicoTipo } from '@/types/tables'
import { readAll, refreshAllPages, toNumber, normText } from '@/lib/data-utils'
import { getStageList, normalizeObservaciones, cmpFechaDescThenFBVThenCamaSeccion } from '@/lib/report-utils'

// Observaciones por Cama, agrupadas también por Sección; lista de estados detectados y área total de la cama
export async function fetchObservacionesPorCama(): Promise<TableResult> {
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

    const [camas, grupos, bloques, fincas, variedades, observaciones, estadosTipo] = await Promise.all([
        readAll<Cama>(db.cama),
        readAll<GrupoCama>(db.grupo_cama),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
        readAll<Variedad>(db.variedad),
        readAll<Observacion>(db.observacion),
        readAll<EstadoFenologicoTipo>(db.estado_fenologico_tipo),
    ])

    if (!observaciones.length) {
        const stageCols: string[] = estadosTipo
            .slice()
            .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.codigo.localeCompare(b.codigo))
            .map((e) => e.codigo)
        return { rows: [], columns: ['finca', 'bloque', 'variedad', 'cama', 'seccion', 'fecha', ...stageCols, 'area_cama_m2'] }
    }

    // Normalize observations with shared helper
    const rows = normalizeObservaciones({ camas, grupos, bloques, fincas, variedades, observaciones })

    // Aggregate per cama (grouping by cama, seccion and fecha for estados), compute total area per cama
    const countsByCamaSeccion = new Map<string, Map<string, number>>()
    const areaByCama = new Map<string, number>()

    for (const r of rows) {
        const keyCama = `${r.finca}||${r.bloque}||${r.variedad}||${r.cama}`
        const keyCamaSeccion = `${keyCama}||${r.seccion}||${r.fecha}`
        // sum cantidades per cama+seccion per normalized estado
        let cmap = countsByCamaSeccion.get(keyCamaSeccion)
        if (!cmap) {
            cmap = new Map<string, number>()
            countsByCamaSeccion.set(keyCamaSeccion, cmap)
        }
        const est = r.estado_norm
        if (est) cmap.set(est, (cmap.get(est) ?? 0) + toNumber(r.cantidad))

        // total area per cama = ancho * largo (not multiplied per observation)
        const area = toNumber(r.ancho_m) * toNumber(r.largo_m)
        // Keep max in case of multiple observations
        areaByCama.set(keyCama, Math.max(areaByCama.get(keyCama) ?? 0, area))
    }

    // Flatten to rows: one row per cama per seccion with estados, and include total area per cama
    // Build stage columns definition
    const stageList = getStageList(estadosTipo)

    const result: Array<Record<string, unknown>> = []
    for (const [keyCamaSeccion, countsMap] of countsByCamaSeccion.entries()) {
        const [finca, bloque, variedad, cama, seccion, fecha] = keyCamaSeccion.split('||')
        const keyCama = `${finca}||${bloque}||${variedad}||${cama}`
        const row: Record<string, unknown> = {
            finca,
            bloque,
            variedad,
            cama,
            seccion,
            fecha,
            area_cama_m2: areaByCama.get(keyCama) ?? 0,
        }
        for (const stage of stageList) {
            const codeNorm = normText(stage.codigo)
            const codeAlt = normText(stage.codigo.split('_').join(' '))
            const v1 = countsMap.get(codeNorm) ?? 0
            const v2 = codeAlt === codeNorm ? 0 : (countsMap.get(codeAlt) ?? 0)
            row[stage.codigo] = v1 + v2
        }
        result.push(row)
    }

    // Sort by date desc, then by finca/bloque/variedad/cama/seccion for stability
    result.sort(cmpFechaDescThenFBVThenCamaSeccion)

    return {
        rows: result, columns: [
            'fecha',
            'finca',
            'bloque',
            'variedad',
            'cama',
            'seccion',
            ...stageList.map(s => s.codigo),
            'area_cama_m2']
    }
}