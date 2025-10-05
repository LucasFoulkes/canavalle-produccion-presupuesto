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
  // Raw cosecha rows (fecha, variedad, dias_cosecha)
  const [rows, setRows] = React.useState<Array<{ fecha: string; variedad: string; dias_cosecha: number }>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [cosechaSummary, setCosechaSummary] = React.useState<{ today: Map<string, number>; week: Map<string, number> }>({ today: new Map(), week: new Map() })

  React.useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          // Use the cosecha table we already derive (fecha, variedad, dias_cosecha)
          const { rows } = await fetchTable('cosecha')
          const shaped = (rows as Array<Record<string, unknown>>).map(r => ({
            fecha: String((r as any).fecha),
            variedad: String((r as any).variedad ?? ''),
            dias_cosecha: toNumber((r as any).dias_cosecha) || 0,
          }))
          if (!cancelled) {
            setRows(shaped)

            const todayTotals = new Map<string, number>()
            const weekTotals = new Map<string, number>()

            const now = new Date()
            const todayKey = now.toISOString().slice(0, 10)
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

              if (r.fecha === todayKey) {
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
          // no-op
        }
      })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4 gap-4">
      <CosechaCard rows={rows} error={error} summary={cosechaSummary} />
    </div>
  )
}