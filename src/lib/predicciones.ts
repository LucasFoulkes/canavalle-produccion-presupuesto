import { toNumber } from '@/lib/data-utils'
import { parseCountPercent } from '@/lib/formatters'

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
        const { count, pct } = parseCountPercent(cell)
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

// Group by fecha, finca, bloque, and variedad, summing dias_cosecha
export function sumCosechaByFechaVariedad(rows: TimelineRow[]): Array<{ fecha: string; finca: string; bloque: string; variedad: string; dias_cosecha: number }> {
    const acc = new Map<string, { fecha: string; finca: string; bloque: string; variedad: string; dias_cosecha: number }>()
    for (const r of rows) {
        const fecha = String(r.fecha)
        const finca = String(r.finca ?? '')
        const bloque = String(r.bloque ?? '')
        const variedad = String(r.variedad ?? '')
        const key = `${fecha}||${finca}||${bloque}||${variedad}`
        const val = toNumber((r as any).dias_cosecha)
        if (!acc.has(key)) acc.set(key, { fecha, finca, bloque, variedad, dias_cosecha: 0 })
        const entry = acc.get(key)!
        if (Number.isFinite(val)) entry.dias_cosecha += val
    }
    // Sort by fecha desc then finca/bloque/variedad asc for stability
    return Array.from(acc.values()).sort((a, b) => {
        const d = b.fecha.localeCompare(a.fecha)
        if (d !== 0) return d
        const f = a.finca.localeCompare(b.finca)
        if (f !== 0) return f
        const bl = a.bloque.localeCompare(b.bloque)
        if (bl !== 0) return bl
        return a.variedad.localeCompare(b.variedad)
    })
}
