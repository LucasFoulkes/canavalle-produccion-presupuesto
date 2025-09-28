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
                            <TableHead key={col}>
                                <span className="truncate max-w-[12rem]">{col}</span>
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
