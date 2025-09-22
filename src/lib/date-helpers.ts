// Shared date helpers used across Home and charts

// Compute ISO week number (1-53) from a Date (UTC-based to be consistent with data handling)
export function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return weekNo
}

// Render label like "Sem 35" for a weekly bucket value (date or ISO date string)
export function weekLabel(value: any): string {
    if (!value) return ''
    let d: Date
    if (typeof value === 'string' && value.length === 10 && /\d{4}-\d{2}-\d{2}/.test(value)) {
        d = new Date(`${value}T00:00:00Z`)
    } else if (value instanceof Date) {
        d = value
    } else {
        d = new Date(value)
    }
    if (isNaN(d.getTime())) return String(value)
    return `Sem ${getISOWeek(d)}`
}

export function minutesToDate(mins: number) {
    const d = new Date(0)
    d.setUTCHours(0, mins, 0, 0)
    return d
}
