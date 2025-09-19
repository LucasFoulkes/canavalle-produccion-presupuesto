import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatInt, formatDateISO, formatMax2 } from '@/lib/utils'
import { useFilteredRows, useTableFilter } from '@/hooks/use-table-filter'
import {
  fetchResumenFenologico,
  formatResumenStageRich,
  ResumenFenologicoResult,
  ResumenFenologicoRow,
  STAGE_KEYS,
  STAGE_LABELS,
} from '@/lib/resumen-fenologico'
import { buildPredictionTimeline, scaleTimelineToTotals, sortEstados } from '@/lib/predicciones'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis } from 'recharts'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/predicciones/totales')({
  component: PrediccionesTotalesPage,
})

function PrediccionesTotalesPage() {
  const { registerColumns } = useTableFilter()
  const [showCharts, setShowCharts] = React.useState(false)
  const { data, loading } = useDeferredLiveQuery<ResumenFenologicoResult | undefined>(
    () => fetchResumenFenologico(),
    [],
    { defer: false },
  )

  const timelineRows = React.useMemo(() => {
    const baseRows = buildPredictionTimeline(data)
    return scaleTimelineToTotals(baseRows)
  }, [data])

  const estadoMap = data?.estados
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)

  const selectedRow = React.useMemo(() => {
    if (!selectedKey) return null
    return timelineRows.find((row) => row.rowKey === selectedKey) ?? null
  }, [timelineRows, selectedKey])

  const selectedEstados = React.useMemo(() => {
    if (!selectedRow || !estadoMap) return [] as any[]
    const key = `${selectedRow.bloqueId}|${selectedRow.variedadId}|${selectedRow.fincaId}`
    const matches = estadoMap.get(key) ?? []
    return sortEstados(matches)
  }, [estadoMap, selectedRow])

  const renderStage = (key: typeof STAGE_KEYS[number]) => (value: number, row: ResumenFenologicoRow) => {
    const pct = row?.[`${key}_pct` as keyof ResumenFenologicoRow] as number | undefined
    const display = formatResumenStageRich(value, Number(pct ?? 0))
    if (!display) return null
    return (
      <span className="whitespace-nowrap">
        {display.inline}{' '}
        <span className="text-muted-foreground text-[0.7rem]">({display.pct}%)</span>
      </span>
    )
  }

  const columns = React.useMemo(
    () =>
      [
        { key: 'finca', header: 'Finca' },
        { key: 'bloque', header: 'Bloque' },
        { key: 'variedad', header: 'Variedad' },
        { key: 'fecha', header: 'Fecha', render: (v: any) => formatDate(v) },
        { key: 'dias_brotacion', header: STAGE_LABELS.dias_brotacion, render: renderStage('dias_brotacion') },
        { key: 'dias_cincuenta_mm', header: STAGE_LABELS.dias_cincuenta_mm, render: renderStage('dias_cincuenta_mm') },
        { key: 'dias_quince_cm', header: STAGE_LABELS.dias_quince_cm, render: renderStage('dias_quince_cm') },
        { key: 'dias_veinte_cm', header: STAGE_LABELS.dias_veinte_cm, render: renderStage('dias_veinte_cm') },
        { key: 'dias_primera_hoja', header: STAGE_LABELS.dias_primera_hoja, render: renderStage('dias_primera_hoja') },
        { key: 'dias_espiga', header: STAGE_LABELS.dias_espiga, render: renderStage('dias_espiga') },
        { key: 'dias_arroz', header: STAGE_LABELS.dias_arroz, render: renderStage('dias_arroz') },
        { key: 'dias_arveja', header: STAGE_LABELS.dias_arveja, render: renderStage('dias_arveja') },
        { key: 'dias_garbanzo', header: STAGE_LABELS.dias_garbanzo, render: renderStage('dias_garbanzo') },
        { key: 'dias_uva', header: STAGE_LABELS.dias_uva, render: renderStage('dias_uva') },
        { key: 'dias_rayando_color', header: STAGE_LABELS.dias_rayando_color, render: renderStage('dias_rayando_color') },
        { key: 'dias_sepalos_abiertos', header: STAGE_LABELS.dias_sepalos_abiertos, render: renderStage('dias_sepalos_abiertos') },
        { key: 'dias_cosecha', header: STAGE_LABELS.dias_cosecha, render: renderStage('dias_cosecha') },
      ],
    [],
  ) as any

  React.useEffect(() => {
    registerColumns(columns.map((c: any) => ({ key: String(c.key), label: c.header || String(c.key) })))
  }, [columns, registerColumns])

  const filteredRows = useFilteredRows(timelineRows, columns)

  // Charts: aggregate dias_cosecha by fecha + variedad across the scaled timeline
  const allDates = React.useMemo(() => {
    const s = new Set<string>()
    for (const r of (timelineRows || []) as any[]) {
      const iso = formatDateISO((r as any)?.fecha)
      if (iso) s.add(iso)
    }
    return Array.from(s).sort()
  }, [timelineRows])

  type ChartPoint = { date: string; value: number }
  const chartSeriesByVariedad = React.useMemo(() => {
    const byVar = new Map<string, Map<string, number>>()
    for (const r of (timelineRows || []) as any[]) {
      const cosecha = Number(r?.dias_cosecha || 0)
      if (cosecha <= 0) continue
      const dateIso = formatDateISO(r?.fecha)
      if (!dateIso) continue
      const variedad = String(r?.variedad ?? '—')
      if (!byVar.has(variedad)) byVar.set(variedad, new Map())
      const m = byVar.get(variedad)!
      m.set(dateIso, (m.get(dateIso) ?? 0) + cosecha)
    }
    const result: Record<string, ChartPoint[]> = {}
    for (const [v, m] of byVar) {
      result[v] = allDates.map((d) => ({ date: d, value: m.get(d) ?? 0 }))
    }
    return result
  }, [timelineRows, allDates])

  const hasChartData = React.useMemo(() => {
    const keys = Object.keys(chartSeriesByVariedad)
    if (!keys.length) return false
    for (const k of keys) {
      const series = chartSeriesByVariedad[k]
      if (series?.some((p) => Number(p.value) > 0)) return true
    }
    return false
  }, [chartSeriesByVariedad])

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">Predicciones totales</div>
        {!loading && (
          <Button size="sm" variant="outline" onClick={() => setShowCharts((v) => !v)}>
            {showCharts ? 'Ocultar gráficos' : 'Ver gráficos por variedad'}
          </Button>
        )}
      </div>

      {showCharts ? (
        <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
          {!hasChartData && (
            <div className="text-sm text-muted-foreground px-1">Sin datos de cosecha para graficar.</div>
          )}
          {hasChartData &&
            Object.keys(chartSeriesByVariedad).map((varName) => {
              const data = chartSeriesByVariedad[varName]
              return (
                <Card key={varName} className="py-0">
                  <CardHeader className="px-4 py-3">
                    <CardTitle className="text-base">{varName}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-3">
                    <ChartContainer config={{ value: { label: 'Cosecha', color: '#2563eb' } }} className="w-full h-[240px]">
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
      ) : loading ? (
        <DataTableSkeleton columns={columns as any} rows={8} />
      ) : (
        <DataTable<ResumenFenologicoRow>
          caption={`${filteredRows?.length ?? 0}`}
          columns={columns}
          rows={filteredRows ?? []}
          getRowKey={(row) => row.rowKey}
          onRowClick={(row) => {
            setSelectedKey(row.rowKey)
            setDialogOpen(true)
          }}
        />
      )}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setSelectedKey(null)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Predicciones totales</DialogTitle>
            {selectedRow ? (
              <DialogDescription>
                <span className="font-medium">Finca:</span> {selectedRow.finca}{' '}
                <span className="font-medium">Bloque:</span> {selectedRow.bloque}{' '}
                <span className="font-medium">Variedad:</span> {selectedRow.variedad}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {selectedEstados.length > 0 ? (
            <div className="space-y-4">
              {selectedEstados.map((estado, index) => {
                const estadoId = String((estado as any)?.id_estado_fenologico ?? index)
                const displayDate = formatDate(
                  (estado as any)?.creado_en ?? (estado as any)?.fecha ?? (estado as any)?.actualizado_en,
                )
                return (
                  <div key={estadoId} className="rounded-md border border-border/60 p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Registro:</span> {estadoId}
                      </div>
                      {displayDate ? <div>Fecha: {displayDate}</div> : null}
                    </div>
                    <table className="w-full table-fixed border-collapse text-sm">
                      <tbody>
                        {STAGE_KEYS.map((stage) => {
                          const value = (estado as any)?.[stage]
                          if (value === undefined || value === null) return null
                          const numeric = Number(value)
                          const rendered = Number.isFinite(numeric)
                            ? formatInt(numeric)
                            : String(value)
                          return (
                            <tr key={stage} className="border-b last:border-b-0">
                              <td className="w-1/2 px-2 py-1.5 font-medium text-foreground">{STAGE_LABELS[stage]}</td>
                              <td className="w-1/2 px-2 py-1.5 text-right">{rendered}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Sin registros de estados fenológicos para esta combinación.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
