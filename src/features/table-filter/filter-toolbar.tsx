import * as React from 'react'
import type { TableFilterState } from '@/hooks/use-table-filter'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { ChevronRight as CaretDownIcon, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DatePicker, DateRangePicker, toISODate } from '@/components/date-picker'

export type FilterToolbarProps = Pick<
    TableFilterState,
    'query' | 'setQuery' | 'column' | 'setColumn' | 'columns' | 'addFilter' | 'filters' | 'removeFilter' | 'clearFilters'
>

type OperatorDef = { value: string; label: string; types: Array<'string' | 'number' | 'date'> }

const OPERATORS: OperatorDef[] = [
    { value: 'contains', label: 'contiene', types: ['string'] },
    { value: 'eq', label: '=', types: ['string', 'number', 'date'] },
    { value: 'starts', label: 'empieza', types: ['string'] },
    { value: 'ends', label: 'termina', types: ['string'] },
    { value: 'gt', label: '>', types: ['number'] },
    { value: 'lt', label: '<', types: ['number'] },
    { value: 'gte', label: '≥', types: ['number'] },
    { value: 'lte', label: '≤', types: ['number'] },
    { value: 'between', label: 'entre', types: ['number', 'date'] },
]

export function FilterToolbar({
    query,
    setQuery,
    column,
    setColumn,
    columns,
    addFilter,
    filters,
    removeFilter,
    clearFilters,
}: FilterToolbarProps) {
    const activeColumn = column === '*' ? null : columns.find((c) => c.key === column) || null
    const activeLabel = activeColumn ? activeColumn.label : 'Todas las columnas'
    const [op, setOp] = React.useState<string>('contains')
    const [value2, setValue2] = React.useState('')
    const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({})
    const [singleDate, setSingleDate] = React.useState<Date | undefined>(undefined)

    React.useEffect(() => {
        if (!activeColumn) {
            setOp('contains')
            return
        }
        const t = activeColumn.type || 'string'
        if (t === 'number' && !['gt', 'lt', 'gte', 'lte', 'eq', 'between'].includes(op)) setOp('eq')
        if (t === 'date' && !['eq', 'between'].includes(op)) setOp('eq')
        if (t === 'string' && !['contains', 'eq', 'starts', 'ends'].includes(op)) setOp('contains')
    }, [activeColumn, op])

    const availableOps = React.useMemo(() => {
        const t = activeColumn?.type || 'string'
        return OPERATORS.filter((o) => o.types.includes(t as OperatorDef['types'][number]))
    }, [activeColumn])

    const showSecond = op === 'between' && activeColumn && activeColumn.type === 'number'
    const isDateMode = !!activeColumn && activeColumn.type === 'date'

    const commitFilter = () => {
        if (!activeColumn) return
        if (isDateMode) {
            if (op === 'between') {
                if (!(dateRange.from && dateRange.to)) return
                const a = toISODate(dateRange.from)
                const b = toISODate(dateRange.to)
                addFilter({ column: activeColumn.key, value: a, value2: b, op: 'between', type: 'date' })
                setDateRange({})
            } else {
                if (!singleDate) return
                const a = toISODate(singleDate)
                addFilter({ column: activeColumn.key, value: a, op: 'eq', type: 'date' })
                setSingleDate(undefined)
            }
            return
        }
        const base = query.trim()
        if (!base) return
        if (op === 'between' && showSecond) {
            const b = value2.trim()
            if (!b) return
            addFilter({ column: activeColumn.key, value: base, value2: b, op, type: activeColumn.type || 'number' })
            setQuery('')
            setValue2('')
            return
        }
        addFilter({ column: activeColumn.key, value: base, op, type: activeColumn.type || 'string' })
        setQuery('')
    }

    return (
        <div className="flex items-center gap-2 ml-auto min-w-0">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                        {activeLabel}
                        <CaretDownIcon className="size-4 opacity-70" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs uppercase tracking-wide">Columna</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={column} onValueChange={(value) => setColumn(value)}>
                        <DropdownMenuRadioItem value="*">Todas (búsqueda global)</DropdownMenuRadioItem>
                        {columns.map((c) => (
                            <DropdownMenuRadioItem key={c.key} value={c.key}>
                                {c.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            {activeColumn && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                            {availableOps.find((o) => o.value === op)?.label || op}
                            <CaretDownIcon className="size-4 opacity-70" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel className="text-xs uppercase tracking-wide">Operador</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={op} onValueChange={(value) => setOp(value)}>
                            {availableOps.map((o) => (
                                <DropdownMenuRadioItem key={o.value} value={o.value}>
                                    {o.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {!isDateMode && (
                <div className="relative">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                commitFilter()
                            }
                        }}
                        placeholder={column === '*' ? 'Buscar (global)' : `Valor (${activeColumn?.label})`}
                        className="h-8 w-40 pr-6"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                            aria-label="Clear"
                            type="button"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>
            )}
            {showSecond && !isDateMode && (
                <Input
                    value={value2}
                    onChange={(e) => setValue2(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            commitFilter()
                        }
                    }}
                    placeholder="y"
                    className="h-8 w-28"
                />
            )}
            {isDateMode && op !== 'between' && (
                <DatePicker
                    value={singleDate}
                    onChange={(d) => setSingleDate(d || undefined)}
                    autoCloseOnSelect={false}
                    onCommit={commitFilter}
                    className="h-8"
                />
            )}
            {isDateMode && op === 'between' && (
                <DateRangePicker
                    value={dateRange}
                    onChange={(r) => setDateRange(r)}
                    autoCloseOnSelect={false}
                    onCommit={commitFilter}
                    className="h-8"
                />
            )}
            {!isDateMode && (
                <button
                    type="button"
                    onClick={commitFilter}
                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    disabled={
                        !activeColumn ||
                        (op === 'between' && showSecond ? !(query.trim() && value2.trim()) : !query.trim())
                    }
                >
                    <Plus className="size-4" />
                    Añadir
                </button>
            )}
            {isDateMode && (
                <button
                    type="button"
                    onClick={commitFilter}
                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    disabled={!activeColumn || (op === 'between' ? !(dateRange.from && dateRange.to) : !singleDate)}
                >
                    <Plus className="size-4" />
                    Añadir
                </button>
            )}
            {filters.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap max-w-[360px]">
                    {filters.map((f) => {
                        const colLabel = columns.find((c) => c.key === f.column)?.label || f.column
                        const opDef = OPERATORS.find((o) => o.value === f.op)?.label || f.op
                        const displayVal =
                            f.type === 'date'
                                ? f.op === 'between'
                                    ? `${disp(f.value)}–${disp(f.value2)}`
                                    : disp(f.value)
                                : f.op === 'between'
                                    ? `${f.value}–${f.value2}`
                                    : f.value
                        return (
                            <Badge
                                key={f.id}
                                className="group cursor-pointer"
                                onClick={() => removeFilter(f.id)}
                                title={`${colLabel} ${opDef} ${displayVal}`}
                            >
                                <span className="max-w-[140px] truncate">{colLabel} {opDef} {displayVal}</span>
                                <X className="size-3 opacity-60 group-hover:opacity-100" />
                            </Badge>
                        )
                    })}
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                        limpiar
                    </button>
                </div>
            )}
        </div>
    )
}

function fmt(d: Date) {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const da = String(d.getUTCDate()).padStart(2, '0')
    return `${da}/${m}/${y}`
}

function disp(iso?: string) {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return fmt(d)
}

