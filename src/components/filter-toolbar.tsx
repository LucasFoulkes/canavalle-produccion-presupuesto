import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { DatePicker, DateRangePicker, toISODate } from '@/components/date-picker'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTableFilter } from '@/hooks/use-table-filter'
import { cn } from '@/lib/utils'

type OperatorType = 'string' | 'number' | 'date'

type OperatorDef = { value: string; label: string; types: OperatorType[] }

const OPERATORS: OperatorDef[] = [
    { value: 'contains', label: 'contiene', types: ['string'] },
    { value: 'eq', label: '=', types: ['string', 'number', 'date'] },
    { value: 'starts', label: 'empieza', types: ['string'] },
    { value: 'ends', label: 'termina', types: ['string'] },
    { value: 'gt', label: '>', types: ['number'] },
    { value: 'lt', label: '<', types: ['number'] },
    { value: 'gte', label: 'Ã¢â€°Â¥', types: ['number'] },
    { value: 'lte', label: 'Ã¢â€°Â¤', types: ['number'] },
    { value: 'between', label: 'entre', types: ['number', 'date'] },
]

type FilterToolbarProps = { className?: string }

export function FilterToolbar({ className }: FilterToolbarProps) {
    const { query, setQuery, column, setColumn, columns, addFilter, filters, removeFilter, clearFilters } = useTableFilter()
    const activeColumn = column === '*' ? null : columns.find((c) => c.key === column) ?? null
    const columnType: OperatorType = activeColumn?.type ?? 'string'
    const activeLabel = activeColumn?.label ?? 'Todas las columnas'
    const [op, setOp] = React.useState<string>('contains')
    const [value2, setValue2] = React.useState('')
    const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({})
    const [singleDate, setSingleDate] = React.useState<Date | undefined>(undefined)
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    React.useEffect(() => {
        if (!activeColumn) {
            setOp('contains')
            return
        }
        if (columnType === 'number' && !['gt', 'lt', 'gte', 'lte', 'eq', 'between'].includes(op)) {
            setOp('eq')
        } else if (columnType === 'date' && !['eq', 'between'].includes(op)) {
            setOp('eq')
        } else if (columnType === 'string' && !['contains', 'eq', 'starts', 'ends'].includes(op)) {
            setOp('contains')
        }
    }, [activeColumn, columnType, op])

    const availableOps = React.useMemo(() => OPERATORS.filter((o) => o.types.includes(columnType)), [columnType])

    const showSecondValue = op === 'between' && columnType === 'number'
    const isDateMode = columnType === 'date'

    const resetInputs = React.useCallback(() => {
        setValue2('')
        setDateRange({})
        setSingleDate(undefined)
        setQuery('')
        setColumn('*')
        setOp('contains')
        inputRef.current?.focus()
    }, [setColumn, setQuery])

    const commitFilter = React.useCallback(() => {
        if (!activeColumn) return

        if (isDateMode) {
            if (op === 'between') {
                if (!(dateRange.from && dateRange.to)) return
                addFilter({ column: activeColumn.key, value: toISODate(dateRange.from), value2: toISODate(dateRange.to), op: 'between', type: 'date' })
            } else {
                if (!singleDate) return
                addFilter({ column: activeColumn.key, value: toISODate(singleDate), op: 'eq', type: 'date' })
            }
            resetInputs()
            return
        }

        const first = query.trim()
        if (!first) return

        if (op === 'between' && showSecondValue) {
            const second = value2.trim()
            if (!second) return
            addFilter({ column: activeColumn.key, value: first, value2: second, op: 'between', type: activeColumn.type ?? 'number' })
            resetInputs()
            return
        }

        addFilter({ column: activeColumn.key, value: first, op, type: activeColumn.type ?? 'string' })
        resetInputs()
    }, [activeColumn, addFilter, dateRange, isDateMode, op, query, resetInputs, showSecondValue, singleDate, value2])

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            commitFilter()
        }
    }

    const addDisabled = React.useMemo(() => {
        if (!activeColumn) return true
        if (isDateMode) {
            return op === 'between' ? !(dateRange.from && dateRange.to) : !singleDate
        }
        if (op === 'between' && showSecondValue) {
            return !(query.trim() && value2.trim())
        }
        return !query.trim()
    }, [activeColumn, dateRange, isDateMode, op, query, showSecondValue, singleDate, value2])

    const renderValue = (value: string) => {
        if (!value) return ''
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) return value
        return parsed.toLocaleDateString()
    }

    return (
        <div className={cn('flex items-center gap-2 ml-auto min-w-0', className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                        {activeLabel}
                        <CaretDownIcon className="opacity-70" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs uppercase tracking-wide">Columna</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={column} onValueChange={(value) => setColumn(value)}>
                        <DropdownMenuRadioItem value="*">Todas (bÃƒÂºsqueda global)</DropdownMenuRadioItem>
                        {columns.map((col) => (
                            <DropdownMenuRadioItem key={col.key} value={col.key}>
                                {col.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {activeColumn && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                            {availableOps.find((o) => o.value === op)?.label ?? op}
                            <CaretDownIcon className="opacity-70" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel className="text-xs uppercase tracking-wide">Operador</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={op} onValueChange={(value) => setOp(value)}>
                            {availableOps.map((option) => (
                                <DropdownMenuRadioItem key={option.value} value={option.value}>
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {!isDateMode && (
                <div className="relative">
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={column === '*' ? 'Buscar (global)' : `Valor (${activeColumn?.label ?? ''})`}
                        className="h-8 w-44 pr-6"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                            aria-label="Limpiar campo"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>
            )}

            {showSecondValue && !isDateMode && (
                <Input
                    value={value2}
                    onChange={(event) => setValue2(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="y"
                    className="h-8 w-28"
                />
            )}

            {isDateMode && op !== 'between' && (
                <DatePicker
                    value={singleDate}
                    onChange={(date) => setSingleDate(date || undefined)}
                    autoCloseOnSelect={false}
                    onCommit={commitFilter}
                    className="h-8"
                />
            )}

            {isDateMode && op === 'between' && (
                <DateRangePicker
                    value={dateRange}
                    onChange={(range) => setDateRange(range)}
                    autoCloseOnSelect={false}
                    onCommit={commitFilter}
                    className="h-8"
                />
            )}

            <button
                type="button"
                onClick={commitFilter}
                className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                disabled={addDisabled}
            >
                <Plus className="size-4" />
            </button>

            {filters.length > 0 && (
                <div className="flex items-center gap-1 whitespace-nowrap overflow-x-auto scrollbar-thin pr-2">
                    {filters.map((filter) => {
                        const colLabel = columns.find((c) => c.key === filter.column)?.label ?? filter.column
                        const opLabel = OPERATORS.find((o) => o.value === filter.op)?.label ?? filter.op
                        const valueLabel = filter.type === 'date'
                            ? (filter.op === 'between'
                                ? `${renderValue(filter.value)} Ã¢â‚¬â€œ ${renderValue(filter.value2 ?? '')}`
                                : renderValue(filter.value))
                            : (filter.op === 'between'
                                ? `${filter.value} Ã¢â‚¬â€œ ${filter.value2 ?? ''}`
                                : filter.value)
                        return (
                            <Badge
                                key={filter.id}
                                className="group cursor-pointer"
                                title={`${colLabel} ${opLabel} ${valueLabel}`}
                                onClick={() => removeFilter(filter.id)}
                            >
                                <span className="max-w-[140px] truncate">{colLabel} {opLabel} {valueLabel}</span>
                                <X className="size-3 opacity-60 group-hover:opacity-100" />
                            </Badge>
                        )
                    })}
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center h-6 w-6 shrink-0 rounded-md border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Limpiar filtros"
                        aria-label="Limpiar filtros"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4"
                        >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}

const CaretDownIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('size-4', className)}
        {...props}
    >
        <path d="M3.5 6l4.5 4 4.5-4" />
    </svg>
)
