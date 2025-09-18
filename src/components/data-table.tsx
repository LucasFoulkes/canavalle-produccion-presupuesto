import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from '@/components/ui/table'

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

    const onHeaderClick = (key: string) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
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
        <Table containerClassName="h-full" containerRef={scrollRef} className="w-max min-w-full">
            {caption ? <TableCaption>{caption}</TableCaption> : null}
            <TableHeader className="[&_tr]:border-b-0">
                <TableRow>
                    {columns.map((c) => (
                        <TableHead
                            key={String(c.key)}
                            onClick={() => onHeaderClick(String(c.key))}
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
    )
}
