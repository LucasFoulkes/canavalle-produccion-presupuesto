import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon, ChevronDown, ArrowUpAZ, ArrowDownAZ, X } from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { cn } from '@/lib/utils'
import {
    Table,
    TableBody,

    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

type Formatter = (value: unknown, row: Record<string, unknown>, key: string) => React.ReactNode

export type DataTableProps = {
    data: Array<Record<string, unknown>>
    loading?: boolean
    error?: string | null
    caption?: React.ReactNode
    emptyText?: string
    columns?: string[]
    format?: Record<string, Formatter>
}

// Shared number formatter: up to 3 decimal places, no forced trailing zeros
const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })

function formatNum(n: number): string {
    return numberFormatter.format(n)
}

function parseNumberLike(s: string): number | null {
    const trimmed = s.trim()
    // Replace comma decimal with dot for parsing; keep digits, sign, dot
    const normalized = trimmed.replace(/,/g, '.')
    const num = Number(normalized)
    return Number.isFinite(num) ? num : null
}

function defaultRender(value: unknown): React.ReactNode {
    if (value == null) return '—'
    if (typeof value === 'number') {
        return Number.isFinite(value) ? formatNum(value) : String(value)
    }
    // Render dates nicely if ISO-like
    if (typeof value === 'string') {
        // Detect patterns like: "123 (45.6%)" and render the percentage muted and smaller
        const pctMatch = value.match(/^\s*([+-]?(?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?)\s*\(\s*([+-]?\d+(?:[.,]\d+)?)\s*%\s*\)\s*$/)
        if (pctMatch) {
            const mainRaw = pctMatch[1]
            const pctRaw = pctMatch[2]
            const mainNum = parseNumberLike(mainRaw)
            const pctNum = parseNumberLike(pctRaw)
            const main = mainNum == null ? mainRaw : formatNum(mainNum)
            const pct = pctNum == null ? pctRaw : formatNum(pctNum)
            return (
                <span>
                    {main}
                    <span className="text-muted-foreground text-xs align-baseline ms-1">({pct}%)</span>
                </span>
            )
        }
        const ms = Date.parse(value)
        if (!Number.isNaN(ms) && /\d{4}-\d{2}-\d{2}T/.test(value)) {
            try {
                return new Date(value).toLocaleString()
            } catch {
                // fall through
            }
        }
        // If the whole string is numeric-like, format it as a number
        if (/^\s*[+-]?(?:\d+(?:[.,]\d+)?)\s*$/.test(value)) {
            const num = parseNumberLike(value)
            if (num != null) return formatNum(num)
        }
    }
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

type ColumnType = 'string' | 'number' | 'date'

function isDateLike(val: unknown): boolean {
    if (val == null) return false
    if (val instanceof Date) return !isNaN(val.getTime())
    if (typeof val === 'string') {
        // ISO-like or parseable date
        if (/^\d{4}-\d{2}-\d{2}(?:[T\s].+)?$/.test(val)) return !Number.isNaN(Date.parse(val))
        const ms = Date.parse(val)
        return !Number.isNaN(ms)
    }
    return false
}

function isNumberLike(val: unknown): boolean {
    if (typeof val === 'number') return Number.isFinite(val)
    if (typeof val === 'string') {
        return /^\s*[+-]?(?:\d+(?:[.,]\d+)?)\s*$/.test(val)
    }
    return false
}

function inferColumnType(values: unknown[]): ColumnType {
    let numCount = 0
    let dateCount = 0
    let total = 0
    for (const v of values) {
        if (v == null) continue
        total++
        if (isNumberLike(v)) numCount++
        else if (isDateLike(v)) dateCount++
    }
    if (total === 0) return 'string'
    // Prefer date if majority are dates and not numbers
    if (dateCount / total >= 0.6) return 'date'
    if (numCount / total >= 0.6) return 'number'
    return 'string'
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null

type FilterState =
    | { type: 'string'; contains: string }
    | { type: 'number'; min?: number; max?: number }
    | { type: 'date'; from?: Date; to?: Date }

function compareValues(a: unknown, b: unknown, type: ColumnType): number {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    if (type === 'number') {
        const na = typeof a === 'number' ? a : parseNumberLike(String(a)) ?? Number.NEGATIVE_INFINITY
        const nb = typeof b === 'number' ? b : parseNumberLike(String(b)) ?? Number.NEGATIVE_INFINITY
        return na - nb
    }
    if (type === 'date') {
        const da = a instanceof Date ? a.getTime() : Date.parse(String(a))
        const db = b instanceof Date ? b.getTime() : Date.parse(String(b))
        return da - db
    }
    // string
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function passesFilter(val: unknown, filter: FilterState): boolean {
    if (filter.type === 'string') {
        const s = val == null ? '' : String(val)
        return s.toLowerCase().includes(filter.contains.toLowerCase())
    }
    if (filter.type === 'number') {
        const n = typeof val === 'number' ? val : (typeof val === 'string' ? parseNumberLike(val) : null)
        if (n == null) return false
        if (filter.min != null && n < filter.min) return false
        if (filter.max != null && n > filter.max) return false
        return true
    }
    // date
    let t: number | null = null
    if (val instanceof Date) t = val.getTime()
    else if (typeof val === 'string') {
        const ms = Date.parse(val)
        if (!Number.isNaN(ms)) t = ms
    }
    if (t == null) return false
    if (filter.from && t < new Date(filter.from.setHours(0, 0, 0, 0)).getTime()) return false
    if (filter.to && t > new Date(filter.to.setHours(23, 59, 59, 999)).getTime()) return false
    return true
}

export function DataTable({
    data,
    loading,
    error,
    caption,
    emptyText = 'No data',
    columns,
    format,
}: DataTableProps) {
    const cols = useMemo(() => {
        if (columns && columns.length) return columns
        const first = data?.[0]
        return first ? Object.keys(first) : []
    }, [columns, data])

    // Infer column types from data
    const colTypes = useMemo(() => {
        const sampleCount = Math.min(100, data.length)
        const samples = data.slice(0, sampleCount)
        const map: Record<string, ColumnType> = {}
        for (const key of cols) {
            const values = samples.map((r) => r[key])
            map[key] = inferColumnType(values)
        }
        return map
    }, [data, cols])

    const [sort, setSort] = useState<SortState>(null)
    const [filters, setFilters] = useState<Record<string, FilterState>>({})

    const filteredSorted = useMemo(() => {
        let rows = data
        // Apply filters
        const entries = Object.entries(filters)
        if (entries.length) {
            rows = rows.filter((row) => {
                for (const [key, f] of entries) {
                    if (!passesFilter(row[key], f)) return false
                }
                return true
            })
        }
        // Apply sort
        if (sort) {
            const { key, dir } = sort
            const type = colTypes[key] ?? 'string'
            rows = [...rows].sort((a, b) => {
                const cmp = compareValues(a[key], b[key], type)
                return dir === 'asc' ? cmp : -cmp
            })
        }
        return rows
    }, [data, filters, sort, colTypes])

    function clearFilterFor(col: string) {
        setFilters((f) => {
            const { [col]: _, ...rest } = f
            return rest
        })
    }

    function ColumnMenu({ col }: { col: string }) {
        const type = colTypes[col] ?? 'string'
        const f = filters[col]
        const [open, setOpen] = useState(false)
        const [local, setLocal] = useState<FilterState | undefined>(f)

        function applyLocal() {
            if (local) setFilters((prev) => ({ ...prev, [col]: local }))
            else clearFilterFor(col)
            setOpen(false)
        }

        function clearLocal() {
            setLocal(undefined)
            clearFilterFor(col)
        }

        function ensureLocal(): FilterState {
            if (local) return local
            if (type === 'number') return { type: 'number' }
            if (type === 'date') return { type: 'date' }
            return { type: 'string', contains: '' }
        }

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 py-0 gap-1">
                        <span className="truncate max-w-[12rem]">{col}</span>
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{col}</div>
                        {f ? (
                            <Button variant="ghost" size="icon" className="size-6" onClick={clearLocal} title="Limpiar filtro">
                                <X className="size-4" />
                            </Button>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <Button
                            variant={sort?.key === col && sort.dir === 'asc' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSort({ key: col, dir: 'asc' })}
                            title="Orden ascendente"
                        >
                            <ArrowDownAZ className="size-4 me-1" /> Asc
                        </Button>
                        <Button
                            variant={sort?.key === col && sort.dir === 'desc' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSort({ key: col, dir: 'desc' })}
                            title="Orden descendente"
                        >
                            <ArrowUpAZ className="size-4 me-1" /> Desc
                        </Button>
                        {sort?.key === col ? (
                            <Button variant="ghost" size="sm" onClick={() => setSort(null)} title="Quitar orden">Quitar</Button>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        {type === 'string' && (
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Contiene</div>
                                <Input
                                    value={(ensureLocal() as Extract<FilterState, { type: 'string' }>).contains ?? ''}
                                    onChange={(e) => setLocal({ type: 'string', contains: e.target.value })}
                                    placeholder="Texto…"
                                />
                            </div>
                        )}
                        {type === 'number' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Min</div>
                                    <Input
                                        type="number"
                                        value={(ensureLocal() as Extract<FilterState, { type: 'number' }>).min ?? ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setLocal((prev) => ({ type: 'number', min: v === '' ? undefined : Number(v), max: (prev as any)?.max }))
                                        }}
                                        placeholder="≥"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Max</div>
                                    <Input
                                        type="number"
                                        value={(ensureLocal() as Extract<FilterState, { type: 'number' }>).max ?? ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setLocal((prev) => ({ type: 'number', max: v === '' ? undefined : Number(v), min: (prev as any)?.min }))
                                        }}
                                        placeholder="≤"
                                    />
                                </div>
                            </div>
                        )}
                        {type === 'date' && (
                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Rango de fechas</div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        className={cn('w-[11.5rem] justify-start font-normal', !((ensureLocal() as any).from) && 'text-muted-foreground')}
                                    >
                                        <CalendarIcon className="me-2 size-4" />
                                        {(ensureLocal() as any).from ? formatDate((ensureLocal() as any).from, 'PPP') : 'Desde'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={cn('w-[11.5rem] justify-start font-normal', !((ensureLocal() as any).to) && 'text-muted-foreground')}
                                    >
                                        <CalendarIcon className="me-2 size-4" />
                                        {(ensureLocal() as any).to ? formatDate((ensureLocal() as any).to, 'PPP') : 'Hasta'}
                                    </Button>
                                </div>
                                <div className="border rounded-md p-2">
                                    <Calendar
                                        mode="range"
                                        selected={{ from: (ensureLocal() as any).from, to: (ensureLocal() as any).to }}
                                        onSelect={(range: any) => setLocal({ type: 'date', from: range?.from, to: range?.to })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={clearLocal}>Limpiar</Button>
                        <Button onClick={applyLocal}>Aplicar</Button>
                    </div>
                </PopoverContent>
            </Popover>
        )
    }

    return (
        <div className="relative max-w-full">
            <Table>
                {caption ? <TableCaption>{caption}</TableCaption> : null}
                <TableHeader className='capitalize'>
                    <TableRow>
                        {cols.map((col) => (
                            <TableHead key={col}>
                                <ColumnMenu col={col} />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={cols.length}>Cargando…</TableCell>
                        </TableRow>
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={cols.length} className="text-red-600">
                                {error}
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={cols.length}>{emptyText}</TableCell>
                        </TableRow>
                    ) : (
                        filteredSorted.map((row, idx) => (
                            <TableRow key={idx}>
                                {cols.map((col) => {
                                    const val = row[col]
                                    const fmt = format?.[col]
                                    return (
                                        <TableCell key={col}>
                                            {fmt ? fmt(val, row, col) : defaultRender(val)}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export default DataTable
