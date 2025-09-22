// Simple date parsing utilities for es/en phrases with America/Guayaquil default


function toISODate(d: Date): string {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function startOfDayLocal(d: Date): Date {
    const copy = new Date(d)
    copy.setUTCHours(0, 0, 0, 0)
    return copy
}

function addDays(d: Date, delta: number): Date {
    const x = new Date(d.getTime())
    x.setUTCDate(x.getUTCDate() + delta)
    return x
}

export function parseDateOrRange(input: string): { fecha?: string; rango_fecha?: string } | null {
    if (!input) return null
    const s = input.trim().toLowerCase()

    // ISO date first
    const iso = s.match(/\b(\d{4}-\d{2}-\d{2})\b/)
    if (iso) {
        return { fecha: iso[1] }
    }

    // Range like del 2025-08-01 al 2025-09-21
    const rangeIso = s.match(/(\d{4}-\d{2}-\d{2}).{1,5}(\d{4}-\d{2}-\d{2})/)
    if (rangeIso) {
        const start = rangeIso[1]
        const end = rangeIso[2]
        return { rango_fecha: `${start}..${end}` }
    }

    const now = new Date()
    const today = startOfDayLocal(now)
    const yesterday = addDays(today, -1)

    if (/\b(hoy|today)\b/.test(s)) return { fecha: toISODate(today) }
    if (/\b(ayer|yesterday)\b/.test(s)) return { fecha: toISODate(yesterday) }

    // próximas N semanas/días
    const nextNWeeks = s.match(/pr[oó]ximas?\s+(\d+)\s+semanas?/)
    if (nextNWeeks) {
        const n = parseInt(nextNWeeks[1], 10)
        const end = addDays(today, n * 7)
        return { rango_fecha: `${toISODate(today)}..${toISODate(end)}` }
    }
    const nextNDays = s.match(/pr[oó]ximos?\s+(\d+)\s+d[ií]as?/)
    if (nextNDays) {
        const n = parseInt(nextNDays[1], 10)
        const end = addDays(today, n)
        return { rango_fecha: `${toISODate(today)}..${toISODate(end)}` }
    }

    // semana = current ISO week: return start..end of week (Mon..Sun)
    if (/\besta\s+semana\b|\bthis\s+week\b/.test(s)) {
        const dow = today.getUTCDay() // 0..6
        const isoMonShift = (dow + 6) % 7
        const mon = addDays(today, -isoMonShift)
        const sun = addDays(mon, 6)
        return { rango_fecha: `${toISODate(mon)}..${toISODate(sun)}` }
    }

    return null
}
