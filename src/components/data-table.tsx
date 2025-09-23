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
    columnLabels?: Record<string, string>
    format?: Record<string, Formatter>
    keyField?: string
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
    columnLabels,
    format,
    keyField,
}: DataTableProps) {
    const cols = useMemo(() => {
        if (columns && columns.length) return columns
        const first = data?.[0]
        return first ? Object.keys(first) : []
    }, [columns, data])

    const rowKeyField = useMemo(() => {
        if (keyField) return keyField
        // guessed keys by common patterns
        const prefer = ['id', 'id_finca', 'uuid', 'key']
        return prefer.find((k) => cols.includes(k)) ?? cols[0] ?? 'id'
    }, [keyField, cols])

    return (
        <Table>
            {caption ? <TableCaption>{caption}</TableCaption> : null}
            <TableHeader>
                <TableRow>
                    {cols.map((col) => (
                        <TableHead key={col}>{columnLabels?.[col] ?? col}</TableHead>
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
                    data.map((row) => {
                        const keyVal = row[rowKeyField] as React.Key
                        return (
                            <TableRow key={keyVal ?? JSON.stringify(row)}>
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
                        )
                    })
                )}
            </TableBody>
        </Table>
    )
}

export default DataTable
