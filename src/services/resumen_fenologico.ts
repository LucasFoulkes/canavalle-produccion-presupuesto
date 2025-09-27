import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type { Cama, GrupoCama, Bloque, Finca, Variedad, Observacion, Seccion, EstadoFenologicoTipo, EstadosFenologicos } from '@/types/tables'
import { normText, readAll, refreshAllPages, toNumber } from '@/lib/data-utils'
import { fetchAreaProductiva } from './area_productiva'
import { getStageList, toAreaMaps, normalizeObservaciones, buildInflowByFBVDateStage, buildNameMaps, durationsFromRow, cmpFechaDescThenFBV } from '@/lib/report-utils'

// Resumen fenológico por día para cada Finca–Bloque–Variedad (FBV)
// Para cada fecha, muestra por etapa: "cantidad (porcentaje del área FBV)"
export async function fetchResumenFenologico(): Promise<TableResult> {
    // Refresh required tables (best-effort, paginated)
    await Promise.all([
        refreshAllPages<Cama>('cama', db.cama, '*'),
        refreshAllPages<GrupoCama>('grupo_cama', db.grupo_cama, '*'),
        refreshAllPages<Bloque>('bloque', db.bloque, '*'),
        refreshAllPages<Finca>('finca', db.finca, '*'),
        refreshAllPages<Variedad>('variedad', db.variedad, '*'),
        refreshAllPages<Observacion>('observacion', db.observacion, '*'),
        refreshAllPages<Seccion & { id?: number }>('seccion', db.seccion, '*'),
        refreshAllPages<EstadoFenologicoTipo>('estado_fenologico_tipo', db.estado_fenologico_tipo, '*'),
        refreshAllPages<EstadosFenologicos>('estados_fenologicos', db.estados_fenologicos, '*'),
    ])

    // Load data from cache
    const [camas, grupos, bloques, fincas, variedades, observaciones, estadosTipo, estadosRows, secciones] = await Promise.all([
        readAll<Cama>(db.cama),
        readAll<GrupoCama>(db.grupo_cama),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
        readAll<Variedad>(db.variedad),
        readAll<Observacion>(db.observacion),
        readAll<EstadoFenologicoTipo>(db.estado_fenologico_tipo),
        readAll<EstadosFenologicos>(db.estados_fenologicos),
        readAll<Seccion & { id?: number }>(db.seccion),
    ])

    // Stage list ordered by 'orden' then code
    const stageList = getStageList(estadosTipo)

    // Area totals by FBV using existing aggregator
    const areaRes = await fetchAreaProductiva()
    const { areaTotalByFBV: areaByFBV, areaProdByFBV } = toAreaMaps(areaRes.rows as Array<Record<string, any>>)

    if (!observaciones.length) {
        return { rows: [], columns: ['fecha', 'finca', 'bloque', 'variedad', ...stageList.map(s => s.codigo)] }
    }

    // Normalize observations and build inflow
    const normRows = normalizeObservaciones({ camas, grupos, bloques, fincas, variedades, observaciones })

    const seccionLargo = toNumber((secciones?.[0] as any)?.largo_m) || 1
    type Payload = { count: number; area_m2: number }
    const inflow = buildInflowByFBVDateStage(normRows, seccionLargo)

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
        const nameKey = `${fincaNameById.get(fincaId) ?? fincaId}||${bloqueNameById.get(bloqueId) ?? bloqueId}||${variedadNameById.get(variedadId) ?? variedadId}`
        const idKey = `${fincaId}||${bloqueId}||${variedadId}`

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

    // Build per-FBV durations for the known stage codes present in stageList
    function buildDurationsForFBV(fbv: string): Map<string, number> {
        // Try exact name-key match; fallback to ID-key if the slug looks like IDs
        let row = estadosByFBVName.get(fbv)
        if (!row) {
            const [f, b, v] = fbv.split('||')
            const idKey = `${f ?? ''}||${b ?? ''}||${v ?? ''}`
            row = estadosByFBVId.get(idKey)
        }
        return durationsFromRow(row, stageList)
    }

    // Utility to iterate dates
    function addDays(iso: string, days: number): string {
        const dt = new Date(iso + 'T00:00:00Z')
        dt.setUTCDate(dt.getUTCDate() + days)
        return dt.toISOString().slice(0, 10)
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
            const row: Record<string, unknown> = { fecha: d, finca, bloque, variedad }
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

    return { rows: result, columns: ['fecha', 'finca', 'bloque', 'variedad', ...stageList.map(s => s.codigo)] }
}
