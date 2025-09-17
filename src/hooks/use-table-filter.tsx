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

export type TableFilterState = {
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
    if (!ctx) throw new Error('useTableFilter must be used within TableFilterProvider')
    return ctx
}

// Helper to apply filtering to a row list; can be used if needed elsewhere
export function useFilteredRows<T extends Record<string, any>>(rows: T[] | null | undefined, columns: { key: keyof T; header?: string }[]) {
    const { query, column } = useTableFilter()
    return React.useMemo(() => {
        if (!rows || !rows.length) return rows ?? []
        if (!query) return rows
        const q = query.toLowerCase()
        const keys: string[] = column === '*' ? columns.map((c) => c.key as string) : [column]
        return rows.filter((row) => {
            return keys.some((k) => {
                const v = row?.[k]
                if (v == null) return false
                return String(v).toLowerCase().includes(q)
            })
        })
    }, [rows, query, column, columns])
}
