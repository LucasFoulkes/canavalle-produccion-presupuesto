import { toNumber } from '@/lib/data-utils'

// Parse a stage cell like "123 (45.6%)" or numeric/string values
export function parseStageCell(cell: unknown): { count: number; pct: number } {
    if (cell == null) return { count: 0, pct: 0 }
    if (typeof cell === 'number') return { count: toNumber(cell), pct: 0 }
    const s = String(cell).trim()
    if (!s) return { count: 0, pct: 0 }
    const m = s.match(/^\s*([+-]?(?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?)\s*\(\s*([+-]?\d+(?:[.,]\d+)?)\s*%\s*\)\s*$/)
    if (m) {
        const main = m[1].replace(/,/g, '.')
        const pct = m[2].replace(/,/g, '.')
        const count = toNumber(main)
        const p = toNumber(pct)
        return { count, pct: p }
    }
    // If plain numeric-like string, treat as count with 0 pct
    const n = toNumber(s)
    if (Number.isFinite(n)) return { count: n, pct: 0 }
    return { count: 0, pct: 0 }
}

export type TimelineRow = Record<string, unknown> & { fecha: string; finca: string; bloque: string; variedad: string }

// Scale the dias_cosecha for each row to 100% coverage using parsed pct
export function scaleTimelineToTotals(rows: TimelineRow[]): TimelineRow[] {
    return rows.map((r) => {
        // Prefer common keys; else find a column whose normalized name is 'cosecha'
        let cell: unknown = (r as any)['dias_cosecha']
        if (cell == null) cell = (r as any)['cosecha']
        if (cell == null) {
            for (const k of Object.keys(r)) {
                const kn = String(k).toLowerCase().normalize('NFD').replace(/\p{Diacritic}+/gu, '')
                if (kn === 'cosecha') { cell = (r as any)[k]; break }
            }
        }
        const { count, pct } = parseStageCell(cell)
        const scaled = pct > 0 ? count * (100 / pct) : count
        return { ...r, dias_cosecha: scaled }
    })
}

// From rows with numeric dias_cosecha, keep only the last day per consecutive cosecha window per FBV
export function keepOnlyLastCosechaDay(rows: TimelineRow[]): TimelineRow[] {
    // Group by FBV
    const byFBV = new Map<string, TimelineRow[]>()
    for (const r of rows) {
        const key = `${r.finca ?? ''}||${r.bloque ?? ''}||${r.variedad ?? ''}`
        if (!byFBV.has(key)) byFBV.set(key, [])
        byFBV.get(key)!.push(r)
    }
    const out: TimelineRow[] = []
    for (const list of byFBV.values()) {
        // sort by fecha asc
        list.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
        let windowStartIdx: number | null = null
        for (let i = 0; i < list.length; i++) {
            const v = toNumber((list[i] as any).dias_cosecha)
            const positive = v > 0
            if (positive && windowStartIdx == null) {
                windowStartIdx = i
            }
            const nextPositive = i + 1 < list.length ? toNumber((list[i + 1] as any).dias_cosecha) > 0 : false
            // if this is the end of a positive window, keep this row
            if (positive && !nextPositive) {
                out.push(list[i])
                windowStartIdx = null
            }
        }
    }
    // Sort output by fecha desc, then F/B/V asc for stability
    out.sort((a, b) => {
        const cmp = String(b.fecha).localeCompare(String(a.fecha))
        if (cmp !== 0) return cmp
        const keys: Array<'finca' | 'bloque' | 'variedad'> = ['finca', 'bloque', 'variedad']
        for (const k of keys) {
            const va = String((a as any)[k] ?? '')
            const vb = String((b as any)[k] ?? '')
            const c = va.localeCompare(vb)
            if (c !== 0) return c
        }
        return 0
    })
    return out
}

// Group by fecha and variedad, summing dias_cosecha; drops finca and bloque
export function sumCosechaByFechaVariedad(rows: TimelineRow[]): Array<{ fecha: string; variedad: string; dias_cosecha: number }> {
    const acc = new Map<string, { fecha: string; variedad: string; dias_cosecha: number }>()
    for (const r of rows) {
        const fecha = String(r.fecha)
        const variedad = String(r.variedad)
        const key = `${fecha}||${variedad}`
        const val = toNumber((r as any).dias_cosecha)
        if (!acc.has(key)) acc.set(key, { fecha, variedad, dias_cosecha: 0 })
        const entry = acc.get(key)!
        if (Number.isFinite(val)) entry.dias_cosecha += val
    }
    // Sort by fecha desc then variedad asc for stability
    return Array.from(acc.values()).sort((a, b) => {
        const d = b.fecha.localeCompare(a.fecha)
        if (d !== 0) return d
        return a.variedad.localeCompare(b.variedad)
    })
}
