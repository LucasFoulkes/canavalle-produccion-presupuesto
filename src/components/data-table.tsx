import React, { useMemo, useState } from 'react'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatDecimal, parseCountPercent, parseNumberLike } from '@/lib/formatters'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export type Formatter = (value: unknown, row: Record<string, unknown>, key: string) => React.ReactNode

export type DataTableProps = {
    data: Array<Record<string, unknown>>
    loading?: boolean
    error?: string | null
    caption?: React.ReactNode
    emptyText?: string
    columns?: string[]
    format?: Record<string, Formatter>
}

function defaultRender(value: unknown): React.ReactNode {
    if (value == null) return '—'
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return String(value)
        // Show integers without decimals; decimals with 2 digits
        return Number.isInteger(value) ? String(value) : formatDecimal(value)
    }
    // Render dates nicely if ISO-like
    if (typeof value === 'string') {
        const pctMatch = value.match(/^\s*([+-]?(?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?)\s*\(\s*([+-]?\d+(?:[.,]\d+)?)\s*%\s*\)\s*$/)
        if (pctMatch) {
            const { count, pct } = parseCountPercent(value)
            const formattedCount = formatDecimal(count)
            const formattedPct = formatDecimal(pct)
            return (
                <span>
                    {formattedCount}
                    <span className="text-muted-foreground text-xs align-baseline ms-1">({formattedPct}%)</span>
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
        // If the whole string is numeric-like, render without decimals when integer
        if (/^\s*[+-]?(?:\d+(?:[.,]\d+)?)\s*$/.test(value)) {
            const num = parseNumberLike(value)
            if (num != null) return Number.isInteger(num) ? String(num) : formatDecimal(num)
        }
    }
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

type SortOrder = 'asc' | 'desc' | null

export function DataTable({
    data,
    loading,
    error,
    caption,
    emptyText = 'No data',
    columns,
    format,
}: DataTableProps) {
    const [filterDialogOpen, setFilterDialogOpen] = useState(false)
    const [filterColumn, setFilterColumn] = useState<string | null>(null)
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
    const [sortColumn, setSortColumn] = useState<string | null>(null)
    const [sortOrder, setSortOrder] = useState<SortOrder>(null)

    const cols = useMemo(() => {
        if (columns && columns.length) return columns
        const first = data?.[0]
        return first ? Object.keys(first) : []
    }, [columns, data])

    const handleNameClick = (col: string, e: React.MouseEvent) => {
        e.stopPropagation()
        // Click on name opens filter dialog
        setFilterColumn(col)
        setFilterDialogOpen(true)
    }

    const handleSortClick = (col: string, e: React.MouseEvent) => {
        e.stopPropagation()
        // Click on sort icon cycles: null -> asc -> desc -> null
        if (sortColumn === col) {
            if (sortOrder === null) {
                setSortOrder('asc')
            } else if (sortOrder === 'asc') {
                setSortOrder('desc')
            } else {
                setSortOrder(null)
                setSortColumn(null)
            }
        } else {
            setSortColumn(col)
            setSortOrder('asc')
        }
    }

    const processedData = useMemo(() => {
        let result = [...data]

        // Apply column filters
        for (const [col, filterValue] of Object.entries(columnFilters)) {
            if (!filterValue.trim()) continue
            const terms = filterValue.trim().toLowerCase().split(/\s+/)
            result = result.filter((row) => {
                const cellText = String(row[col] ?? '').toLowerCase()
                return terms.every((term) => cellText.includes(term))
            })
        }

        // Apply sorting (only on the last clicked column)
        if (sortColumn && sortOrder) {
            result.sort((a, b) => {
                const aVal = a[sortColumn]
                const bVal = b[sortColumn]

                // Handle nulls
                if (aVal == null && bVal == null) return 0
                if (aVal == null) return 1
                if (bVal == null) return -1

                // Try numeric comparison
                const aNum = typeof aVal === 'number' ? aVal : parseNumberLike(String(aVal))
                const bNum = typeof bVal === 'number' ? bVal : parseNumberLike(String(bVal))

                if (aNum != null && bNum != null) {
                    return sortOrder === 'asc' ? aNum - bNum : bNum - aNum
                }

                // String comparison
                const aStr = String(aVal)
                const bStr = String(bVal)
                const cmp = aStr.localeCompare(bStr)
                return sortOrder === 'asc' ? cmp : -cmp
            })
        }

        return result
    }, [data, columnFilters, sortColumn, sortOrder])

    return (
        <>
            <div className="relative max-w-full">
                <Table>
                    {caption ? <TableCaption>{caption}</TableCaption> : null}
                    <TableHeader className='capitalize'>
                        <TableRow>
                            {cols.map((col) => {
                                const isFiltered = !!columnFilters[col]
                                const isSorted = sortColumn === col
                                const currentSortOrder = isSorted ? sortOrder : null

                                return (
                                    <TableHead key={col}>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="truncate max-w-[12rem] cursor-pointer hover:text-blue-600"
                                                onClick={(e) => handleNameClick(col, e)}
                                            >
                                                {col}
                                                {isFiltered && <span className="text-xs text-blue-500 ml-1">●</span>}
                                            </span>
                                            <button
                                                onClick={(e) => handleSortClick(col, e)}
                                                className="cursor-pointer hover:bg-muted p-1 rounded"
                                            >
                                                {currentSortOrder === 'asc' && <ArrowUp className="h-3 w-3" />}
                                                {currentSortOrder === 'desc' && <ArrowDown className="h-3 w-3" />}
                                                {currentSortOrder === null && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                                            </button>
                                        </div>
                                    </TableHead>
                                )
                            })}
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
                        ) : processedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={cols.length}>{data.length === 0 ? emptyText : 'No hay resultados con los filtros aplicados'}</TableCell>
                            </TableRow>
                        ) : (
                            processedData.map((row, idx) => {
                                const isNewObs = row._isNewObservation === true
                                const bloqueGroup = typeof row._bloqueGroup === 'number' ? row._bloqueGroup : 0
                                const isFirstInBloque = idx > 0 && processedData[idx - 1]._bloqueGroup !== bloqueGroup
                                return (
                                    <TableRow key={idx} className={isFirstInBloque ? 'border-t-2 border-t-gray-600' : ''}>
                                        {cols.map((col) => {
                                            const val = row[col]
                                            const fmt = format?.[col]
                                            return (
                                                <TableCell
                                                    key={col}
                                                    className={isNewObs ? 'bg-blue-600 text-white' : ''}
                                                >
                                                    {fmt ? fmt(val, row, col) : defaultRender(val)}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Filtrar: {filterColumn}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Ingrese términos de búsqueda..."
                            value={filterColumn ? (columnFilters[filterColumn] ?? '') : ''}
                            onChange={(e) => {
                                if (filterColumn) {
                                    setColumnFilters(prev => ({
                                        ...prev,
                                        [filterColumn]: e.target.value
                                    }))
                                }
                            }}
                            autoFocus
                        />
                        <div className="text-sm text-muted-foreground">
                            Separe múltiples términos con espacios
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default DataTable
