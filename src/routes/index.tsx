import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { fetchTable } from '@/services/tables'
import { toNumber } from '@/lib/data-utils'
import { CosechaCard } from '@/components/cosecha-card'

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4 gap-4">
      <CosechaCard rows={rows} error={error} isLoading={isLoading} summary={cosechaSummary} />
    </div>
  )
}