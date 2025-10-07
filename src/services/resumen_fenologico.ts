import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type {
    Bloque,
    Finca,
    Variedad,
    EstadosFenologicos,
    ObservacionesTipo,
    EstadoFenologicoOrden,
} from '@/types/tables'
import { normText, readAll, refreshAllPages, toNumber } from '@/lib/data-utils'
import { fetchAreaProductiva } from './area_productiva'
import { fetchObservacionesPorCama } from './observaciones_por_cama'
import { toAreaMaps, buildNameMaps, durationsFromRow, cmpFechaDescThenFBV, fbvKeyFromNames, getStageList } from '@/lib/report-utils'

// Resumen fenológico por día para cada Finca–Bloque–Variedad (FBV)
// Para cada fecha, muestra por etapa: "cantidad (porcentaje del área FBV)"
export async function fetchResumenFenologico(): Promise<TableResult> {
    // Use observaciones_por_cama as the data source (already normalized and aggregated)
    const obsPorCamaResult = await fetchObservacionesPorCama()
    const obsPorCamaRows = obsPorCamaResult.rows as Array<Record<string, unknown>>

    // Refresh only the tables we need beyond what observaciones_por_cama already loaded
    await Promise.all([
        refreshAllPages<EstadosFenologicos>('estados_fenologicos', db.estados_fenologicos, '*'),
        refreshAllPages<ObservacionesTipo>('observaciones_tipo', db.observaciones_tipo, '*'),
        refreshAllPages<EstadoFenologicoOrden>('estado_fenologico_orden', db.estado_fenologico_orden, '*'),
        refreshAllPages<Bloque>('bloque', db.bloque, '*'),
        refreshAllPages<Finca>('finca', db.finca, '*'),
        refreshAllPages<Variedad>('variedad', db.variedad, '*'),
    ])

    const [
        estadosRows,
        observacionesTipo,
        estadosOrden,
        bloques,
        fincas,
        variedades,
    ] = await Promise.all([
        readAll<EstadosFenologicos>(db.estados_fenologicos),
        readAll<ObservacionesTipo>(db.observaciones_tipo),
        readAll<EstadoFenologicoOrden>(db.estado_fenologico_orden),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
        readAll<Variedad>(db.variedad),
    ])

    // Get stage list from the observaciones_por_cama columns (excludes already filtered stages)
    const obsCols = obsPorCamaResult.columns || []
    const stageColumns = obsCols.filter(c =>
        !['fecha', 'finca', 'bloque', 'variedad', 'cama', 'seccion', 'porcentaje_area', 'area_cama_m2'].includes(c)
    )
    const stageColumnsSet = new Set(stageColumns.map((c) => normText(c)))

    const stageDefinitions = getStageList(observacionesTipo, estadosOrden)
    const stageList = stageDefinitions.filter((stage) => stageColumnsSet.has(normText(stage.codigo)))

    // Include any stage columns not explicitly defined in the lookup tables to preserve report columns
    for (const column of stageColumns) {
        const norm = normText(column)
        if (!stageList.some((stage) => normText(stage.codigo) === norm)) {
            stageList.push({ codigo: column, orden: null })
        }
    }

    // Area totals by FBV using existing aggregator
    const areaRes = await fetchAreaProductiva()
    const { areaTotalByFBV: areaByFBV, areaProdByFBV } = toAreaMaps(areaRes.rows as Array<Record<string, any>>)

    if (!obsPorCamaRows.length) {
        return { rows: [], columns: ['fecha', 'finca', 'bloque', 'variedad', ...stageList.map((s) => s.codigo)] }
    }

    // Build inflow from observaciones_por_cama rows
    // Structure: Map<FBV, Map<date, Map<stage, {count, area_m2}>>>
    type Payload = { count: number; area_m2: number }
    const inflow = new Map<string, Map<string, Map<string, Payload>>>()

    for (const row of obsPorCamaRows) {
        const finca = String(row.finca || '')
        const bloque = String(row.bloque || '')
        const variedad = String(row.variedad || '')
        const fecha = String(row.fecha || '')
        const fbv = fbvKeyFromNames(finca, bloque, variedad)

        if (!inflow.has(fbv)) inflow.set(fbv, new Map())
        const byDate = inflow.get(fbv)!
        if (!byDate.has(fecha)) byDate.set(fecha, new Map())
        const byStage = byDate.get(fecha)!

        // For each stage column, add to inflow if it has a value
        for (const stageCol of stageColumns) {
            const val = row[stageCol]
            if (val && typeof val === 'number' && val > 0) {
                const stageNorm = normText(stageCol)
                if (!byStage.has(stageNorm)) byStage.set(stageNorm, { count: 0, area_m2: 0 })
                const p = byStage.get(stageNorm)!
                p.count += val
                // Use porcentaje_area to back-calculate area if available
                const pct = toNumber(row.porcentaje_area)
                const totalArea = areaByFBV.get(fbv) || 0
                const estimatedArea = totalArea > 0 && pct > 0 ? (totalArea * pct / 100) : 0
                p.area_m2 += estimatedArea
            }
        }
    }

    // Track which FBV+date combinations have actual observations (from the inflow map)
    // These are the actual observation dates that should be highlighted
    const actualObservationFBVDates = new Set<string>()
    for (const [fbv, byDate] of inflow.entries()) {
        for (const date of byDate.keys()) {
            const key = `${fbv}||${date}`
            actualObservationFBVDates.add(key)
        }
    }

    // Durations per FBV based on estados_fenologicos (use latest row if multiple)
    // dias_* mapping now handled by durationsFromRow()

    // Build ID->name maps for friendly keying consistent with observation joins
    const { fincaNameById, bloqueNameById, variedadNameById } = buildNameMaps(fincas, bloques, variedades)

    // Group estados by FBV using display-name key to match inflow keys
    const estadosByFBVName = new Map<string, EstadosFenologicos>()
    const estadosByFBVId = new Map<string, EstadosFenologicos>()
    for (const e of estadosRows) {
        const fincaId = e.id_finca != null ? String(e.id_finca) : ''
        const bloqueId = e.id_bloque != null ? String(e.id_bloque) : ''
        const variedadId = e.id_variedad != null ? String(e.id_variedad) : ''
        const nameKey = fbvKeyFromNames(fincaNameById.get(fincaId) ?? fincaId, bloqueNameById.get(bloqueId) ?? bloqueId, variedadNameById.get(variedadId) ?? variedadId)
        const idKey = fbvKeyFromNames(fincaId, bloqueId, variedadId)

        const prevName = estadosByFBVName.get(nameKey)
        const prevId = estadosByFBVId.get(idKey)
        // keep latest by creado_en
        if (!prevName || ((e.creado_en ?? '') > (prevName.creado_en ?? ''))) {
            estadosByFBVName.set(nameKey, e)
        }
        if (!prevId || ((e.creado_en ?? '') > (prevId.creado_en ?? ''))) {
            estadosByFBVId.set(idKey, e)
        }
    }

    // Build ordered stage list from lookup tables, limited to the columns present in the aggregated observations
    // Build per-FBV durations for the known stage codes present in stageList
    function buildDurationsForFBV(fbv: string): Map<string, number> {
        // Try exact name-key match; fallback to ID-key if the slug looks like IDs
        let row = estadosByFBVName.get(fbv)
        if (!row) {
            const [f, b, v] = fbv.split('||')
            const idKey = fbvKeyFromNames(f, b, v)
            row = estadosByFBVId.get(idKey)
        }
        return durationsFromRow(row, stageList)
    }

    // Utility to iterate dates
    function addDays(iso: string, days: number): string {
        const dt = new Date(iso + 'T00:00:00')
        dt.setDate(dt.getDate() + days)
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    }

    const result: Array<Record<string, unknown>> = []

    // Simulate per FBV
    for (const [fbv, byDate] of inflow.entries()) {
        const durations = buildDurationsForFBV(fbv)
        // determine date window for this FBV
        const dates = Array.from(byDate.keys()).sort()
        const localMin = dates[0]
        const localMax = dates[dates.length - 1]
        // window extension = sum of durations across stages as an upper bound
        let windowExtend = 0
        for (const st of stageList) windowExtend += durations.get(normText(st.codigo)) ?? 1
        // endDate no longer required due to dynamic termination condition

        // Prepare schedules
        const arrivals = new Map<string, Map<string, Payload>>() // date -> stage -> payload arriving this day (from previous stage or external inflow)
        const outflows = new Map<string, Map<string, Payload>>() // date -> stage -> payload leaving today
        const wipCount = new Map<string, number>() // stage -> current count
        const wipArea = new Map<string, number>() // stage -> current area

        const areaTotal = areaByFBV.get(fbv) ?? 0
        const areaProd = areaProdByFBV.get(fbv) ?? 0

        // Helper to add to map
        function addTo(map: Map<string, Map<string, Payload>>, date: string, stage: string, payload: Payload) {
            if (!map.has(date)) map.set(date, new Map())
            const m = map.get(date)!
            if (!m.has(stage)) m.set(stage, { count: 0, area_m2: 0 })
            const p = m.get(stage)!
            p.count += payload.count
            p.area_m2 += payload.area_m2
        }

        // Seed only external arrivals; scheduling is handled during daily loop
        for (const [date, stMap] of byDate.entries()) {
            for (const [st, p] of stMap.entries()) {
                addTo(arrivals, date, st, p)
            }
        }

        // Iterate dates starting at localMin until no more WIP/arrivals/outflows remain after localMax
        for (let d = localMin; ; d = addDays(d, 1)) {
            // apply outflows first (items leaving are not counted today)
            const outToday = outflows.get(d)
            if (outToday) {
                for (const [st, p] of outToday.entries()) {
                    const newCount = (wipCount.get(st) ?? 0) - p.count
                    const newArea = (wipArea.get(st) ?? 0) - p.area_m2
                    wipCount.set(st, newCount < 0 ? 0 : newCount)
                    wipArea.set(st, newArea < 0 ? 0 : newArea)
                }
                // remove processed day
                outflows.delete(d)
            }
            // apply arrivals today
            const inToday = arrivals.get(d)
            if (inToday) {
                for (const [st, p] of inToday.entries()) {
                    const incCount = (wipCount.get(st) ?? 0) + p.count
                    const incArea = (wipArea.get(st) ?? 0) + p.area_m2
                    wipCount.set(st, incCount < 0 ? 0 : incCount)
                    wipArea.set(st, incArea < 0 ? 0 : incArea)
                    // arrival implies we must also schedule its outflow and next stage arrival if not already scheduled
                    const dur = durations.get(st) ?? 1
                    const outDate = addDays(d, dur)
                    addTo(outflows, outDate, st, p)
                    const idx = stageList.findIndex(s => normText(s.codigo) === st)
                    const next = stageList[idx + 1]
                    if (next) {
                        const nextCode = normText(next.codigo)
                        addTo(arrivals, outDate, nextCode, p)
                    }
                }
                // remove processed day
                arrivals.delete(d)
            }

            // Snapshot row for this day
            const [finca, bloque, variedad] = fbv.split('||')
            const fbvDateKey = `${fbv}||${d}`
            const row: Record<string, unknown> = {
                fecha: d,
                finca,
                bloque,
                variedad,
                _isNewObservation: actualObservationFBVDates.has(fbvDateKey) // metadata for styling - marks rows with actual observations
            }
            let hasData = false
            for (const st of stageList) {
                const code = normText(st.codigo)
                const c = wipCount.get(code) ?? 0
                const a = wipArea.get(code) ?? 0
                // Prefer productiva area; fallback to total area
                const denom = areaProd || areaTotal
                const pct = denom > 0 ? ((a / denom) * 100) : 0
                if (c > 0) {
                    row[st.codigo] = `${c} (${pct.toFixed(1)}%)`
                    hasData = true
                } else {
                    row[st.codigo] = ''
                }
            }
            if (hasData) result.push(row)

            // Stop once we passed last external inflow date and no more scheduled arrivals/outflows and no WIP remains
            if (d >= localMax && arrivals.size === 0 && outflows.size === 0) {
                let totalWip = 0
                for (const v of wipCount.values()) totalWip += v
                if (totalWip === 0) break
            }
        }
    }

    // Sort by fecha desc, then FBV for stability
    result.sort(cmpFechaDescThenFBV)

    console.log('Resumen fenologico: Total rows generated:', result.length)
    console.log('Resumen fenologico: Stage columns:', stageList.map(s => s.codigo))

    return { rows: result, columns: ['fecha', 'finca', 'bloque', 'variedad', ...stageList.map(s => s.codigo)] }
}
