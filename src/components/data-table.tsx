import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DatePicker, DateRangePicker, toISODate } from '@/components/date-picker'
import { useTableFilter } from '@/hooks/use-table-filter'
import { isDateLikeKey } from '@/lib/utils'

export type Column<T> = { key: keyof T; header?: string; render?: (value: any, row: T) => React.ReactNode }

const DEFAULT_ESTIMATED_ROW_HEIGHT = 44
const VIRTUAL_OVERSCAN = 12

export function DataTable<T extends Record<string, any>>({
    caption,
    columns,
    rows,
    onRowClick,
    getRowKey,
}: {
    caption?: string
    columns: Column<T>[]
    rows: T[] | null | undefined
    onRowClick?: (row: T, index: number) => void
    getRowKey?: (row: T, index: number) => React.Key
}) {
    // Filtering integration
    const {
        addFilter,
        columns: filterColumns,
        setColumn: setActiveColumn,
    } = useTableFilter()
    type OperatorType = 'string' | 'number' | 'date'
    const OPERATORS: { value: string; label: string; types: OperatorType[] }[] = [
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
    const [filterOpen, setFilterOpen] = React.useState(false)
    const [filterColKey, setFilterColKey] = React.useState<string>('')
    const [op, setOp] = React.useState<string>('contains')
    const [value1, setValue1] = React.useState('')
    const [value2, setValue2] = React.useState('')
    const [singleDate, setSingleDate] = React.useState<Date | undefined>(undefined)
    const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({})

    const inferType = React.useCallback((key: string): OperatorType => {
        if (isDateLikeKey(key)) return 'date'
        if (/^(id_|numero_|cantidad|total_|area_|largo_|ancho_|dias_)/i.test(key)) return 'number'
        return 'string'
    }, [])
    const filterColMeta = React.useMemo(() => (
        filterColumns.find(c => c.key === filterColKey) ?? { key: filterColKey, label: String(filterColKey), type: inferType(filterColKey) as OperatorType }
    ), [filterColumns, filterColKey, inferType])
    const columnType: OperatorType = (filterColMeta as any)?.type ?? 'string'
    const availableOps = React.useMemo(() => OPERATORS.filter(o => o.types.includes(columnType)), [OPERATORS, columnType])
    const showSecondValue = op === 'between' && columnType === 'number'
    const isDateMode = columnType === 'date'

    React.useEffect(() => {
        // Adjust default operator when type changes
        if (columnType === 'number' && !['gt', 'lt', 'gte', 'lte', 'eq', 'between'].includes(op)) setOp('eq')
        else if (columnType === 'date' && !['eq', 'between'].includes(op)) setOp('eq')
        else if (columnType === 'string' && !['contains', 'eq', 'starts', 'ends'].includes(op)) setOp('contains')
    }, [columnType, op])

    const resetFilterInputs = () => {
        setOp('contains')
        setValue1('')
        setValue2('')
        setSingleDate(undefined)
        setDateRange({})
    }

    const commitHeaderFilter = () => {
        if (!filterColKey) return
        // Set active column in toolbar for UX consistency
        setActiveColumn(filterColKey)
        if (isDateMode) {
            if (op === 'between') {
                if (!(dateRange.from && dateRange.to)) return
                addFilter({ column: filterColKey, value: toISODate(dateRange.from), value2: toISODate(dateRange.to), op: 'between', type: 'date' })
            } else {
                if (!singleDate) return
                addFilter({ column: filterColKey, value: toISODate(singleDate), op: 'eq', type: 'date' })
            }
            setFilterOpen(false)
            resetFilterInputs()
            return
        }
        const first = value1.trim()
        if (!first) return
        if (op === 'between' && showSecondValue) {
            const second = value2.trim()
            if (!second) return
            addFilter({ column: filterColKey, value: first, value2: second, op: 'between', type: columnType })
            setFilterOpen(false)
            resetFilterInputs()
            return
        }
        addFilter({ column: filterColKey, value: first, op, type: columnType })
        setFilterOpen(false)
        resetFilterInputs()
    }
    const [sortKey, setSortKey] = React.useState<string | null>(null)
    const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')

    const columnSignature = React.useMemo(() => columns.map((c) => String(c.key)).join('|'), [columns])

    React.useEffect(() => {
        setSortKey(null)
        setSortDir('asc')
    }, [columnSignature])

    const sortedRows = React.useMemo(() => {
        const list = rows ?? []
        if (!sortKey) return list
        const compare = (a: any, b: any) => {
            const va = a?.[sortKey as any]
            const vb = b?.[sortKey as any]
            const aNil = va === null || va === undefined
            const bNil = vb === null || vb === undefined
            if (aNil && bNil) return 0
            if (aNil) return 1
            if (bNil) return -1
            if (typeof va === 'number' && typeof vb === 'number') {
                return va - vb
            }
            return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
        }
        const sorted = [...list].sort(compare)
        return sortDir === 'asc' ? sorted : sorted.reverse()
    }, [rows, sortKey, sortDir])

    const onHeaderFilterClick = (key: string) => {
        setFilterColKey(key)
        setFilterOpen(true)
    }
    const onHeaderSortClick = (key: string) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        else { setSortKey(key); setSortDir('asc') }
    }

    const scrollRef = React.useRef<HTMLDivElement | null>(null)

    const getItemKey = React.useCallback(
        (index: number) => {
            const row = sortedRows[index]
            if (!row) return index
            return getRowKey ? getRowKey(row, index) : index
        },
        [sortedRows, getRowKey],
    )

    const rowVirtualizer = useVirtualizer({
        count: sortedRows.length,
        getScrollElement: () => scrollRef.current,
        getItemKey,
        estimateSize: React.useCallback(() => DEFAULT_ESTIMATED_ROW_HEIGHT, []),
        overscan: VIRTUAL_OVERSCAN,
    })

    const virtualItems = rowVirtualizer.getVirtualItems()
    const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start ?? 0 : 0
    const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0) : 0

    React.useEffect(() => {
        rowVirtualizer.measure()
    }, [columns, rowVirtualizer, sortedRows.length])

    React.useEffect(() => {
        if (sortedRows.length > 0) {
            rowVirtualizer.scrollToIndex(0, { align: 'start' })
        } else {
            rowVirtualizer.scrollToOffset(0)
        }
    }, [sortedRows.length, rowVirtualizer])

    const hasRows = sortedRows.length > 0

    return (
        <>
            <Table containerClassName="h-full" containerRef={scrollRef} className="w-max min-w-full">
                {caption ? <TableCaption>{caption}</TableCaption> : null}
                <TableHeader className="[&_tr]:border-b-0">
                    <TableRow>
                        {columns.map((c) => {
                            const keyStr = String(c.key)
                            const isSorted = sortKey === keyStr
                            return (
                                <TableHead
                                    key={keyStr}
                                    role="button"
                                    className="sticky top-0 z-10 bg-background whitespace-nowrap shadow-[inset_0_-1px_0_theme(colors.border)] select-none"
                                >
                                    <div className="inline-flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onHeaderFilterClick(keyStr)}
                                            className="inline-flex items-center gap-1 hover:underline"
                                            title="Filtrar por esta columna"
                                        >
                                            {c.header ?? keyStr}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onHeaderSortClick(keyStr)}
                                            className="text-muted-foreground hover:text-foreground"
                                            title="Ordenar"
                                        >
                                            <span aria-hidden>{isSorted ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                                        </button>
                                    </div>
                                </TableHead>
                            )
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hasRows ? (
                        <>
                            {paddingTop > 0 ? (
                                <TableRow className="pointer-events-none" style={{ height: paddingTop }}>
                                    <TableCell colSpan={columns.length} style={{ padding: 0, height: paddingTop }} />
                                </TableRow>
                            ) : null}
                            {virtualItems.map((virtualRow) => {
                                const row = sortedRows[virtualRow.index]
                                const key = getRowKey ? getRowKey(row, virtualRow.index) : virtualRow.index
                                return (
                                    <TableRow
                                        key={key}
                                        ref={rowVirtualizer.measureElement}
                                        data-index={virtualRow.index}
                                        onClick={onRowClick ? () => onRowClick(row, virtualRow.index) : undefined}
                                        className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                                    >
                                        {columns.map((c) => (
                                            <TableCell key={String(c.key)} className="whitespace-nowrap">
                                                {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '')}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )
                            })}
                            {paddingBottom > 0 ? (
                                <TableRow className="pointer-events-none" style={{ height: paddingBottom }}>
                                    <TableCell colSpan={columns.length} style={{ padding: 0, height: paddingBottom }} />
                                </TableRow>
                            ) : null}
                        </>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground">
                                No data
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Filtrar por {filterColMeta?.label ?? filterColKey}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <select
                                value={op}
                                onChange={(e) => setOp(e.target.value)}
                                className="h-8 rounded-md border bg-background px-2 text-sm"
                            >
                                {availableOps.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            {!isDateMode && (
                                <>
                                    <Input
                                        value={value1}
                                        onChange={(e) => setValue1(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') commitHeaderFilter() }}
                                        placeholder="Valor"
                                        className="h-8 w-48"
                                    />
                                    {showSecondValue && (
                                        <Input
                                            value={value2}
                                            onChange={(e) => setValue2(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') commitHeaderFilter() }}
                                            placeholder="y"
                                            className="h-8 w-32"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                        {isDateMode && op !== 'between' && (
                            <DatePicker
                                value={singleDate}
                                onChange={(d) => setSingleDate(d || undefined)}
                                autoCloseOnSelect={false}
                                onCommit={commitHeaderFilter}
                                className="h-8"
                            />
                        )}
                        {isDateMode && op === 'between' && (
                            <DateRangePicker
                                value={dateRange}
                                onChange={(r) => setDateRange(r)}
                                autoCloseOnSelect={false}
                                onCommit={commitHeaderFilter}
                                className="h-8"
                            />
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                className="inline-flex h-8 items-center rounded-md border px-3 text-sm"
                                onClick={() => { setFilterOpen(false); resetFilterInputs() }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-accent"
                                onClick={commitHeaderFilter}
                            >
                                Aplicar filtro
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
