import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { fetchTable } from '@/services/tables'
import { toNumber } from '@/lib/data-utils'
import { CosechaCard } from '@/components/cosecha-card'
import { ObservacionDiaCard } from '@/components/observacion-dia-card'
import { ProduccionCard, type ProduccionRow } from '@/components/produccion-card'

export const Route = createFileRoute('/')({
  validateSearch: (search: { table?: string }) => search,
  component: RouteComponent,
})

function RouteComponent() {
  // Raw cosecha rows (fecha, finca, bloque, variedad, dias_cosecha)
  const [rows, setRows] = React.useState<Array<{ fecha: string; finca: string; bloque: string; variedad: string; dias_cosecha: number }>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [cosechaSummary, setCosechaSummary] = React.useState<{ today: Map<string, number>; week: Map<string, number> }>({ today: new Map(), week: new Map() })

  // Observaciones por cama data
  const [obsRows, setObsRows] = React.useState<Array<Record<string, unknown>>>([])
  const [obsColumns, setObsColumns] = React.useState<string[]>([])
  const [obsError, setObsError] = React.useState<string | null>(null)
  const [obsLoading, setObsLoading] = React.useState(true)

  // Producción data
  const [produccionRows, setProduccionRows] = React.useState<ProduccionRow[]>([])
  const [produccionError, setProduccionError] = React.useState<string | null>(null)
  const [produccionLoading, setProduccionLoading] = React.useState(true)

  // Fetch cosecha data
  React.useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          setIsLoading(true)
          // Use the cosecha table we already derive (fecha, finca, bloque, variedad, dias_cosecha)
          const { rows } = await fetchTable('cosecha')
          const shaped = (rows as Array<Record<string, unknown>>).map(r => {
            // Extract just the date part (YYYY-MM-DD) from fecha, in case it has time
            const rawFecha = String((r as any).fecha)
            const dateOnly = rawFecha.split('T')[0].split(' ')[0]
            return {
              fecha: dateOnly,
              finca: String((r as any).finca ?? ''),
              bloque: String((r as any).bloque ?? ''),
              variedad: String((r as any).variedad ?? ''),
              dias_cosecha: toNumber((r as any).dias_cosecha) || 0,
            }
          })
          if (!cancelled) {
            setRows(shaped)

            const todayTotals = new Map<string, number>()
            const weekTotals = new Map<string, number>()

            const now = new Date()
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
            const currentDay = (now.getUTCDay() + 6) % 7
            const currentMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - currentDay))
            const currentYear = currentMonday.getUTCFullYear()
            const currentOneJan = new Date(Date.UTC(currentYear, 0, 1))
            const currentWeek = Math.floor(((+currentMonday - +currentOneJan) / 86400000 + ((currentOneJan.getUTCDay() + 6) % 7)) / 7) + 1
            const currentWeekKey = `${currentYear}-W${String(currentWeek).padStart(2, '0')}`

            for (const r of shaped) {
              const base = toNumber(r.dias_cosecha)
              if (!Number.isFinite(base)) continue
              const variety = r.variedad ?? ''

              // Normalize fecha to just date part for comparison
              const rowDateOnly = r.fecha.split('T')[0].split(' ')[0]
              if (rowDateOnly === todayKey) {
                todayTotals.set(variety, (todayTotals.get(variety) ?? 0) + base)
                todayTotals.set('', (todayTotals.get('') ?? 0) + base)
              }

              const date = new Date(r.fecha)
              if (Number.isNaN(date.getTime())) continue
              const day = (date.getUTCDay() + 6) % 7
              const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day))
              const year = monday.getUTCFullYear()
              const oneJan = new Date(Date.UTC(year, 0, 1))
              const week = Math.floor(((+monday - +oneJan) / 86400000 + ((oneJan.getUTCDay() + 6) % 7)) / 7) + 1
              const weekKey = `${year}-W${String(week).padStart(2, '0')}`
              if (weekKey === currentWeekKey) {
                weekTotals.set('', (weekTotals.get('') ?? 0) + base)
                weekTotals.set(variety, (weekTotals.get(variety) ?? 0) + base)
              }
            }

            setCosechaSummary({ today: todayTotals, week: weekTotals })
          }
        } catch (e: any) {
          if (!cancelled) setError(e?.message ?? 'Error loading data')
        } finally {
          if (!cancelled) setIsLoading(false)
        }
      })()
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch observaciones_por_cama data
  React.useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          setObsLoading(true)
          const result = await fetchTable('observaciones_por_cama')
          if (!cancelled) {
            setObsRows(result.rows as Array<Record<string, unknown>>)
            setObsColumns(result.columns || [])
          }
        } catch (e: any) {
          if (!cancelled) setObsError(e?.message ?? 'Error loading observaciones')
        } finally {
          if (!cancelled) setObsLoading(false)
        }
      })()
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch producción data with name lookups
  React.useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          setProduccionLoading(true)
          const [produccionResult, fincaResult, bloqueResult, variedadResult] = await Promise.all([
            fetchTable('produccion'),
            fetchTable('finca'),
            fetchTable('bloque'),
            fetchTable('variedad'),
          ])

          if (cancelled) return

          const fincaMap = new Map<string, string>()
          for (const row of fincaResult.rows as Array<Record<string, unknown>>) {
            const id = String((row as any).id_finca ?? (row as any).id ?? '')
            if (!id) continue
            const name = String((row as any).nombre ?? id)
            fincaMap.set(id, name)
          }

          const bloqueMap = new Map<string, string>()
          for (const row of bloqueResult.rows as Array<Record<string, unknown>>) {
            const id = String((row as any).id_bloque ?? (row as any).id ?? '')
            if (!id) continue
            const name = String((row as any).nombre ?? id)
            bloqueMap.set(id, name)
          }

          const variedadMap = new Map<string, string>()
          for (const row of variedadResult.rows as Array<Record<string, unknown>>) {
            const id = String((row as any).id_variedad ?? (row as any).id ?? '')
            if (!id) continue
            const name = String((row as any).nombre ?? id)
            variedadMap.set(id, name)
          }

          const shaped = (produccionResult.rows as Array<Record<string, unknown>>)
            .map((r) => {
              const rawDate = String((r as any).created_at ?? '')
              const dateOnly = rawDate.split('T')[0].split(' ')[0]
              const fincaId = String((r as any).finca ?? '')
              const bloqueId = String((r as any).bloque ?? '')
              const variedadId = String((r as any).variedad ?? '')
              return {
                fecha: dateOnly,
                finca: fincaMap.get(fincaId) ?? (fincaId || 'Sin finca'),
                bloque: bloqueMap.get(bloqueId) ?? (bloqueId || 'Sin bloque'),
                variedad: variedadMap.get(variedadId) ?? (variedadId || 'Sin variedad'),
                cantidad: toNumber((r as any).cantidad) || 0,
              }
            })
            .filter((row) => row.fecha)

          setProduccionRows(shaped)
          setProduccionError(null)
        } catch (e: any) {
          if (!cancelled) setProduccionError(e?.message ?? 'Error loading producción')
        } finally {
          if (!cancelled) setProduccionLoading(false)
        }
      })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4 gap-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 min-h-0 flex-1">
        <div className="min-h-0">
          <CosechaCard rows={rows} error={error} isLoading={isLoading} summary={cosechaSummary} />
        </div>
        <div className="min-h-0">
          <ObservacionDiaCard rows={obsRows} columns={obsColumns} error={obsError} isLoading={obsLoading} />
        </div>
        <div className="min-h-0">
          <ProduccionCard rows={produccionRows} error={produccionError} isLoading={produccionLoading} />
        </div>
      </div>
    </div>
  )
}