import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, CartesianGrid, XAxis, Tooltip } from 'recharts'
import { ChevronsUpDown, Check } from 'lucide-react'
import { formatDateISO, formatMax2, formatDate } from '@/lib/utils'
import { getISOWeek } from '@/lib/date-helpers'

export type MiniRow = { fecha: any; variedad: string; dias_cosecha: number }

export function MiniCosechaChart({ rows, byWeek, onToggle }: { rows: MiniRow[]; byWeek: boolean; onToggle: () => void }) {
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

        const normalize = (dateInput: any) => (byWeek ? weekKeyOfLocal(dateInput) : formatDateISO(dateInput))
        const acc = new Map<string, number>()
        const keys: string[] = []
        for (const r of filteredRows) {
            const key = normalize(r.fecha)
            if (!key) continue
            acc.set(key, (acc.get(key) ?? 0) + Number(r.dias_cosecha || 0))
            keys.push(key)
        }
        if (keys.length === 0) return []
        const toDate = (iso: string) => new Date(iso + 'T00:00:00Z')
        const addDays = (d: Date, days: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + days); return x }
        const toISO = (d: Date) => d.toISOString().slice(0, 10)
        const sorted = Array.from(new Set(keys)).sort((a, b) => a.localeCompare(b))
        const start = toDate(sorted[0])
        const end = toDate(sorted[sorted.length - 1])
        const step = byWeek ? 7 : 1
        const domain: string[] = []
        let cur = start
        while (cur.getTime() <= end.getTime()) {
            domain.push(toISO(cur))
            cur = addDays(cur, step)
        }
        return domain.map((date) => ({ date, value: acc.get(date) ?? 0 }))
    }, [filteredRows, byWeek])

    return (
        <div className="w-full">
            <div className="mb-2 flex items-center gap-2 min-w-0">
                <Button size="sm" variant="outline" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggle() }}>
                    {byWeek ? 'Ver por día' : 'Por semana'}
                </Button>
                <div className="ml-auto flex-1 min-w-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <Popover open={openCombo} onOpenChange={setOpenCombo}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openCombo} className="h-8 w-full min-w-0 justify-between">
                                <span className="truncate text-left">{variedad === 'todas' ? 'Todas las variedades' : variedad}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] max-w-[80vw] p-0" align="end" sideOffset={4} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
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
