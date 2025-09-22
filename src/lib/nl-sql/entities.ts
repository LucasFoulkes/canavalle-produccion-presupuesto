import { Catalogs } from './types'

function normalize(s: string) {
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )
        }
    }
    return dp[m][n]
}

function similarity(a: string, b: string): number {
    const na = normalize(a), nb = normalize(b)
    const dist = levenshtein(na, nb)
    const maxLen = Math.max(na.length, nb.length) || 1
    return 1 - dist / maxLen
}

export function resolveEntity(query: string, list: string[], threshold = 0.7): { value?: string; ambiguous?: string[] } {
    const scored = list.map(v => ({ v, s: similarity(query, v) }))
    scored.sort((a, b) => b.s - a.s)
    const top = scored[0]
    if (!top || top.s < threshold) return { value: undefined }
    // Ambiguity: if second close within 0.05
    const second = scored[1]
    if (second && Math.abs(top.s - second.s) < 0.05) {
        return { ambiguous: [top.v, second.v] }
    }
    return { value: top.v }
}

export function makeEntityResolver(catalogs: Partial<Catalogs>) {
    const cats: Catalogs = {
        variedades: catalogs.variedades || [],
        fincas: catalogs.fincas || [],
        bloques: catalogs.bloques || [],
        camas: catalogs.camas || [],
    }
    return {
        variedad: (q: string) => resolveEntity(q, cats.variedades),
        finca: (q: string) => resolveEntity(q, cats.fincas),
        bloque: (q: string) => resolveEntity(q, cats.bloques),
        cama: (q: string) => resolveEntity(q, cats.camas),
    }
}
