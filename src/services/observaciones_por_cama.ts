import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type {
    Cama,
    GrupoCama,
    Bloque,
    Finca,
    Variedad,
    Observacion,
    Seccion,
    ObservacionesTipo,
    EstadoFenologicoOrden,
} from '@/types/tables'
import { readAll, refreshAllPages, toNumber, normText } from '@/lib/data-utils'
import { getStageList, normalizeObservaciones, cmpFechaDescThenFBVThenCamaSeccion, fbvKeyFromNames } from '@/lib/report-utils'

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
        refreshAllPages<ObservacionesTipo>('observaciones_tipo', db.observaciones_tipo, '*'),
        refreshAllPages<EstadoFenologicoOrden>('estado_fenologico_orden', db.estado_fenologico_orden, '*'),
    ])

    const [
        camas,
        grupos,
        bloques,
        fincas,
        variedades,
        observaciones,
        observacionesTipo,
        estadosOrden,
    ] = await Promise.all([
        readAll<Cama>(db.cama),
        readAll<GrupoCama>(db.grupo_cama),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
        readAll<Variedad>(db.variedad),
        readAll<Observacion>(db.observacion),
        readAll<ObservacionesTipo>(db.observaciones_tipo),
        readAll<EstadoFenologicoOrden>(db.estado_fenologico_orden),
    ])

    const stageList = getStageList(observacionesTipo, estadosOrden)

    if (!observaciones.length) {
        const stageCols: string[] = stageList.map((e) => e.codigo)
        return { rows: [], columns: ['finca', 'bloque', 'variedad', 'cama', 'seccion', 'fecha', ...stageCols, 'porcentaje_area', 'area_cama_m2'] }
    }

    // Build lookup maps
    const grupoById = new Map(grupos.map(g => [g.id_grupo, g]))
    const bloqueById = new Map(bloques.map(b => [b.id_bloque, b]))
    const fincaById = new Map(fincas.map(f => [f.id_finca, f]))
    const variedadById = new Map(variedades.map(v => [v.id_variedad, v]))

    // Calculate area per cama and total area per FBV from cama records
    const areaByCama = new Map<string, number>()
    const areaByFBV = new Map<string, number>()
    const camaToFBVKey = new Map<string, string>()

    for (const cama of camas) {
        const grupo = grupoById.get(cama.id_grupo)
        if (!grupo) continue
        const bloque = bloqueById.get(grupo.id_bloque)
        if (!bloque) continue
        const finca = fincaById.get(bloque.id_finca ?? 0)
        if (!finca) continue
        const variedad = variedadById.get(grupo.id_variedad)
        if (!variedad) continue

        const fincaNombre = finca.nombre
        const bloqueNombre = bloque.nombre
        const variedadNombre = variedad.nombre
        const camaNombre = cama.nombre

        const keyCama = `${fincaNombre}||${bloqueNombre}||${variedadNombre}||${camaNombre}`
        const keyFBV = fbvKeyFromNames(fincaNombre, bloqueNombre, variedadNombre)

        const ancho = toNumber(cama.ancho_metros)
        const largo = toNumber(cama.largo_metros)
        const area = ancho * largo

        areaByCama.set(keyCama, area)
        camaToFBVKey.set(keyCama, keyFBV)
        areaByFBV.set(keyFBV, (areaByFBV.get(keyFBV) ?? 0) + area)
    }

    // Normalize observations with shared helper
    const rows = normalizeObservaciones({ camas, grupos, bloques, fincas, variedades, observaciones })

    // Aggregate per cama (grouping by cama, seccion and fecha for estados)
    const countsByCamaSeccion = new Map<string, Map<string, number>>()

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
    }

    // Flatten to rows: one row per cama per seccion with estados, and include total area per cama
    // Build stage columns definition
    const result: Array<Record<string, unknown>> = []
    for (const [keyCamaSeccion, countsMap] of countsByCamaSeccion.entries()) {
        const [finca, bloque, variedad, cama, seccion, fecha] = keyCamaSeccion.split('||')
        const keyCama = `${finca}||${bloque}||${variedad}||${cama}`
        const keyFBV = fbvKeyFromNames(finca, bloque, variedad)

        // Calculate percentage of total FBV area
        const camaArea = areaByCama.get(keyCama) ?? 0
        const totalFBVArea = areaByFBV.get(keyFBV) ?? 0
        const percentage = totalFBVArea > 0 ? (camaArea / totalFBVArea) * 100 : 0

        const row: Record<string, unknown> = {
            finca,
            bloque,
            variedad,
            cama,
            seccion,
            fecha,
            area_cama_m2: areaByCama.get(keyCama) ?? 0,
            porcentaje_area: percentage,
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
            'porcentaje_area',
            'area_cama_m2']
    }
}