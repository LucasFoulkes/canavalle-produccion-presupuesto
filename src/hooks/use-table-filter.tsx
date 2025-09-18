import * as React from 'react'
import { isDateLikeKey } from '@/lib/utils'

export type FilterColumn = { key: string; label: string; type?: 'string' | 'number' | 'date' }

export type SavedFilter = {
    id: string
    column: string
    value: string
    value2?: string // for between ranges (dates etc)
    op: string // operator code (eq, contains, lt, between ...)
    type: 'string' | 'number' | 'date'
}

type TableFilterState = {
    query: string
    setQuery: (v: string) => void
    column: string // '*' means all columns for live query typing
    setColumn: (v: string) => void
    columns: FilterColumn[]
    registerColumns: (cols: FilterColumn[]) => void
    reset: () => void
    filters: SavedFilter[]
    addFilter: (f: Omit<SavedFilter, 'id'>) => void
    removeFilter: (id: string) => void
    clearFilters: () => void
}

const TableFilterContext = React.createContext<TableFilterState | null>(null)

export const TableFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [query, setQuery] = React.useState('')
    const [column, setColumn] = React.useState<string>('*')
    const [columns, setColumns] = React.useState<FilterColumn[]>([])
    const [filters, setFilters] = React.useState<SavedFilter[]>([])

    // Basic heuristic type inference (can be refined later)
    const inferType = (key: string): 'string' | 'number' | 'date' => {
        if (isDateLikeKey(key)) return 'date'
        if (/^(id_|numero_|cantidad|total_|area_|largo_|ancho_|dias_)/i.test(key)) return 'number'
        return 'string'
    }

    const registerColumns = React.useCallback((cols: FilterColumn[]) => {
        // If keys changed, update; else ignore to avoid re-renders
        setColumns((prev) => {
            const prevKeys = prev.map((c) => c.key).join('|')
            const nextKeys = cols.map((c) => c.key).join('|')
            if (prevKeys === nextKeys) return prev
            // When table changes (different set of columns) reset query & selected column
            setQuery('')
            setColumn('*')
            setFilters([])
            return cols.map(c => ({ ...c, type: c.type ?? inferType(c.key) }))
        })
    }, [])

    const reset = React.useCallback(() => {
        setQuery('')
        setColumn('*')
        setFilters([])
    }, [])

    const addFilter = React.useCallback((f: Omit<SavedFilter, 'id'>) => {
        if (!f.value.trim()) return
        // For between, require second value
        if (f.op === 'between' && !f.value2) return
        setFilters((prev) => [...prev, { ...f, id: Math.random().toString(36).slice(2) }])
    }, [])

    const removeFilter = React.useCallback((id: string) => {
        setFilters((prev) => prev.filter((f) => f.id !== id))
    }, [])

    const clearFilters = React.useCallback(() => setFilters([]), [])

    const value = React.useMemo<TableFilterState>(() => ({
        query,
        setQuery,
        column,
        setColumn,
        columns,
        registerColumns,
        reset,
        filters,
        addFilter,
        removeFilter,
        clearFilters,
    }), [query, column, columns, registerColumns, reset, filters, addFilter, removeFilter, clearFilters])

    return <TableFilterContext.Provider value={value}>{children}</TableFilterContext.Provider>
}

export function useTableFilter() {
    const ctx = React.useContext(TableFilterContext)
    if (!ctx) {
        // Graceful fallback: provide inert implementation so pages rendered outside provider don't crash.
        // Warn once in dev.
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[useTableFilter] missing TableFilterProvider â€“ using no-op fallback')
        }
        const noop = () => { }
        return {
            query: '', setQuery: noop,
            column: '*', setColumn: noop,
            columns: [], registerColumns: noop,
            reset: noop,
            filters: [], addFilter: noop, removeFilter: noop, clearFilters: noop,
        } as TableFilterState
    }
    return ctx
}

// Helper to apply filtering to a row list; can be used if needed elsewhere
export function useFilteredRows<T extends Record<string, any>>(rows: T[] | null | undefined, columns: { key: keyof T; header?: string }[]) {
    const { query, column, filters, columns: filterColumns } = useTableFilter()
    return React.useMemo(() => {
        if (!rows || !rows.length) return rows ?? []

        const esc = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, r => `\\${r}`)
        const buildNumericBoundaryRegex = (tok: string) => new RegExp(`\\b${tok}\\b`, 'i')
        const buildStringTokenRegex = (tok: string) => new RegExp(esc(tok), 'i')
        const queryTokens = query.trim() ? query.trim().toLowerCase().split(/\s+/).filter(Boolean) : []
        const queryKeys: string[] = column === '*' ? columns.map(c => c.key as string) : [column]

        const parseNumberValue = (value: any) => {
            if (typeof value === 'number') return value
            if (typeof value === 'string') {
                const normalized = value.trim().replace(/,/g, '.')
                const parsed = Number(normalized)
                return Number.isNaN(parsed) ? NaN : parsed
            }
            return NaN
        }

        const applyQuery = (row: T) => {
            if (!queryTokens.length) return true
            return queryTokens.every(tok => {
                const isNum = /^\d+$/.test(tok)
                const targetNum = isNum ? Number(tok) : NaN
                return queryKeys.some(key => {
                    const v = (row as any)[key]
                    if (v == null) return false
                    if (isNum) {
                        const metaType = filterColumns.find(col => col.key === key)?.type
                        if ((metaType === 'number' || typeof v === 'number') && Number.isFinite(targetNum)) {
                            const parsed = parseNumberValue(v)
                            if (!Number.isNaN(parsed)) {
                                return parsed === targetNum
                            }
                        }
                        return buildNumericBoundaryRegex(tok).test(String(v))
                    }
                    return buildStringTokenRegex(tok).test(String(v))
                })
            })
        }

        const toDateOnly = (iso: string) => {
            if (!iso) return ''
            const d = new Date(iso)
            if (isNaN(d.getTime())) return iso
            return d.toISOString().slice(0, 10)
        }

        const applySavedFilters = (row: T) => {
            if (!filters.length) return true
            return filters.every(f => {
                const raw = (row as any)[f.column]
                if (raw == null) return false
                if (f.type === 'date') {
                    const val = toDateOnly(String(raw))
                    if (f.op === 'eq') return val === f.value
                    if (f.op === 'between') return val >= String(f.value) && val <= String(f.value2)
                    return false
                }
                if (f.type === 'number') {
                    const valNum = parseNumberValue(raw)
                    const a = parseNumberValue(f.value)
                    if (isNaN(valNum) || isNaN(a)) return false
                    if (f.op === 'eq') return valNum === a
                    if (['gt', 'lt', 'gte', 'lte'].includes(f.op)) {
                        if (f.op === 'gt') return valNum > a
                        if (f.op === 'lt') return valNum < a
                        if (f.op === 'gte') return valNum >= a
                        if (f.op === 'lte') return valNum <= a
                    }
                    if (f.op === 'between') {
                        const b = parseNumberValue(f.value2)
                        if (isNaN(b)) return false
                        return valNum >= Math.min(a, b) && valNum <= Math.max(a, b)
                    }
                    return false
                }
                const rawStr = String(raw)
                const valStr = rawStr.toLowerCase()
                const needle = f.value.toLowerCase()
                const isPureNumber = /^\d+$/.test(needle)
                switch (f.op) {
                    case 'contains':
                        if (isPureNumber) return buildNumericBoundaryRegex(needle).test(rawStr)
                        return valStr.includes(needle)
                    case 'eq': return valStr === needle
                    case 'starts': return valStr.startsWith(needle)
                    case 'ends': return valStr.endsWith(needle)
                    default: return false
                }
            })
        }

        return rows.filter(r => applyQuery(r) && applySavedFilters(r))
    }, [rows, query, column, columns, filterColumns, filters])
}
