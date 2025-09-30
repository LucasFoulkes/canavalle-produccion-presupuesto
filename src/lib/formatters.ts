const baseNumberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
})

export function formatDecimal(value: number, fractionDigits = 2): string {
    if (!Number.isFinite(value)) return String(value)
    if (fractionDigits === 2) {
        return baseNumberFormatter.format(value)
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
        useGrouping: false,
    }).format(value)
}

export function parseNumberLike(input: unknown): number | null {
    if (input == null) return null
    if (typeof input === 'number') return Number.isFinite(input) ? input : null
    const trimmed = String(input).trim()
    if (!trimmed) return null
    const hasComma = trimmed.includes(',')
    const hasDot = trimmed.includes('.')
    let normalized = trimmed
    if (hasComma && hasDot) {
        const lastComma = trimmed.lastIndexOf(',')
        const lastDot = trimmed.lastIndexOf('.')
        if (lastComma > lastDot) {
            normalized = trimmed.replace(/\./g, '').replace(/,/g, '.')
        } else {
            normalized = trimmed.replace(/,/g, '')
        }
    } else if (hasComma && !hasDot) {
        normalized = trimmed.replace(/\s+/g, '').replace(/,/g, '.')
    } else if (!hasComma && hasDot) {
        const parts = trimmed.split('.')
        if (parts.length > 2) {
            const dec = parts.pop()!
            normalized = parts.join('') + '.' + dec
        }
    }
    const num = Number(normalized)
    return Number.isFinite(num) ? num : null
}

export function parseCountPercent(cell: unknown): { count: number; pct: number } {
    if (cell == null) return { count: 0, pct: 0 }
    if (typeof cell === 'number') {
        return { count: Number.isFinite(cell) ? cell : 0, pct: 0 }
    }
    const text = String(cell).trim()
    if (!text) return { count: 0, pct: 0 }
    const match = text.match(/^\s*([+-]?(?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?)\s*\(\s*([+-]?\d+(?:[.,]\d+)?)\s*%\s*\)\s*$/)
    if (match) {
        const count = parseNumberLike(match[1]) ?? 0
        const pct = parseNumberLike(match[2]) ?? 0
        return { count, pct }
    }
    const num = parseNumberLike(text)
    if (num != null) {
        return { count: num, pct: 0 }
    }
    return { count: 0, pct: 0 }
}

export { baseNumberFormatter as decimalFormatter }
