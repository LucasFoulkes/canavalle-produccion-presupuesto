import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type {
    Cama,
    GrupoCama,
    Bloque,
    Finca,
    Variedad,
    Observacion,
    ObservacionesTipo,
    EstadoFenologicoOrden,
} from '@/types/tables'
import { readAll, refreshAllPages, toNumber, normText } from '@/lib/data-utils'
import { getStageList, normalizeObservaciones, fbvKeyFromNames } from '@/lib/report-utils'

// Variación por día: analiza las diferencias entre camas observadas el mismo día para cada FBV
export async function fetchVariacionPorDia(): Promise<TableResult> {
    await Promise.all([
        refreshAllPages<Cama>('cama', db.cama, '*'),
        refreshAllPages<GrupoCama>('grupo_cama', db.grupo_cama, '*'),
        refreshAllPages<Bloque>('bloque', db.bloque, '*'),
        refreshAllPages<Finca>('finca', db.finca, '*'),
        refreshAllPages<Variedad>('variedad', db.variedad, '*'),
        refreshAllPages<Observacion>('observacion', db.observacion, '*'),
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

    if (!observaciones.length) {
        return { rows: [], columns: ['fecha', 'finca', 'bloque', 'variedad', 'num_camas'] }
    }

    // Normalize observations
    const normalized = normalizeObservaciones({ camas, grupos, bloques, fincas, variedades, observaciones })

    // Get stage list
    const stageList = getStageList(observacionesTipo, estadosOrden)

    // Build area lookup for camas and calculate total FBV areas
    const grupoById = new Map(grupos.map(g => [g.id_grupo, g]))
    const bloqueById = new Map(bloques.map(b => [b.id_bloque, b]))
    const fincaById = new Map(fincas.map(f => [f.id_finca, f]))
    const variedadById = new Map(variedades.map(v => [v.id_variedad, v]))

    const camaAreas = new Map<string, number>()
    const fbvTotalAreas = new Map<string, number>()

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
        const fbvKey = fbvKeyFromNames(fincaNombre, bloqueNombre, variedadNombre)
        const camaKey = fbvKey + `||${camaNombre}`

        const area = toNumber(cama.ancho_metros) * toNumber(cama.largo_metros)
        camaAreas.set(camaKey, area)

        // Accumulate total area for productive camas in this FBV
        const isProductivo = normText(grupo.estado) === 'productivo'
        if (isProductivo) {
            fbvTotalAreas.set(fbvKey, (fbvTotalAreas.get(fbvKey) ?? 0) + area)
        }
    }

    // Group observations by FBV + Date + Cama + Stage
    type ObsKey = { fbv: string; fecha: string; cama: string; stage: string }
    const obsByCamaStage = new Map<string, { key: ObsKey; count: number; area: number }>()

    for (const obs of normalized) {
        const fbv = fbvKeyFromNames(obs.finca, obs.bloque, obs.variedad)
        const fecha = obs.fecha
        const cama = obs.cama
        const stage = obs.estado_norm
        const count = obs.cantidad

        if (!stage || count <= 0) continue

        const camaKey = `${fbv}||${cama}`
        const area = camaAreas.get(camaKey) ?? 0
        const obsKey = `${fbv}||${fecha}||${cama}||${stage}`

        if (!obsByCamaStage.has(obsKey)) {
            obsByCamaStage.set(obsKey, {
                key: { fbv, fecha, cama, stage },
                count: 0,
                area
            })
        }
        const entry = obsByCamaStage.get(obsKey)!
        entry.count += count
    }

    // Group by FBV + Date + Stage to calculate variation across camas
    type VariationData = {
        fecha: string
        finca: string
        bloque: string
        variedad: string
        num_camas: number
        area_observada_m2: number
        porcentaje_area: number
        densidad_brotes: number
        [key: string]: unknown // For stage columns
    }

    const variationByFBVDate = new Map<string, VariationData>()

    // Organize by FBV + Date + Stage
    const dataByFBVDateStage = new Map<string, Map<string, Array<{ cama: string; count: number; area: number }>>>()

    for (const [, obsData] of obsByCamaStage.entries()) {
        const { fbv, fecha, cama, stage } = obsData.key
        const fbvDateKey = `${fbv}||${fecha}`

        if (!dataByFBVDateStage.has(fbvDateKey)) {
            dataByFBVDateStage.set(fbvDateKey, new Map())
        }
        const byStage = dataByFBVDateStage.get(fbvDateKey)!

        if (!byStage.has(stage)) {
            byStage.set(stage, [])
        }
        byStage.get(stage)!.push({ cama, count: obsData.count, area: obsData.area })
    }

    // Calculate variation statistics for each FBV + Date
    for (const [fbvDateKey, stageData] of dataByFBVDateStage.entries()) {
        const [finca, bloque, variedad, fecha] = fbvDateKey.split('||')
        const fbvKey = fbvKeyFromNames(finca, bloque, variedad)

        // Count unique camas observed and calculate total area observed
        const allCamas = new Set<string>()
        let areaObservada = 0
        for (const camaDataList of stageData.values()) {
            for (const c of camaDataList) {
                if (!allCamas.has(c.cama)) {
                    allCamas.add(c.cama)
                    areaObservada += c.area
                }
            }
        }
        const num_camas = allCamas.size

        // Calculate total shoots across all stages
        let totalBrotes = 0
        for (const camaDataList of stageData.values()) {
            for (const c of camaDataList) {
                totalBrotes += c.count
            }
        }

        // Calculate percentage of total FBV area
        const fbvTotalArea = fbvTotalAreas.get(fbvKey) ?? 0
        const porcentajeArea = fbvTotalArea > 0 ? (areaObservada / fbvTotalArea) * 100 : 0

        // Calculate shoot density (shoots per m2)
        const densidadBrotes = areaObservada > 0 ? totalBrotes / areaObservada : 0

        const row: VariationData = {
            fecha,
            finca,
            bloque,
            variedad,
            num_camas,
            area_observada_m2: Math.round(areaObservada * 100) / 100,
            porcentaje_area: Math.round(porcentajeArea * 100) / 100,
            densidad_brotes: Math.round(densidadBrotes * 100) / 100,
        }

        // For each stage, calculate variation metrics
        let totalWeightedVariation = 0
        let totalShootsForWeighting = 0

        for (const stage of stageList) {
            const stageNorm = normText(stage.codigo)
            const camaData = stageData.get(stageNorm) || []

            if (camaData.length === 0) {
                row[`${stage.codigo}_variacion`] = 0
                continue
            }

            // Weighted average by area
            let totalWeightedCount = 0
            let totalArea = 0
            for (const c of camaData) {
                totalWeightedCount += c.count * c.area
                totalArea += c.area
            }
            const weightedAvg = totalArea > 0 ? totalWeightedCount / totalArea : 0

            // Calculate variation (standard deviation weighted by area)
            let varianceSum = 0
            for (const c of camaData) {
                const deviation = (c.count - weightedAvg)
                varianceSum += (deviation * deviation) * c.area
            }
            const variance = totalArea > 0 ? varianceSum / totalArea : 0
            const stdDev = Math.sqrt(variance)

            row[`${stage.codigo}_variacion`] = Math.round(stdDev * 100) / 100

            // Accumulate for total variation calculation
            const stageShootCount = camaData.reduce((sum, c) => sum + c.count, 0)
            if (stageShootCount > 0) {
                totalWeightedVariation += stdDev * stageShootCount
                totalShootsForWeighting += stageShootCount
            }
        }

        // Calculate total variation as weighted average of stage variations
        const variacionTotal = totalShootsForWeighting > 0
            ? totalWeightedVariation / totalShootsForWeighting
            : 0
        row.variacion_total = Math.round(variacionTotal * 100) / 100

        variationByFBVDate.set(fbvDateKey, row)
    }

    const result = Array.from(variationByFBVDate.values())

    // Sort by fecha desc, then FBV
    result.sort((a, b) => {
        const dateCmp = b.fecha.localeCompare(a.fecha)
        if (dateCmp !== 0) return dateCmp
        const fincaCmp = a.finca.localeCompare(b.finca)
        if (fincaCmp !== 0) return fincaCmp
        const bloqueCmp = a.bloque.localeCompare(b.bloque)
        if (bloqueCmp !== 0) return bloqueCmp
        return a.variedad.localeCompare(b.variedad)
    })

    // Build column list
    const stageColumns: string[] = []
    for (const stage of stageList) {
        stageColumns.push(`${stage.codigo}_variacion`)
    }

    return {
        rows: result,
        columns: ['fecha', 'finca', 'bloque', 'variedad', 'num_camas', 'area_observada_m2', 'porcentaje_area', 'densidad_brotes', 'variacion_total', ...stageColumns]
    }
}
