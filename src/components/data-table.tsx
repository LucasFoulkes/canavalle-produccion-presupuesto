import * as React from 'react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from '@/components/ui/table'

export type Column<T> = { key: keyof T; header?: string; render?: (value: T[keyof T] | undefined, row: T) => React.ReactNode }

export function DataTable<T extends Record<string, unknown>>({
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
    const [sortKey, setSortKey] = React.useState<keyof T | null>(null)
    const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')

    const sortedRows = React.useMemo<T[]>(() => {
        const list = rows ?? []
        if (!sortKey) return list
        const compare = (a: T, b: T) => {
            const va = a?.[sortKey]
            const vb = b?.[sortKey]
            // Push null/undefined to the end
            const aNil = va === null || va === undefined
            const bNil = vb === null || vb === undefined
            if (aNil && bNil) return 0
            if (aNil) return 1
            if (bNil) return -1
            if (typeof va === 'number' && typeof vb === 'number') {
                return va - vb
            }
            // String compare with numeric option for mixed digit strings
            return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
        }
        const sorted = [...list].sort(compare)
        return sortDir === 'asc' ? sorted : [...sorted].reverse()
    }, [rows, sortKey, sortDir])

    const onHeaderClick = (key: keyof T) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    return (
        <Table containerClassName="h-full overflow-auto" className="w-max min-w-full">
            {caption ? <TableCaption>{caption}</TableCaption> : null}
            <TableHeader className="[&_tr]:border-b-0">
                <TableRow>
                    {columns.map((c) => (
                        <TableHead
                            key={String(c.key)}
                            onClick={() => onHeaderClick(c.key)}
                            role="button"
                            className="sticky top-0 z-10 bg-background whitespace-nowrap shadow-[inset_0_-1px_0_theme(colors.border)] cursor-pointer select-none"
                        >
                            <span className="inline-flex items-center gap-1">
                                {c.header ?? String(c.key)}
                                {sortKey === String(c.key) ? (
                                    <span aria-hidden className="text-muted-foreground">
                                        {sortDir === 'asc' ? '▲' : '▼'}
                                    </span>
                                ) : null}
                            </span>
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                    {sortedRows?.length ? (
                        sortedRows.map((row, i) => (
                            <TableRow
                                key={getRowKey ? getRowKey(row, i) : i}
                            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                            className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                        >
                            {columns.map((c) => {
                                const value = row[c.key]
                                return (
                                    <TableCell key={String(c.key)} className="whitespace-nowrap">
                                        {c.render ? c.render(value, row) : String(value ?? '')}
                                    </TableCell>
                                )
                            })}
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground">
                            No data
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}
