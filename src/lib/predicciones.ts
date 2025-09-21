import {
  ResumenFenologicoResult,
  ResumenFenologicoRow,
  STAGE_KEYS,
} from '@/lib/resumen-fenologico'

const DEFAULT_STAGE_DURATION = 3
const MIN_STAGE_DURATION = 1
const MAX_STAGE_DURATION = 30
const MAX_PROJECTION_DAYS = 180

type TimelineContext = {
  meta: {
    finca: string
    bloque: string
    variedad: string
    fincaId: string
    bloqueId: string
    variedadId: string
  }
  durations: Record<string, number>
  totalDuration: number
  timeline: Map<string, ResumenFenologicoRow>
}

// Stronger key types for stage and percentage fields
type StageKey = typeof STAGE_KEYS[number]
type PctKey = Extract<`${StageKey}_pct`, keyof ResumenFenologicoRow>

export const predictionConstants = {
  DEFAULT_STAGE_DURATION,
  MIN_STAGE_DURATION,
  MAX_STAGE_DURATION,
  MAX_PROJECTION_DAYS,
}

export function buildPredictionTimeline(
  result: ResumenFenologicoResult | undefined,
): ResumenFenologicoRow[] {
  if (!result) return []

  const samples = result.rows ?? []
  if (samples.length === 0) return []

  const estadoMap = (result.estados ?? new Map<string, any[]>()) as Map<string, any[]>

  const groups = new Map<string, TimelineContext>()

  const ensureContext = (sample: ResumenFenologicoRow): TimelineContext | null => {
    const key = `${sample.bloqueId}|${sample.variedadId}|${sample.fincaId}`
    let context = groups.get(key)
    if (context) return context

    const estadoRecords = estadoMap.get(key) ?? []
    const durations = deriveStageDurations(estadoRecords)
    const totalDuration = clamp(
      STAGE_KEYS.reduce((acc, stage) => acc + (durations[stage] ?? DEFAULT_STAGE_DURATION), 0),
      MIN_STAGE_DURATION,
      MAX_PROJECTION_DAYS,
    )

    context = {
      meta: {
        finca: sample.finca,
        bloque: sample.bloque,
        variedad: sample.variedad,
        fincaId: sample.fincaId,
        bloqueId: sample.bloqueId,
        variedadId: sample.variedadId,
      },
      durations,
      totalDuration,
      timeline: new Map(),
    }
    groups.set(key, context)
    return context
  }

  for (const sample of samples) {
    const context = ensureContext(sample)
    if (!context) continue
    projectSample(sample, context)
  }

  const collected: ResumenFenologicoRow[] = []
  groups.forEach((context) => {
    const dates = Array.from(context.timeline.keys()).sort()
    dates.forEach((dateKey) => {
      const row = context.timeline.get(dateKey)
      if (!row) return

      // Adjustment: subtract producción from cosecha for this group/date.
      // Note: We already added producción to brotación in the aggregation step,
      // so do NOT add it again here to avoid double-counting.
      const prodMap = result.produccion
      if (prodMap) {
        const key = `${context.meta.bloqueId}|${context.meta.variedadId}|${context.meta.fincaId}|${dateKey}`
        const prod = toNumber(prodMap.get(key))
        if (prod > 0) {
          const cosecha = toNumber((row as any).dias_cosecha)
          const cosechaPct = toNumber((row as any).dias_cosecha_pct)
            // Subtract from cosecha (non-negative)
            ; (row as any).dias_cosecha = Math.max(0, cosecha - prod)
            // Keep percentage accumulation unchanged — it reflects coverage, not quantity scaled after subtraction
            ; (row as any).dias_cosecha_pct = cosechaPct
        }
      }

      collected.push(row)
    })
  })

  collected.sort((a, b) =>
    a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
    a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
    a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
    (a.fecha || '').localeCompare(b.fecha || ''),
  )

  return collected
}

export function scaleTimelineToTotals(rows: ResumenFenologicoRow[]): ResumenFenologicoRow[] {
  return rows.map((row) => {
    const clone: any = { ...row, rowKey: `total-${row.rowKey}` }
    STAGE_KEYS.forEach((stage) => {
      const observed = toNumber(clone[stage])
      const pct = toNumber(clone[`${stage}_pct`])
      if (observed <= 0 || pct <= 0) {
        clone[stage] = 0
      } else {
        clone[stage] = observed * (100 / pct)
      }
    })
    return clone as ResumenFenologicoRow
  })
}

// Keep only the final day of cosecha per (bloqueId,variedadId,fincaId)
// Rationale: being in 'cosecha' stage spans multiple days; we consider actual harvest on the last day only.
export function keepOnlyLastCosechaDay(rows: ResumenFenologicoRow[]): ResumenFenologicoRow[] {
  if (!rows?.length) return []

  // Group rows by (bloqueId,variedadId,fincaId), but consider only those with dias_cosecha > 0
  const byGroup = new Map<string, ResumenFenologicoRow[]>()
  for (const r of rows) {
    const v = Number((r as any)?.dias_cosecha || 0)
    if (v <= 0) continue
    const key = `${r.bloqueId}|${r.variedadId}|${r.fincaId}`
    let arr = byGroup.get(key)
    if (!arr) {
      arr = []
      byGroup.set(key, arr)
    }
    arr.push(r)
  }

  const result: ResumenFenologicoRow[] = []
  byGroup.forEach((arr) => {
    // Sort ascending by fecha so we can detect contiguous windows
    const sorted = [...arr].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))

    let lastOfWindow: ResumenFenologicoRow | null = null
    let lastDate: Date | null = null

    const flush = () => {
      if (lastOfWindow) result.push(lastOfWindow)
      lastOfWindow = null
      lastDate = null
    }

    for (const r of sorted) {
      const d = parseISODate(r.fecha)
      if (!d) {
        // If date is invalid, treat as a window break
        flush()
        continue
      }
      if (!lastDate) {
        // start new window
        lastOfWindow = r
        lastDate = d
      } else {
        // Check if current date is contiguous (+1 day) from lastDate
        const expected = addDays(lastDate, 1)
        const isContiguous = toISODate(d) === toISODate(expected)
        if (isContiguous) {
          // still in the same window -> update last-of-window
          lastOfWindow = r
          lastDate = d
        } else {
          // window ended -> keep last-of-window and start a new one
          flush()
          lastOfWindow = r
          lastDate = d
        }
      }
    }

    // Flush the final window if present
    flush()
  })

  // Keep original sorting order: finca, bloque, variedad, fecha
  result.sort((a, b) =>
    a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
    a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
    a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
    (a.fecha || '').localeCompare(b.fecha || ''),
  )

  return result
}

export function sortEstados(records: any[]): any[] {
  return [...records].sort((a, b) => toMillis(b) - toMillis(a))
}

function projectSample(sample: ResumenFenologicoRow, context: TimelineContext) {
  const sampleDate = parseISODate(sample.fecha)
  if (!sampleDate) return

  STAGE_KEYS.forEach((stageKey, stageIndex) => {
    const count = toNumber((sample as any)[stageKey])
    const pct = toNumber((sample as any)[`${stageKey}_pct`])
    if (count <= 0 && pct <= 0) return

    let offset = 0
    for (let idx = stageIndex; idx < STAGE_KEYS.length; idx++) {
      const key = STAGE_KEYS[idx]
      const duration = normalizeDuration(context.durations[key])
      for (let day = 0; day < duration; day++) {
        const dayOffset = offset + day
        if (dayOffset > context.totalDuration) break
        const targetDate = addDays(sampleDate, dayOffset)
        const dateKey = toISODate(targetDate)
        const timelineRow = ensureTimelineRow(context, dateKey)
        timelineRow[key] = toNumber(timelineRow[key]) + count
        const pctKey = `${key}_pct` as PctKey
        timelineRow[pctKey] = toNumber(timelineRow[pctKey]) + pct
      }
      offset += duration
      if (offset > context.totalDuration) break
    }
  })
}

function ensureTimelineRow(context: TimelineContext, dateKey: string): ResumenFenologicoRow {
  let row = context.timeline.get(dateKey)
  if (!row) {
    const base: any = {
      finca: context.meta.finca,
      bloque: context.meta.bloque,
      variedad: context.meta.variedad,
      fecha: dateKey,
      fincaId: context.meta.fincaId,
      bloqueId: context.meta.bloqueId,
      variedadId: context.meta.variedadId,
      rowKey: `pred-${context.meta.bloqueId}-${context.meta.variedadId}-${dateKey}`,
    }
    STAGE_KEYS.forEach((stage) => {
      base[stage] = 0
      base[`${stage}_pct`] = 0
    })
    row = base as ResumenFenologicoRow
    context.timeline.set(dateKey, row)
  }
  return row
}

function deriveStageDurations(records: any[]): Record<string, number> {
  const durations: Record<string, number> = {}
  if (!records || records.length === 0) {
    STAGE_KEYS.forEach((stage) => (durations[stage] = DEFAULT_STAGE_DURATION))
    return durations
  }
  const latest = pickLatestEstado(records)
  STAGE_KEYS.forEach((stage, index) => {
    const raw = toNumber((latest as any)?.[stage])
    let duration = raw
    if (index > 0) {
      const prevRaw = toNumber((latest as any)?.[STAGE_KEYS[index - 1]])
      if (raw > 0 && prevRaw > 0 && raw > prevRaw) {
        duration = raw - prevRaw
      }
    }
    durations[stage] = normalizeDuration(duration)
  })
  return durations
}

function pickLatestEstado(records: any[]): any | null {
  if (!records || records.length === 0) return null
  return [...records].sort((a, b) => toMillis(b) - toMillis(a))[0]
}

function toMillis(value: any): number {
  const raw = value?.creado_en ?? value?.fecha ?? value?.actualizado_en
  if (!raw) return -Infinity
  const date = new Date(raw)
  const ms = date.getTime()
  return Number.isNaN(ms) ? -Infinity : ms
}

function toNumber(value: any): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function normalizeDuration(value: number | undefined): number {
  if (!Number.isFinite(value) || value! <= 0) return DEFAULT_STAGE_DURATION
  return clamp(Math.round(value!), MIN_STAGE_DURATION, MAX_STAGE_DURATION)
}

function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime())
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
