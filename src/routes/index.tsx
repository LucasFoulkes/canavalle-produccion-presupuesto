import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
// Table view removed from home dashboard
import { useTableFilter, useFilteredRows } from '@/hooks/use-table-filter'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { fetchResumenFenologico, ResumenFenologicoResult } from '@/lib/resumen-fenologico'
import { buildPredictionTimeline, scaleTimelineToTotals, keepOnlyLastCosechaDay } from '@/lib/predicciones'
import { formatDate, formatDateISO, formatMax2 } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, CartesianGrid, XAxis, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { FilterToolbar } from '@/components/filter-toolbar'
import { Map as MapIcon, BarChart3, ClipboardList } from 'lucide-react'
import { getISOWeek, weekLabel } from '@/lib/date-helpers'
import { MiniCosechaChart } from '@/components/home/mini-cosecha-chart'
import { AllGpsMapSection } from '@/components/home/all-gps-map-section'
// import { useIsMobile } from '@/hooks/use-mobile'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => {
    const rawFocus = (search?.focus as string | undefined) ?? 'none'
    const focus: 'none' | 'map' | 'charts' =
      rawFocus === 'map' || rawFocus === 'charts' ? rawFocus : 'none'
    // Default to weekly view when param is absent; allow explicit false via query
    const byWeek = (search?.byWeek === undefined ? true : Boolean(search?.byWeek))
    return { focus, byWeek }
  },
  component: LandingCosechaVariedad,
})

type Row = { fecha: any; variedad: string; dias_cosecha: number; rowKey: string }

// MiniCosechaChart extracted to components/home/mini-cosecha-chart

function LandingCosechaVariedad() {
  const { registerColumns } = useTableFilter()
  // const isMobile = useIsMobile()
  const navigate = useNavigate()
  // Bind dashboard focus and grouping to URL for predictable back/forward
  const search = Route.useSearch() as { focus: 'none' | 'map' | 'charts'; byWeek: boolean }
  const focus = search.focus ?? 'none'
  const byWeek = search.byWeek
  const setFocus = (next: 'none' | 'map' | 'charts') => {
    navigate({ to: '/', search: (prev: any) => ({ ...prev, focus: next === 'none' ? undefined : next }) })
  }
  const setByWeek = (next: boolean) => {
    // Persist explicit boolean so false overrides the default
    navigate({ to: '/', search: (prev: any) => ({ ...prev, byWeek: next }) })
  }
  const { data } = useDeferredLiveQuery<ResumenFenologicoResult | undefined>(
    () => fetchResumenFenologico(),
    [],
    { defer: false },
  )

  const timelineRows = React.useMemo(() => {
    const base = buildPredictionTimeline(data)
    return scaleTimelineToTotals(base)
  }, [data])

  // Group by fecha + variedad; sum cosecha, but only from the last cosecha day per (bloqueId,variedadId,fincaId)
  const rows = React.useMemo(() => {
    const acc = new Map<string, Row>()
    const pruned = keepOnlyLastCosechaDay(timelineRows || []) as any[]
    for (const r of pruned) {
      const cosecha = Number((r as any)?.dias_cosecha || 0)
      if (cosecha <= 0) continue
      const fechaISO = formatDateISO((r as any)?.fecha)
      if (!fechaISO) continue
      const variedad = String((r as any)?.variedad ?? '—')
      const key = `${fechaISO}|${variedad}`
      const existing = acc.get(key)
      if (existing) {
        existing.dias_cosecha += cosecha
      } else {
        acc.set(key, {
          fecha: (r as any)?.fecha,
          variedad,
          dias_cosecha: cosecha,
          rowKey: key,
        })
      }
    }
    return Array.from(acc.values()).sort((a, b) => {
      const ad = new Date(a.fecha).getTime()
      const bd = new Date(b.fecha).getTime()
      if (ad !== bd) return ad - bd
      return a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' })
    })
  }, [timelineRows])

  const columns = React.useMemo(
    () => [
      {
        key: 'fecha',
        header: byWeek ? 'Semana' : 'Fecha',
        render: (v: any) => byWeek ? weekLabel(v) : formatDate(v),
      },
      { key: 'variedad', header: 'Variedad' },
      { key: 'dias_cosecha', header: 'Cosecha', render: (v: any) => formatMax2(v) },
    ],
    [byWeek],
  )
  React.useEffect(() => {
    registerColumns(columns.map((c: any) => ({ key: String(c.key), label: c.header || String(c.key) })))
  }, [columns, registerColumns])

  // Helpers to aggregate by ISO week (Monday as first day)
  const toISODate = (d: Date) => d.toISOString().slice(0, 10)
  const weekKeyOf = (dateInput: any) => {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ''
    // Compute Monday in UTC
    const day = d.getUTCDay() // 0=Sun..6=Sat
    const isoDay = (day + 6) % 7 // 0=Mon..6=Sun
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    monday.setUTCDate(monday.getUTCDate() - isoDay)
    return toISODate(monday)
  }

  const weeklyRows = React.useMemo(() => {
    if (!rows?.length) return [] as Row[]
    const acc = new Map<string, Row>() // key: weekISO|variedad
    for (const r of rows) {
      const wk = weekKeyOf(r.fecha)
      if (!wk) continue
      const key = `${wk}|${r.variedad}`
      const existing = acc.get(key)
      if (existing) {
        existing.dias_cosecha += Number(r.dias_cosecha || 0)
      } else {
        acc.set(key, { fecha: wk, variedad: r.variedad, dias_cosecha: Number(r.dias_cosecha || 0), rowKey: key })
      }
    }
    return Array.from(acc.values()).sort((a, b) => {
      const ad = new Date(a.fecha).getTime()
      const bd = new Date(b.fecha).getTime()
      if (ad !== bd) return ad - bd
      return a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' })
    })
  }, [rows])

  const tableSource = byWeek ? weeklyRows : rows
  const filteredRows = useFilteredRows(tableSource, columns as any)

  // Build chart data: all dates across dataset, and per-variedad series with zeros for missing dates
  // Build a continuous domain of dates or week-starts for chart X-axis, so empty periods render as 0
  const allDates = React.useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return [] as string[]
    const dateVals = (filteredRows as any[])
      .map(r => new Date(r?.fecha))
      .filter(d => !isNaN(d.getTime())) as Date[]
    if (dateVals.length === 0) return []
    // Find min/max (UTC)
    let min = new Date(Math.min(...dateVals.map(d => d.getTime())))
    let max = new Date(Math.max(...dateVals.map(d => d.getTime())))
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const addDays = (d: Date, days: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + days); return x }
    if (byWeek) {
      // Align to Monday for both ends
      const wkMinStr = weekKeyOf(min)
      const wkMaxStr = weekKeyOf(max)
      if (!wkMinStr || !wkMaxStr) return []
      let cur = new Date(`${wkMinStr}T00:00:00Z`)
      const end = new Date(`${wkMaxStr}T00:00:00Z`)
      const out: string[] = []
      while (cur.getTime() <= end.getTime()) {
        out.push(toISO(cur))
        cur = addDays(cur, 7)
      }
      return out
    }
    // Daily: enumerate every day between min and max
    const out: string[] = []
    let cur = new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), min.getUTCDate()))
    const end = new Date(Date.UTC(max.getUTCFullYear(), max.getUTCMonth(), max.getUTCDate()))
    while (cur.getTime() <= end.getTime()) {
      out.push(toISO(cur))
      cur = addDays(cur, 1)
    }
    return out
  }, [filteredRows, byWeek])

  const chartSeriesByVariedad = React.useMemo(() => {
    const byVar = new Map<string, Map<string, number>>()
    for (const r of filteredRows) {
      const v = r.variedad
      const dateIso = formatDateISO(r.fecha)
      if (!dateIso) continue
      if (!byVar.has(v)) byVar.set(v, new Map())
      const m = byVar.get(v)!
      m.set(dateIso, (m.get(dateIso) ?? 0) + Number(r.dias_cosecha || 0))
    }
    // Expand to all dates
    const result: Record<string, { date: string; value: number }[]> = {}
    for (const [v, m] of byVar) {
      result[v] = allDates.map((d) => ({ date: d, value: m.get(d) ?? 0 }))
    }
    return result
  }, [filteredRows, allDates])

  const hasChartData = React.useMemo(() => {
    const varieties = Object.keys(chartSeriesByVariedad)
    if (!varieties.length) return false
    for (const v of varieties) {
      const series = chartSeriesByVariedad[v]
      if (series && series.some((p) => Number(p.value) > 0)) return true
    }
    return false
  }, [chartSeriesByVariedad])

  // (removed mini table summary chart; no dailyTotals needed here)

  // Overview cards (dashboard)
  // Removed previous totalCosecha aggregate and daily user metrics (unused)

  const Overview = (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-in">
      {/* Observacion - first on mobile */}
      <Card className="order-1 md:order-none cursor-pointer transition-colors bg-[#2563eb]/20 hover:bg-[#2563eb]/30" onClick={() => navigate({ to: '/observaciones/mobile-input' })}>
        <CardHeader className="pb-2 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Observacion</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ingreso de datos de observaciones de campo.
        </CardContent>
      </Card>

      {/* Cosecha - second on mobile */}
      <Card className="order-2 md:order-none cursor-pointer card-hover transition-colors hover:bg-accent/20" onClick={() => setFocus('charts')}>
        <CardHeader className="pb-2 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Cosecha</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <MiniCosechaChart rows={filteredRows} byWeek={byWeek} onToggle={() => setByWeek(!byWeek)} />
        </CardContent>
      </Card>


      {/* Mapa GPS - fourth on mobile */}
      <Card className="order-4 md:order-none cursor-pointer card-hover transition-colors hover:bg-accent/20" onClick={() => setFocus('map')}>
        <CardHeader className="pb-2 flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Mapa GPS</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {/* Global controls */}
      <div className="mb-2 flex items-center justify-between gap-2">
        {(focus === 'charts') ? (
          <FilterToolbar className="ml-0" />
        ) : <div />}
        <div className="flex items-center gap-2">
          {focus === 'charts' && (
            <Button size="sm" variant="outline" onClick={() => setByWeek(!byWeek)}>{byWeek ? 'Ver por día' : 'Acumular por semana'}</Button>
          )}
          {focus !== 'none' && (
            <Button size="sm" variant="outline" onClick={() => setFocus('none')}>Volver</Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {focus === 'none' && (
          <div className="flex-1 min-h-0 overflow-auto pr-1 pb-1">
            {Overview}
          </div>
        )}
        {focus === 'map' && (
          <div className="flex-1 min-h-0 overflow-hidden animate-fade-in-up">
            <AllGpsMapSection />
          </div>
        )}
        {focus === 'charts' && (
          <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3 animate-fade-in-up">
            {!hasChartData && (
              <div className="text-sm text-muted-foreground px-1">Sin datos de cosecha para graficar.</div>
            )}
            {hasChartData && Object.keys(chartSeriesByVariedad).map((varName) => {
              const data = chartSeriesByVariedad[varName]
              return (
                <Card key={varName} className="py-0">
                  <CardHeader className="px-4 py-3">
                    <CardTitle className="text-base">{varName}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-3">
                    <ChartContainer config={{ value: { label: 'Cosecha', color: 'var(--chart-1)' } }} className="w-full h-[260px]">
                      <BarChart data={data} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={32}
                          tickFormatter={(value: string) => {
                            const d = new Date(value)
                            if (byWeek) {
                              return `Sem ${getISOWeek(d)}`
                            }
                            const dd = String(d.getUTCDate()).padStart(2, '0')
                            const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
                            return `${dd}/${mm}`
                          }}
                        />
                        <Tooltip formatter={(v: any) => String(formatMax2(v))} labelFormatter={(value: any) => formatDate(value)} />
                        <Bar dataKey="value" fill={`var(--color-value, #2563eb)`} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        {/* Table view removed */}
      </div>
    </div>
  )
}

// AllGpsMapSection and helpers extracted to components/home/all-gps-map-section
