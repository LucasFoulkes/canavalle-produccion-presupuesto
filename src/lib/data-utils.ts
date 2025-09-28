import { supabase } from '@/lib/supabase'

export type DexieTable<T> = {
    bulkPut: (rows: T[]) => Promise<unknown>
    toArray: () => Promise<T[]>
    clear: () => Promise<unknown>
}

// Centralized paginated refresh to avoid the 1,000-row default limit
export async function refreshAllPages<T>(
    tableName: string,
    dexieTable: DexieTable<T>,
    select: string = '*',
    pageSize = 1000,
): Promise<number> {
    let total = 0
    try {
        const allRows: T[] = []
        for (let from = 0; ; from += pageSize) {
            const to = from + pageSize - 1
            const { data, error } = await supabase
                .from(tableName)
                .select(select)
                .range(from, to)
            if (error) throw error
            const rows = (data ?? []) as T[]
            allRows.push(...rows)
            total += rows.length
            if (rows.length < pageSize) break
        }
        if (allRows.length) {
            // Replace cache to avoid duplicate growth when PKs are missing/unstable
            await dexieTable.clear()
            await dexieTable.bulkPut(allRows)
        }
    } catch (e) {
        // Best-effort cache refresh; keep working offline
        console.warn(`${tableName}: refresh failed; using cache`, e)
    }
    return total
}

export async function readAll<T>(dexieTable: DexieTable<T>): Promise<T[]> {
    return dexieTable.toArray()
}

// Parse numbers robustly (supports number, numeric strings, comma decimals)
export function toNumber(value: unknown, fallback = 0): number {
    if (value == null) return fallback
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
    const s = String(value).trim().replace(/,/g, '.')
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : fallback
}

// Normalize text for comparisons (lowercase, trimmed)
export function normText(value: unknown): string {
    return (value ?? '').toString().toLowerCase().trim()
}

// Unique defined values from any iterable
export function uniqDefined<T>(values: Iterable<T | null | undefined>): T[] {
    const out: T[] = []
    const seen = new Set<unknown>()
    for (const v of values) {
        if (v === null || v === undefined) continue
        if (!seen.has(v)) {
            seen.add(v)
            out.push(v)
        }
    }
    return out
}

// Build a Map<key, row> using Dexie.bulkGet with provided keys (works with any primary key name)
type BulkGetTable<T, K> = { bulkGet: (keys: K[]) => Promise<Array<T | undefined>> }

export async function mapByKey<T, K extends string | number | Date>(
    table: BulkGetTable<T, K>,
    keys: Iterable<K | null | undefined>,
): Promise<Map<K, T>> {
    const uniq = uniqDefined(keys)
    if (!uniq.length) return new Map()
    const results = await table.bulkGet(uniq)
    const map = new Map<K, T>()
    uniq.forEach((k, i) => {
        const r = results[i]
        if (r != null) map.set(k, r as T)
    })
    return map
}
