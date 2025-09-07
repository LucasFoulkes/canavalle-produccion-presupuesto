// Simple local preferences helper for tracked estado fenológico tipos
// Storage shape: string[] of codigos under key 'tracked_estados_codigos_v1'

const KEY = 'tracked_estados_codigos_v1'

export function getTrackedEstados(): string[] {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
    } catch {
        return []
    }
}

export function setTrackedEstados(codigos: string[]): void {
    try {
        const unique = Array.from(new Set((codigos || []).filter(Boolean)))
        localStorage.setItem(KEY, JSON.stringify(unique))
    } catch {
        // ignore
    }
}

export function isEstadoTracked(codigo: string, fallbackActive = true): boolean {
    const set = new Set(getTrackedEstados())
    if (set.size === 0) return fallbackActive // default: show all active when unset
    return set.has(String(codigo))
}
