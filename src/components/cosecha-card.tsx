import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import { toNumber } from '@/lib/data-utils'

type CosechaCardProps = {
    rows: Array<{ fecha: string; variedad: string; dias_cosecha: number }>
    error: string | null
    summary?: { today: Map<string, number>; week: Map<string, number> }
}

export function CosechaCard({ rows, error, summary }: CosechaCardProps) {
    const [mode, setMode] = React.useState<'day' | 'week'>('day')
    const [variedad, setVariedad] = React.useState<string>('') // empty = all

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

    const summaryValue = React.useMemo(() => {
        if (!summary) return null
        const key = variedad || ''
        const map = mode === 'week' ? summary.week : summary.today
        if (map.size === 0) return null
        return map.get(key) ?? 0
    }, [summary, mode, variedad])

    const summaryLabel = mode === 'week' ? 'Cosecha esperada esta semana' : 'Cosecha esperada hoy'

    return (
        <Card className="flex flex-col min-h-0">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b flex-shrink-0 gap-3">
                <CardTitle className="flex flex-col gap-1">
                    <span>Cosecha</span>
                    {summaryValue != null && Number.isFinite(summaryValue) && (
                        <span className="text-xs font-normal text-muted-foreground">
                            {summaryLabel}: <strong>{toNumber(summaryValue).toLocaleString('es-CO')}</strong>
                        </span>
                    )}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Combobox
                        className="w-[180px]"
                        options={variedadOptions}
                        placeholder="Variedad (todas)"
                        onSelect={(opt) => setVariedad(opt.value)}
                    />
                    <div className="inline-flex items-center gap-1 rounded-md border p-1">
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
            <CardContent className="flex-1 min-h-0 flex flex-col p-0">
                {error ? (
                    <div className="text-red-600">{error}</div>
                ) : (
                    <ChartContainer config={chartConfig} className="flex-1 w-full min-h-0">
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
    )
}
