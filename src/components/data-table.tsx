import React, { useMemo } from 'react'
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

function defaultRender(value: unknown): React.ReactNode {
    if (value == null) return '—'
    // Render dates nicely if ISO-like
    if (typeof value === 'string') {
        const ms = Date.parse(value)
        if (!Number.isNaN(ms) && /\d{4}-\d{2}-\d{2}T/.test(value)) {
            try {
                return new Date(value).toLocaleString()
            } catch {
                // fall through
            }
        }
    }
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
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

    return (
        <div className="relative max-w-full">
            <Table>
                {caption ? <TableCaption>{caption}</TableCaption> : null}
                <TableHeader className='capitalize'>
                    <TableRow>
                        {cols.map((col) => (
                            <TableHead key={col}>{col}</TableHead>
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
                        data.map((row, idx) => (
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
