import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { useTableFilter, useFilteredRows } from '@/hooks/use-table-filter'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { fetchResumenFenologico, ResumenFenologicoResult } from '@/lib/resumen-fenologico'
import { buildPredictionTimeline, scaleTimelineToTotals } from '@/lib/predicciones'
import { formatDate, formatDateISO, formatMax2 } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, CartesianGrid, XAxis, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: LandingCosechaVariedad,
})

type Row = { fecha: any; variedad: string; dias_cosecha: number; rowKey: string }

function LandingCosechaVariedad() {
  const { registerColumns } = useTableFilter()
  const [showCharts, setShowCharts] = React.useState(false)
  const { data, loading } = useDeferredLiveQuery<ResumenFenologicoResult | undefined>(
    () => fetchResumenFenologico(),
    [],
    { defer: false },
  )

  const timelineRows = React.useMemo(() => {
    const base = buildPredictionTimeline(data)
    return scaleTimelineToTotals(base)
  }, [data])

  // Group by fecha + variedad; sum cosecha
  const rows = React.useMemo(() => {
    const acc = new Map<string, Row>()
    for (const r of timelineRows || []) {
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
      { key: 'fecha', header: 'Fecha', render: (v: any) => formatDate(v) },
      { key: 'variedad', header: 'Variedad' },
      { key: 'dias_cosecha', header: 'Cosecha', render: (v: any) => formatMax2(v) },
    ],
    [],
  )
  React.useEffect(() => {
    registerColumns(columns.map((c: any) => ({ key: String(c.key), label: c.header || String(c.key) })))
  }, [columns, registerColumns])

  const tableRows = useFilteredRows(rows, columns as any)

  // Build chart data: all dates across dataset, and per-variedad series with zeros for missing dates
  const allDates = React.useMemo(() => {
    const s = new Set<string>()
    for (const r of (timelineRows || []) as any[]) {
      const iso = formatDateISO(r?.fecha)
      if (iso) s.add(iso)
    }
    return Array.from(s).sort()
  }, [timelineRows])

  const chartSeriesByVariedad = React.useMemo(() => {
    const byVar = new Map<string, Map<string, number>>()
    for (const r of rows) {
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
  }, [rows, allDates])

  const hasChartData = React.useMemo(() => {
    const varieties = Object.keys(chartSeriesByVariedad)
    if (!varieties.length) return false
    for (const v of varieties) {
      const series = chartSeriesByVariedad[v]
      if (series && series.some((p) => Number(p.value) > 0)) return true
    }
    return false
  }, [chartSeriesByVariedad])

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">Cosecha por variedad</div>
        <Button size="sm" variant="outline" onClick={() => setShowCharts((v) => !v)}>
          {showCharts ? 'Ocultar gráficos' : 'Ver gráficos por variedad'}
        </Button>
      </div>
      {showCharts && (
        <div className="mb-3 flex-1 min-h-0 overflow-auto pr-1 space-y-3">
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
                  <ChartContainer config={{ value: { label: 'Cosecha', color: '#2563eb' } }} className="w-full h-[220px]">
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
      {!showCharts && (
        <>
          {loading ? (
            <DataTableSkeleton columns={columns as any} rows={8} />
          ) : (
            <DataTable
              caption={`${tableRows?.length ?? 0}`}
              columns={columns as any}
              rows={tableRows ?? []}
              getRowKey={(row: any) => row.rowKey}
            />
          )}
        </>
      )}
    </div>
  )
}
