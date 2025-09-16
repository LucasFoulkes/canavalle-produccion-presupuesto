import * as React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getStore } from '@/lib/dexie'
import { SERVICE_PK } from '@/services/db'

// Given columns that may contain dotted keys like `finca.nombre` and the base rows,
// build lookup maps from Dexie using the FK convention `id_<rel>` and return
// a derived `displayRows` where dotted keys are added as flattened properties for rendering.

export type Column = { key: string; header?: string }

function getRelatedFromColumns(columns: Column[]): string[] {
    const rels = new Set<string>()
    for (const c of columns) {
        const key = c.key
        if (typeof key === 'string' && key.includes('.')) {
            rels.add(key.split('.')[0])
        }
    }
    return Array.from(rels)
}

export function useDottedLookups(tableId: string, rows: any[], columns: Column[], options?: { requireAll?: boolean }) {
    const requireAll = options?.requireAll !== false // default true
    const related = getRelatedFromColumns(columns)

    // Multi-hop relation paths for special cases.
    // Each entry defines how to resolve a top-level relation name from the base table rows.
    // For example for table 'cama', to resolve 'finca', go through:
    //   id_grupo -> grupo_cama -> id_bloque -> bloque -> id_finca -> finca
    const RELATION_PATHS: Record<string, Record<string, Array<{ fk: string; table: string }>>> = {
        cama: {
            variedad: [
                { fk: 'id_grupo', table: 'grupo_cama' },
                { fk: 'id_variedad', table: 'variedad' },
            ],
            bloque: [
                { fk: 'id_grupo', table: 'grupo_cama' },
                { fk: 'id_bloque', table: 'bloque' },
            ],
            finca: [
                { fk: 'id_grupo', table: 'grupo_cama' },
                { fk: 'id_bloque', table: 'bloque' },
                { fk: 'id_finca', table: 'finca' },
            ],
        },
        observacion: {
            variedad: [
                { fk: 'id_cama', table: 'cama' },
                { fk: 'id_grupo', table: 'grupo_cama' },
                { fk: 'id_variedad', table: 'variedad' },
            ],
            bloque: [
                { fk: 'id_cama', table: 'cama' },
                { fk: 'id_grupo', table: 'grupo_cama' },
                { fk: 'id_bloque', table: 'bloque' },
            ],
            finca: [
                { fk: 'id_cama', table: 'cama' },
                { fk: 'id_grupo', table: 'grupo_cama' },
                { fk: 'id_bloque', table: 'bloque' },
                { fk: 'id_finca', table: 'finca' },
            ],
        },
    }

    type RelLookup = { mapByRelatedId?: Map<string | number, any>; mapByBasePk?: Map<string | number, any> }

    // Build lookups for each relation name (rel) using FK id_<rel>
    const lookups = useLiveQuery(async () => {
        const out: Record<string, RelLookup> = {}
        const basePkKey = SERVICE_PK[tableId]
        const relPaths = RELATION_PATHS[tableId] || {}

        for (const rel of related) {
            const customPath = relPaths[rel]
            if (customPath && basePkKey) {
                // Multi-hop: build Map basePk -> final related row
                // Step 0: start from base rows
                let baseToCurrent = new Map<string | number, any>()
                for (const row of rows) {
                    const basePk = row?.[basePkKey]
                    if (basePk == null) continue
                    baseToCurrent.set(basePk as string | number, row)
                }

                // Traverse steps
                for (const step of customPath) {
                    const ids = Array.from(new Set(
                        Array.from(baseToCurrent.values())
                            .map((r: any) => r?.[step.fk])
                            .filter((v) => v != null)
                    ))
                    const nextStore = getStore(step.table)
                    const recs = await nextStore.bulkGet(ids)
                    // index recs by that table's PK
                    const tablePk = SERVICE_PK[step.table]
                    const idx = new Map<string | number, any>()
                    for (const rec of recs) {
                        if (!rec) continue
                        const id = (rec as any)[tablePk]
                        if (id != null) idx.set(id as string | number, rec)
                    }
                    // produce new mapping: basePk -> nextRow
                    const updated = new Map<string | number, any>()
                    for (const [basePk, cur] of baseToCurrent.entries()) {
                        const nextId = cur?.[step.fk]
                        const nextRow = nextId != null ? idx.get(nextId as string | number) : undefined
                        updated.set(basePk, nextRow)
                    }
                    baseToCurrent = updated
                }

                out[rel] = { mapByBasePk: baseToCurrent }
                continue
            }

            // Single hop default: id_<rel> on base rows
            const fk = `id_${rel}`
            const ids = Array.from(new Set(rows.map((r) => r?.[fk]).filter((v) => v != null)))
            if (ids.length === 0) {
                out[rel] = { mapByRelatedId: new Map() }
                continue
            }
            try {
                const store = getStore(rel)
                const recs = await store.bulkGet(ids)
                const m = new Map<string | number, any>()
                const pkKey = SERVICE_PK[rel] ?? `id_${rel}`
                for (const rec of recs) {
                    if (!rec) continue
                    const id = (rec as any)[pkKey] ?? (rec as any)['id']
                    if (id != null) m.set(id as string | number, rec)
                }
                out[rel] = { mapByRelatedId: m }
            } catch (e) {
                out[rel] = { mapByRelatedId: new Map() }
            }
        }

        return out
    }, [tableId, JSON.stringify(related), JSON.stringify(rows)])

    // relationLoading rules:
    // 1. Still waiting for initial lookups object.
    // 2. Or any related key has at least one referenced id but missing its mapped row.
    let relationLoading = false
    if (!lookups && related.length > 0) {
        relationLoading = true
    } else if (lookups && related.length > 0) {
        // Inspect rows for each relation to ensure all required related rows resolved
        outer: for (const rel of related) {
            const customPath = (RELATION_PATHS[tableId] || {})[rel]
            const basePkKeyInner = SERVICE_PK[tableId]
            if (customPath && basePkKeyInner) {
                // For multi-hop, if any base row has a non-null final mapping undefined -> still loading
                for (const row of rows || []) {
                    const basePk = row?.[basePkKeyInner]
                    if (basePk == null) continue
                    if (!lookups[rel]) { relationLoading = true; break outer }
                    if (lookups[rel].mapByBasePk?.has(basePk)) {
                        const val = lookups[rel].mapByBasePk?.get(basePk)
                        // allow undefined if intermediate was genuinely missing (no fk); only treat as loading if fk chain exists
                        // We approximate by checking each step's fk presence.
                        let chainOk = true
                        let cur: any = row
                        for (const step of customPath) {
                            const idVal = cur?.[step.fk]
                            if (idVal == null) { chainOk = false; break }
                            // fetch record quickly (can't synchronously, rely on earlier map)
                        }
                        if (chainOk && val === undefined) { relationLoading = true; break outer }
                    }
                }
            } else {
                // Single hop
                const fk = `id_${rel}`
                for (const row of rows || []) {
                    const relId = row?.[fk]
                    if (relId == null) continue
                    const lk = lookups[rel]
                    if (!lk) { relationLoading = true; break outer }
                    const has = lk.mapByRelatedId?.has(relId as any)
                    if (!has) { relationLoading = true; break outer }
                }
            }
        }
    }

    const displayRows = React.useMemo(() => {
        if (relationLoading || !lookups) return []
        return (rows ?? []).map((row) => {
            let acc = row
            for (const c of columns) {
                const key = c.key
                if (typeof key !== 'string' || !key.includes('.')) continue
                const [rel, ...rest] = key.split('.')
                const relLookup = lookups[rel]
                if (!relLookup) continue
                let relRow: any
                const customPath = (RELATION_PATHS[tableId] || {})[rel]
                const basePkKeyInner = SERVICE_PK[tableId]
                if (customPath && basePkKeyInner) {
                    const basePk = row?.[basePkKeyInner]
                    relRow = basePk != null ? relLookup.mapByBasePk?.get(basePk as string | number) : undefined
                } else {
                    const fk = `id_${rel}`
                    const relId = row?.[fk]
                    relRow = relId != null ? relLookup.mapByRelatedId?.get(relId as string | number) : undefined
                }
                const value = rest.reduce<any>((a, k) => (a == null ? a : a[k]), relRow)
                acc = { ...acc, [key]: value }
            }
            return acc
        })
    }, [lookups, rows, columns, tableId, relationLoading])

    // If requireAll, verify every dotted key for every row is non-undefined.
    let completenessPending = false
    if (requireAll && displayRows.length) {
        checkRows: for (const row of displayRows) {
            for (const c of columns) {
                if (typeof c.key !== 'string' || !c.key.includes('.')) continue
                if (row[c.key] === undefined) { completenessPending = true; break checkRows }
            }
        }
    }

    return { displayRows: completenessPending ? [] : displayRows, lookups: lookups ?? {}, relationLoading: relationLoading || completenessPending }
}
