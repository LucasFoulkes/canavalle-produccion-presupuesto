import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toNumber } from '@/lib/data-utils'
import * as XLSX from 'xlsx'

type CosechaCardProps = {
    rows: Array<{ fecha: string; finca: string; bloque: string; variedad: string; dias_cosecha: number }>
    error: string | null
    isLoading: boolean
    summary?: { today: Map<string, number>; week: Map<string, number> }
}

export function CosechaCard({ rows, error, isLoading, summary }: CosechaCardProps) {
    const [mode, setMode] = React.useState<'day' | 'week'>('day')
    const [finca, setFinca] = React.useState<string>('') // empty = all
    const [bloque, setBloque] = React.useState<string>('') // empty = all
    const [variedad, setVariedad] = React.useState<string>('') // empty = all

    // Single source of truth for today's date - calculated once
    const today = React.useMemo(() => {
        const now = new Date()
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        return {
            date: now,
            key: todayKey,
            formatted: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }
    }, [])

    const chartConfig = React.useMemo<ChartConfig>(() => ({
        total: { label: 'Cosecha total', color: 'var(--chart-2)' },
    }), [])

    // Derive unique fincas, bloques, and variedades for filter options
    const fincaOptions = React.useMemo<ComboOption[]>(() => {
        const set = new Set<string>()
        for (const r of rows) if (r.finca) set.add(r.finca)
        const opts = Array.from(set).sort((a, b) => a.localeCompare(b)).map(v => ({ label: v, value: v }))
        return [{ label: 'Todas', value: '' }, ...opts]
    }, [rows])

    const bloqueOptions = React.useMemo<ComboOption[]>(() => {
        const set = new Set<string>()
        for (const r of rows) {
            // Only include bloques from the selected finca (or all if no finca filter)
            if (finca && r.finca !== finca) continue
            if (r.bloque) set.add(r.bloque)
        }
        const opts = Array.from(set).sort((a, b) => a.localeCompare(b)).map(v => ({ label: v, value: v }))
        return [{ label: 'Todos', value: '' }, ...opts]
    }, [rows, finca])

    const variedadOptions = React.useMemo<ComboOption[]>(() => {
        const set = new Set<string>()
        for (const r of rows) {
            // Only include variedades from the selected finca and/or bloque (or all if no filter)
            if (finca && r.finca !== finca) continue
            if (bloque && r.bloque !== bloque) continue
            if (r.variedad) set.add(r.variedad)
        }
        const opts = Array.from(set).sort((a, b) => a.localeCompare(b)).map(v => ({ label: v, value: v }))
        return [{ label: 'Todas', value: '' }, ...opts]
    }, [rows, finca, bloque])

    // Aggregate daily totals from filtered rows, 90 days before and after today
    const dailyData = React.useMemo(() => {
        const acc = new Map<string, number>()

        // Calculate date range: 90 days before and 90 days after today
        const startDate = new Date(today.date)
        startDate.setDate(startDate.getDate() - 90)
        const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

        const endDate = new Date(today.date)
        endDate.setDate(endDate.getDate() + 90)
        const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

        for (const r of rows) {
            // Apply filters
            if (finca && r.finca !== finca) continue
            if (bloque && r.bloque !== bloque) continue
            if (variedad && r.variedad !== variedad) continue

            const rowDate = r.fecha.split('T')[0].split(' ')[0]

            // Filter to date range
            if (rowDate < startKey || rowDate > endKey) continue

            const v = toNumber(r.dias_cosecha)
            if (!Number.isFinite(v)) continue
            acc.set(rowDate, (acc.get(rowDate) ?? 0) + v)
        }
        return Array.from(acc.entries()).map(([date, total]) => ({ date, total, isToday: date === today.key })).sort((a, b) => a.date.localeCompare(b.date))
    }, [rows, finca, bloque, variedad, today.key, today.date])

    // Compute weekly aggregation from daily data when needed
    const weeklyData = React.useMemo(() => {
        if (mode !== 'week') return [] as Array<{ date: string; total: number; isToday: boolean }>
        const acc = new Map<string, { total: number; hasToday: boolean }>()

        for (const { date, total, isToday } of dailyData) {
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

            const existing = acc.get(key) ?? { total: 0, hasToday: false }
            acc.set(key, { total: existing.total + total, hasToday: existing.hasToday || isToday })
        }
        return Array.from(acc.entries()).map(([date, { total, hasToday }]) => ({
            date,
            total,
            isToday: hasToday
        })).sort((a, b) => a.date.localeCompare(b.date))
    }, [dailyData, mode, today.key])

    const summaryValue = React.useMemo(() => {
        if (!summary) return null
        const key = variedad || ''
        const map = mode === 'week' ? summary.week : summary.today
        if (map.size === 0) return null
        return map.get(key) ?? 0
    }, [summary, mode, variedad])

    const summaryLabel = React.useMemo(() => {
        if (mode === 'week') {
            const day = (today.date.getUTCDay() + 6) % 7
            const monday = new Date(Date.UTC(today.date.getUTCFullYear(), today.date.getUTCMonth(), today.date.getUTCDate() - day))
            const year = monday.getUTCFullYear()
            const oneJan = new Date(Date.UTC(year, 0, 1))
            const week = Math.floor(((+monday - +oneJan) / 86400000 + ((oneJan.getUTCDay() + 6) % 7)) / 7) + 1
            const weekKey = `${year}-W${String(week).padStart(2, '0')}`
            return `Cosecha esperada ${weekKey}`
        }
        return `Cosecha esperada ${today.formatted}`
    }, [mode, today])

    // Export to Excel function
    const handleExportExcel = React.useCallback(() => {
        // Prepare data based on current mode and filters
        const data = mode === 'day' ? dailyData : weeklyData

        // Create worksheet data with headers
        const wsData = [
            [mode === 'day' ? 'Fecha' : 'Semana', 'Total Cosecha', 'Hoy'],
            ...data.map(row => [
                row.date,
                row.total,
                row.isToday ? 'Sí' : 'No'
            ])
        ]

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(wsData)

        // Set column widths
        ws['!cols'] = [
            { wch: 15 },  // Date/Week column
            { wch: 15 },  // Total column
            { wch: 10 }   // IsToday column
        ]

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Cosecha')

        // Generate filename with filters and date
        const filterParts = []
        if (finca) filterParts.push(`Finca-${finca}`)
        if (bloque) filterParts.push(`Bloque-${bloque}`)
        if (variedad) filterParts.push(`Variedad-${variedad}`)
        const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : ''
        const filename = `Cosecha_${mode === 'day' ? 'Diaria' : 'Semanal'}${filterSuffix}_${today.key}.xlsx`

        // Download file
        XLSX.writeFile(wb, filename)
    }, [mode, dailyData, weeklyData, finca, bloque, variedad, today.key])

    return (
        <Card className="flex flex-col min-h-0">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b flex-shrink-0 gap-3">
                <CardTitle className="flex flex-col gap-1">
                    <span>Cosecha</span>
                    {summaryValue != null && Number.isFinite(summaryValue) && (
                        <span className="text-xs font-normal text-muted-foreground">
                            {summaryLabel}: <strong>{toNumber(summaryValue).toLocaleString('fr-FR').replace(/\u202F/g, ' ').replace(',', '.')}</strong>
                        </span>
                    )}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <Combobox
                        className="w-[140px]"
                        options={fincaOptions}
                        placeholder="Finca"
                        onSelect={(opt) => {
                            setFinca(opt.value)
                            // Reset bloque and variedad when finca changes
                            if (opt.value !== finca) {
                                setBloque('')
                                setVariedad('')
                            }
                        }}
                    />
                    <Combobox
                        className="w-[140px]"
                        options={bloqueOptions}
                        placeholder="Bloque"
                        onSelect={(opt) => {
                            setBloque(opt.value)
                            // Reset variedad when bloque changes
                            if (opt.value !== bloque) setVariedad('')
                        }}
                    />
                    <Combobox
                        className="w-[140px]"
                        options={variedadOptions}
                        placeholder="Variedad"
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        <Download className="h-4 w-4" />
                        Excel
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col p-0">
                {isLoading ? (
                    <div className="flex h-[400px] items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Spinner className="h-8 w-8" />
                            <p className="text-sm text-muted-foreground">Cargando datos...</p>
                        </div>
                    </div>
                ) : error ? (
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
                                    if (mode === 'week') return String(value)
                                    // Parse YYYY-MM-DD without timezone conversion
                                    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
                                    if (!match) return String(value)
                                    const [, year, month, day] = match
                                    const d = new Date(Number(year), Number(month) - 1, Number(day))
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
                                            // Parse YYYY-MM-DD without timezone conversion
                                            const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
                                            if (!match) return String(value)
                                            const [, year, month, day] = match
                                            const d = new Date(Number(year), Number(month) - 1, Number(day))
                                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        }}
                                    />
                                }
                            />
                            <Bar dataKey="total">
                                {(mode === 'day' ? dailyData : weeklyData).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#22c55e' : '#2563eb'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
