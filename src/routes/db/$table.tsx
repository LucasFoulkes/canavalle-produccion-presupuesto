import { createFileRoute, notFound } from '@tanstack/react-router'
import * as React from 'react'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { getTableConfig, getTableService, SERVICE_PK } from '@/services/db'
import { formatDate, isDateLikeKey, formatDateISO } from '@/lib/utils'
import { getStore } from '@/lib/dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { syncTable } from '@/services/sync'
import { useDottedLookups } from '@/hooks/use-dotted-lookups'
import { useTableFilter } from '@/hooks/use-table-filter'

export const Route = createFileRoute('/db/$table')({
  component: Page,
})

function useDbTable(tableId: string) {
  const config = getTableConfig(tableId)
  const dexieSupported = !!SERVICE_PK[tableId]
  const [error, setError] = React.useState<string | null>(null)

  // Live rows from Dexie if supported; else null to fallback to Supabase fetch once
  const liveRows = useLiveQuery(async () => {
    if (!dexieSupported) return null
    try {
      const store = getStore(tableId)
      const all = await store.toArray()
      return all as any[]
    } catch (e: any) {
      console.warn('Dexie read failed', e)
      return []
    }
  }, [tableId, dexieSupported])

  // Kick per-table sync when mounting/swapping table
  React.useEffect(() => {
    if (!dexieSupported) return
    syncTable(tableId).catch((e) => {
      console.warn('Sync failed', e)
      setError(String(e?.message ?? e))
    })
  }, [tableId, dexieSupported])

  // Fallback fetch if table not in Dexie config
  const [fallbackRows, setFallbackRows] = React.useState<any[] | null>(null)
  React.useEffect(() => {
    if (dexieSupported) return
    let cancelled = false
      ; (async () => {
        const { data, error } = await getTableService(tableId).selectAll('*')
        if (cancelled) return
        if (error) setError(error.message)
        setFallbackRows((data as any[]) ?? [])
      })()
    return () => {
      cancelled = true
    }
  }, [tableId, dexieSupported])

  const rows = (liveRows ?? fallbackRows ?? []) as any[]

  const columns = React.useMemo(() => {
    if (config) {
      // Attach date formatter lazily without mutating original config
      return config.columns.map((c) => {
        if (isDateLikeKey(c.key)) {
          return { ...c, render: (v: any) => formatDate(v) }
        }
        return c
      })
    }
    const sample = rows?.[0]
    if (sample) {
      return Object.keys(sample)
        .slice(0, 6)
        .map((k) => ({ key: k, render: isDateLikeKey(k) ? (v: any) => formatDate(v) : undefined }))
    }
    return []
  }, [config, rows])

  const title = config?.title ?? tableId
  return { title, columns, rows, error }
}

function Page() {
  const { table } = Route.useParams()
  // Limit to known tables to avoid accidental exposure
  if (!getTableConfig(table)) throw notFound()
  const { columns, rows, } = useDbTable(table)
  const { registerColumns, query, column, filters } = useTableFilter()
  // Register columns on changes
  React.useEffect(() => {
    registerColumns(columns.map(c => ({ key: String((c as any).key), label: (c as any).header ?? String((c as any).key) })))
  }, [columns, registerColumns])
  const { displayRows, relationLoading } = useDottedLookups(table, rows, columns as any, { requireAll: true })
  const baseLoading = rows == null || rows.length === 0
  const finalLoading = baseLoading || relationLoading
  const filtered = React.useMemo(() => {
    let rowsToCheck = displayRows
    if (filters.length) {
      rowsToCheck = rowsToCheck.filter(r => {
        return filters.every(f => {
          const raw = (r as any)[f.column]
          if (raw == null) return false
          const valStr = String(raw)
          const lower = valStr.toLowerCase()
          switch (f.op) {
            case 'eq':
              return lower === f.value.toLowerCase()
            case 'contains':
              return lower.includes(f.value.toLowerCase())
            case 'starts':
              return lower.startsWith(f.value.toLowerCase())
            case 'ends':
              return lower.endsWith(f.value.toLowerCase())
            case 'gt': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a > b
            }
            case 'lt': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a < b
            }
            case 'gte': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a >= b
            }
            case 'lte': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a <= b
            }
            case 'between': {
              // Date or number range
              if (!f.value2) return false
              if (isDateLikeKey(f.column)) {
                const d = formatDateISO(raw)
                const a = f.value
                const b = f.value2
                if (!d || !a || !b) return false
                return d >= a && d <= b
              } else {
                const aNum = Number(f.value); const bNum = Number(f.value2); const n = Number(raw)
                if ([aNum, bNum, n].some(isNaN)) return false
                return n >= aNum && n <= bNum
              }
            }
            default:
              return lower.includes(f.value.toLowerCase())
          }
        })
      })
    }
    if (!query) return rowsToCheck
    const q = query.toLowerCase()
    const keys = column === '*' ? columns.map(c => String(c.key)) : [column]
    return rowsToCheck.filter(r => keys.some(k => {
      const v = (r as any)[k]
      if (v == null) return false
      return String(v).toLowerCase().includes(q)
    }))
  }, [query, column, displayRows, columns, filters])
  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {finalLoading ? (
        <DataTableSkeleton columns={columns as any} rows={8} />
      ) : (
        <DataTable caption={`${filtered.length}`} columns={columns as any} rows={filtered} />
      )}
    </div>
  )
}

