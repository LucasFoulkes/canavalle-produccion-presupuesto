import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { useTableFilter, useFilteredRows } from '@/hooks/use-table-filter'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { fetchResumenFenologico, ResumenFenologicoResult } from '@/lib/resumen-fenologico'
import { buildPredictionTimeline, scaleTimelineToTotals, keepOnlyLastCosechaDay } from '@/lib/predicciones'
import { formatDate, formatDateISO, formatMax2 } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, CartesianGrid, XAxis, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FilterToolbar } from '@/components/filter-toolbar'
import { DatePicker, DateRangePicker, DateRangeValue } from '@/components/date-picker'
import { Map as MapIcon, BarChart3, Table as TableIcon, ClipboardList, ChevronsUpDown, Check } from 'lucide-react'
import { getStore } from '@/lib/dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { format } from 'date-fns'
// import { useIsMobile } from '@/hooks/use-mobile'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => {
    const rawFocus = (search?.focus as string | undefined) ?? 'none'
    const focus: 'none' | 'map' | 'charts' | 'table' =
      rawFocus === 'map' || rawFocus === 'charts' || rawFocus === 'table' ? rawFocus : 'none'
    const byWeek = Boolean(search?.byWeek)
    return { focus, byWeek }
  },
  component: LandingCosechaVariedad,
})

type Row = { fecha: any; variedad: string; dias_cosecha: number; rowKey: string }

// Mini chart for the dashboard card
function MiniCosechaChart({ rows, byWeek, onToggle }: { rows: Row[]; byWeek: boolean; onToggle: () => void }) {
  const [variedad, setVariedad] = React.useState<string | 'todas'>('todas')
  const [openCombo, setOpenCombo] = React.useState(false)
  const allVariedades = React.useMemo(() => Array.from(new Set(rows.map(r => r.variedad))).sort(), [rows])
  const filteredRows = React.useMemo(() => (variedad === 'todas' ? rows : rows.filter(r => r.variedad === variedad)), [rows, variedad])

  const series = React.useMemo(() => {
    const weekKeyOfLocal = (dateInput: any) => {
      const d = new Date(dateInput)
      if (isNaN(d.getTime())) return ''
      const day = d.getUTCDay()
      const isoDay = (day + 6) % 7
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      monday.setUTCDate(monday.getUTCDate() - isoDay)
      return monday.toISOString().slice(0, 10)
    }
    const acc = new Map<string, number>()
    for (const r of filteredRows) {
      const key = byWeek ? weekKeyOfLocal(r.fecha) : formatDateISO(r.fecha)
      if (!key) continue
      acc.set(key, (acc.get(key) ?? 0) + Number(r.dias_cosecha || 0))
    }
    return Array.from(acc.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }))
  }, [filteredRows, byWeek])

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2">
        <Button size="sm" variant="outline" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {byWeek ? 'Ver por día' : 'Por semana'}
        </Button>
        <div className="ml-auto" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Popover open={openCombo} onOpenChange={setOpenCombo}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openCombo} className="h-8 w-[220px] justify-between">
                {variedad === 'todas' ? 'Todas las variedades' : variedad}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="end" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
              <Command>
                <CommandInput placeholder="Buscar variedad..." />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="todas" onSelect={() => { setVariedad('todas'); setOpenCombo(false) }}>
                      <Check className={`mr-2 h-4 w-4 ${variedad === 'todas' ? 'opacity-100' : 'opacity-0'}`} />
                      Todas las variedades
                    </CommandItem>
                    {allVariedades.map((v) => (
                      <CommandItem key={v} value={v} onSelect={(currentValue) => { setVariedad(currentValue as any); setOpenCombo(false) }}>
                        <Check className={`mr-2 h-4 w-4 ${variedad === v ? 'opacity-100' : 'opacity-0'}`} />
                        {v}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <ChartContainer config={{ value: { label: 'Cosecha', color: 'var(--chart-1)' } }} className="w-full h-[160px]">
        <BarChart data={series} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            minTickGap={28}
            tickFormatter={(value: string) => {
              const d = new Date((value.length === 10 ? value + 'T00:00:00Z' : value))
              if (byWeek) return `Sem ${getISOWeek(d)}`
              const dd = String(d.getUTCDate()).padStart(2, '0')
              const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
              return `${dd}/${mm}`
            }}
          />
          <Tooltip formatter={(v: any) => String(formatMax2(v))} labelFormatter={(value: any) => formatDate(value)} />
          <Bar dataKey="value" fill={`var(--color-value, #2563eb)`} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function LandingCosechaVariedad() {
  const { registerColumns } = useTableFilter()
  // const isMobile = useIsMobile()
  const navigate = useNavigate()
  // Bind dashboard focus and grouping to URL for predictable back/forward
  const search = Route.useSearch() as { focus: 'none' | 'map' | 'charts' | 'table'; byWeek?: boolean }
  const focus = search.focus ?? 'none'
  const byWeek = Boolean(search.byWeek)
  const setFocus = (next: 'none' | 'map' | 'charts' | 'table') => {
    navigate({ to: '/', search: (prev: any) => ({ ...prev, focus: next === 'none' ? undefined : next }) })
  }
  const setByWeek = (next: boolean) => {
    navigate({ to: '/', search: (prev: any) => ({ ...prev, byWeek: next ? true : undefined }) })
  }
  const { data, loading } = useDeferredLiveQuery<ResumenFenologicoResult | undefined>(
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
  const tableRows = useFilteredRows(tableSource, columns as any)

  // Build chart data: all dates across dataset, and per-variedad series with zeros for missing dates
  // Build a continuous domain of dates or week-starts for chart X-axis, so empty periods render as 0
  const allDates = React.useMemo(() => {
    if (!tableSource || tableSource.length === 0) return [] as string[]
    const dateVals = (tableSource as any[])
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
  }, [tableSource, byWeek])

  const chartSeriesByVariedad = React.useMemo(() => {
    const byVar = new Map<string, Map<string, number>>()
    for (const r of tableSource) {
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
  }, [tableSource, allDates])

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
  // Small, non-blocking data previews
  const today = React.useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const uniqueUsersToday = useLiveQuery(async () => {
    const store = getStore('puntos_gps')
    const all = await store.toArray()
    const start = new Date(today)
    const end = new Date(today); end.setHours(23, 59, 59, 999)
    const setIds = new Set<number | string | undefined>()
    for (const p of all || []) {
      const ts = new Date((p as any).capturado_en)
      if (ts >= start && ts <= end) setIds.add((p as any).usuario_id ?? 'na')
    }
    return setIds.size
  }, [today])

  const lastPointToday = useLiveQuery(async () => {
    const store = getStore('puntos_gps')
    const all = await store.toArray()
    const start = new Date(today)
    const end = new Date(today); end.setHours(23, 59, 59, 999)
    let maxTs: number | null = null
    for (const p of all || []) {
      const ts = new Date((p as any).capturado_en)
      if (ts >= start && ts <= end) {
        const t = ts.getTime()
        if (maxTs == null || t > maxTs) maxTs = t
      }
    }
    return maxTs ? new Date(maxTs).toISOString() : null
  }, [today])

  // Removed previous totalCosecha aggregate (unused) to keep lint clean

  // Additional metrics for cards
  const todayISO = React.useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])
  const todayKey = (d: Date) => d.toISOString().slice(0, 10)
  const rowsByDate = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows || []) {
      const iso = typeof r.fecha === 'string' ? r.fecha.slice(0, 10) : formatDateISO(r.fecha)
      if (!iso) continue
      m.set(iso, (m.get(iso) ?? 0) + Number(r.dias_cosecha || 0))
    }
    return m
  }, [rows])
  const todayTotal = React.useMemo(() => rowsByDate.get(todayKey(todayISO)) ?? 0, [rowsByDate, todayISO])
  // Removed last7Total, varietiesCount, rowCount, distinctDays, lastDateStr per simplified previews

  const Overview = (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-fade-in">
      {/* Observacion - first on mobile */}
      <Card className="order-1 md:order-none md:col-span-3 cursor-pointer transition-colors hover:bg-accent/20 border-muted" onClick={() => navigate({ to: '/observaciones/mobile-input' })}>
        <CardHeader className="pb-2 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Observacion</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="rounded-md border px-2 py-1 text-foreground text-xs">Abrir formulario</div>
          </div>
        </CardContent>
      </Card>

      {/* Cosecha por variedad - second on mobile */}
      <Card className="order-2 md:order-none md:col-span-6 cursor-pointer card-hover transition-colors hover:bg-accent/20 border-muted" onClick={() => setFocus('charts')}>
        <CardHeader className="pb-2 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Cosecha por variedad</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <MiniCosechaChart rows={tableSource} byWeek={byWeek} onToggle={() => setByWeek(!byWeek)} />
        </CardContent>
      </Card>

      {/* Tabla - third on mobile */}
      <Card className="order-3 md:order-none md:col-span-3 cursor-pointer card-hover transition-colors hover:bg-accent/30" onClick={() => setFocus('table')}>
        <CardHeader className="pb-2 flex items-center gap-2">
          <TableIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Tabla</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="rounded-md border px-2 py-1 text-foreground text-xs">Hoy: {formatMax2(todayTotal)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Mapa GPS - fourth on mobile */}
      <Card className="order-4 md:order-none md:col-span-6 cursor-pointer card-hover transition-colors hover:bg-accent/20 border-muted" onClick={() => setFocus('map')}>
        <CardHeader className="pb-2 flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Mapa GPS</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="rounded-md border px-2 py-1 text-foreground text-xs">
              {uniqueUsersToday ?? 0} usuarios
            </div>
            <div className="rounded-md border px-2 py-1 text-foreground text-xs">
              última {(() => { try { return new Date(lastPointToday ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '—' } })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden p-4">
      {/* Global controls */}
      <div className="mb-2 flex items-center justify-between gap-2">
        {(focus === 'charts' || focus === 'table') ? (
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
          <div className="flex-1 min-h-0 overflow-auto animate-fade-in">
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
        {focus === 'table' && (
          <div className="flex-1 min-h-0 overflow-auto animate-fade-in-up">
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
          </div>
        )}
      </div>
    </div>
  )
}

type GpsRow = {
  id?: string
  __key?: string
  latitud: number
  longitud: number
  precision?: number | null
  altitud?: number | null
  capturado_en: string // ISO timestamp
  observacion?: boolean
  usuario_id?: number | null
}

type UserRow = {
  id_usuario: number
  nombres?: string
  apellidos?: string
}

const userColors = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
]

function colorForUser(id?: number | null): string {
  if (id == null) return '#555'
  const idx = Math.abs(id) % userColors.length
  return userColors[idx]
}

function AllGpsMapSection() {
  const [range, setRange] = React.useState<DateRangeValue>(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return { from: today, to: today }
  })
  const [timeCutoff, setTimeCutoff] = React.useState<number>(24 * 60)

  const puntos = useLiveQuery(async () => {
    const store = getStore('puntos_gps')
    const all = await store.toArray()
    return all as GpsRow[]
  }, [])
  const usuarios = useLiveQuery(async () => {
    const store = getStore('usuario')
    const all = await store.toArray()
    return all as UserRow[]
  }, [])

  const usersById = React.useMemo(() => {
    const m = new Map<number, UserRow>()
    for (const u of usuarios || []) m.set(u.id_usuario, u)
    return m
  }, [usuarios])

  const filtered = React.useMemo(() => {
    if (!puntos) return [] as GpsRow[]
    const from = range.from ? new Date(range.from) : null
    const to = range.to ? new Date(range.to) : from
    if (from) from.setHours(0, 0, 0, 0)
    if (to) to.setHours(23, 59, 59, 999)

    const lastDay = to ? new Date(to) : from
    let lastDayEnd: Date | null = null
    if (lastDay) {
      lastDayEnd = new Date(lastDay)
      const hours = Math.floor(timeCutoff / 60)
      const minutes = timeCutoff % 60
      lastDayEnd.setHours(hours, minutes, 59, 999)
    }

    return (puntos as GpsRow[]).filter((p) => {
      const ts = new Date(p.capturado_en)
      if (from && ts < from) return false
      if (to && ts > to) return false
      if (lastDay && ts.getUTCFullYear() === lastDay.getUTCFullYear() && ts.getUTCMonth() === lastDay.getUTCMonth() && ts.getUTCDate() === lastDay.getUTCDate()) {
        if (lastDayEnd && ts > lastDayEnd) return false
      }
      return true
    })
  }, [puntos, range, timeCutoff])

  const bounds = React.useMemo(() => {
    const latlngs = filtered.map((p) => [p.latitud, p.longitud] as [number, number])
    if (latlngs.length === 0) return null
    return L.latLngBounds(latlngs)
  }, [filtered])

  return (
    <section className="flex min-h-0 h-full flex-col overflow-hidden">
      <header className="shrink-0 flex flex-wrap items-center gap-2 px-0 pb-2 justify-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const from = range.from ? new Date(range.from) : new Date()
            from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
            setRange({ from, to: from })
            setTimeCutoff(24 * 60)
          }}>Día anterior</Button>
          <DatePicker
            value={range.from}
            onChange={(d) => {
              if (!d) return
              const day = new Date(d); day.setHours(0, 0, 0, 0)
              setRange({ from: day, to: day })
              setTimeCutoff(24 * 60)
            }}
            placeholder="Seleccionar día"
            className="w-[180px]"
          />
          <Button variant="outline" size="sm" onClick={() => {
            const from = range.from ? new Date(range.from) : new Date()
            from.setDate(from.getDate() + 1); from.setHours(0, 0, 0, 0)
            setRange({ from, to: from })
            setTimeCutoff(24 * 60)
          }}>Día siguiente</Button>
          <DateRangePicker value={range} onChange={(r) => setRange(r)} placeholder="Rango de fechas" className="w-[240px]" />
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <div className="relative flex-1 min-h-0 w-full overflow-hidden rounded-md border">
          <MapContainer center={[4.711, -74.072]} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((p, idx) => (
              <Marker
                key={String((p as any).id ?? (p as any).__key ?? idx)}
                position={[p.latitud, p.longitud] as any}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="background:${colorForUser(p.usuario_id)};width:10px;height:10px;border-radius:50%;border:1px solid white;"></div>`
                })}
              />
            ))}
            <InvalidateSize />
            <FitBounds bounds={bounds} />
          </MapContainer>
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {range.from ? `Desde ${format(range.from, 'dd/MM/yyyy')}` : ''}
            {range.to ? ` hasta ${format(range.to, 'dd/MM/yyyy')}` : ''}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm">Hora: 00:00</label>
            <input
              type="range"
              min={0}
              max={24 * 60}
              step={15}
              value={timeCutoff}
              onChange={(e) => setTimeCutoff(Number(e.target.value))}
              className="w-[220px]"
            />
            <label className="text-sm">{format(minutesToDate(timeCutoff), 'HH:mm')}</label>
          </div>
        </div>
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">Usuarios</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(filtered.map((p) => p.usuario_id ?? -1))).map((id) => {
              const user = id === -1 ? undefined : usersById.get(id as number)
              const label = user ? (user.nombres ? `${user.nombres}` : `Usuario ${id}`) : 'Sin usuario'
              return (
                <div key={String(id)} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                  <span className="inline-block size-3 rounded-full" style={{ background: colorForUser(id as number) }} />
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function minutesToDate(mins: number) {
  const d = new Date(0)
  d.setUTCHours(0, mins, 0, 0)
  return d
}

// Compute ISO week number (1-53) from a Date (UTC-based to be consistent with data handling)
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Thursday in current week decides the year.
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNo
}

// Render label like "Sem 35" for a weekly bucket value (date or ISO date string)
function weekLabel(value: any): string {
  if (!value) return ''
  let d: Date
  if (typeof value === 'string' && value.length === 10 && /\d{4}-\d{2}-\d{2}/.test(value)) {
    d = new Date(`${value}T00:00:00Z`)
  } else if (value instanceof Date) {
    d = value
  } else {
    d = new Date(value)
  }
  if (isNaN(d.getTime())) return String(value)
  return `Sem ${getISOWeek(d)}`
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()
  React.useEffect(() => {
    if (bounds) {
      try {
        map.invalidateSize()
        map.fitBounds(bounds, { padding: [20, 20] })
        // After the animation/layout settles, invalidate again
        setTimeout(() => { try { map.invalidateSize() } catch { } }, 150)
      } catch { }
    }
  }, [bounds, map])
  return null
}

// Ensure Leaflet recalculates the container size after mount/layout changes
function InvalidateSize() {
  const map = useMap()
  React.useEffect(() => {
    // invalidate immediately after mount
    try { map.invalidateSize() } catch { }
    // also invalidate after a short delay to catch CSS transitions
    const t = setTimeout(() => { try { map.invalidateSize() } catch { } }, 200)
    // and on window resize
    const onResize = () => { try { map.invalidateSize() } catch { } }
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize) }
  }, [map])
  return null
}
