import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { fetchTable } from '@/services/tables'
import { toNumber } from '@/lib/data-utils'
import { Combobox, type ComboOption } from '@/components/ui/combobox'

export const Route = createFileRoute('/')({
  validateSearch: (search: { table?: string }) => search,
  component: RouteComponent,
})

function RouteComponent() {
  // Raw cosecha rows (fecha, variedad, dias_cosecha)
  const [rows, setRows] = React.useState<Array<{ fecha: string; variedad: string; dias_cosecha: number }>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<'day' | 'week'>('day')
  const [variedad, setVariedad] = React.useState<string>('') // empty = all

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
          if (!cancelled) setRows(shaped)
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

  const chartConfig = React.useMemo<ChartConfig>(() => ({
    total: { label: 'Cosecha total', color: 'var(--chart-2)' },
  }), [])

  // Derive unique variedades for filter options
  const variedadOptions = React.useMemo<ComboOption[]>(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.variedad) set.add(r.variedad)
    const opts = Array.from(set).sort((a, b) => a.localeCompare(b)).map(v => ({ label: v, value: v }))
    return [{ label: 'Todas', value: '' }, ...opts]
  }, [rows])

  // Aggregate daily totals from filtered rows
  const dailyData = React.useMemo(() => {
    const acc = new Map<string, number>()
    for (const r of rows) {
      if (variedad && r.variedad !== variedad) continue
      const v = toNumber(r.dias_cosecha)
      if (!Number.isFinite(v)) continue
      acc.set(r.fecha, (acc.get(r.fecha) ?? 0) + v)
    }
    return Array.from(acc.entries()).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
  }, [rows, variedad])

  // Compute weekly aggregation from daily data when needed
  const weeklyData = React.useMemo(() => {
    if (mode !== 'week') return [] as Array<{ date: string; total: number }>
    const acc = new Map<string, number>()
    for (const { date, total } of dailyData) {
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) continue
      // ISO week key: YYYY-Www (week starts Monday)
      const day = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
      const year = monday.getUTCFullYear()
      // week number
      const oneJan = new Date(Date.UTC(year, 0, 1))
      const week = Math.floor(((+monday - +oneJan) / 86400000 + ((oneJan.getUTCDay() + 6) % 7)) / 7) + 1
      const key = `${year}-W${String(week).padStart(2, '0')}`
      acc.set(key, (acc.get(key) ?? 0) + total)
    }
    return Array.from(acc.entries()).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
  }, [dailyData, mode])

  return (
    <div className="p-4">
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch gap-3 border-b !p-0 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-1 sm:!py-0">
            <CardTitle>Cosecha</CardTitle>
          </div>
          <div className="flex items-center gap-3 px-6 pb-3 sm:pb-0">
            <Combobox
              className="w-[220px] m-2"
              options={variedadOptions}
              placeholder="Variedad (todas)"
              onSelect={(opt) => setVariedad(opt.value)}
            />
            <div className="inline-flex items-center gap-1 rounded-md border p-1 m-2">
              <button
                aria-pressed={mode === 'day'}
                className={`px-3 py-1 text-sm rounded ${mode === 'day' ? 'bg-muted/50 font-medium' : ''}`}
                onClick={() => setMode('day')}
              >
                Día
              </button>
              <button
                aria-pressed={mode === 'week'}
                className={`px-3 py-1 text-sm rounded ${mode === 'week' ? 'bg-muted/50 font-medium' : ''}`}
                onClick={() => setMode('week')}
              >
                Semana
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          {error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
              <BarChart accessibilityLayer data={mode === 'day' ? dailyData : weeklyData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Cosecha total', angle: -90, position: 'insideLeft' }}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    if (mode === 'week') return String(value) // show week label as is (e.g., 2025-W39)
                    const d = new Date(value)
                    if (Number.isNaN(d.getTime())) return String(value)
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[150px]"
                      nameKey="total"
                      labelFormatter={(value) => {
                        if (mode === 'week') return String(value)
                        const d = new Date(value)
                        if (Number.isNaN(d.getTime())) return String(value)
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      }}
                    />
                  }
                />
                <Bar dataKey="total" fill="#2563eb" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}