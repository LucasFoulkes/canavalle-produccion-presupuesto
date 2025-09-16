import * as React from 'react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export function DataTableSkeleton({ columns, rows = 6 }: { columns: { key: string; header?: string }[]; rows?: number }) {
    const safeCols = columns.length ? columns : [{ key: 'loading', header: 'Loading' }]
    return (
        <Table containerClassName="h-full overflow-auto" className="w-max min-w-full">
            <TableHeader className="[&_tr]:border-b-0">
                <TableRow>
                    {safeCols.map((c) => (
                        <TableHead key={c.key} className="sticky top-0 z-10 bg-background whitespace-nowrap shadow-[inset_0_-1px_0_theme(colors.border)]">
                            {c.header ?? c.key}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: rows }).map((_, rIdx) => (
                    <TableRow key={rIdx} className="opacity-80">
                        {safeCols.map((c, cIdx) => (
                            <TableCell key={c.key} className="whitespace-nowrap">
                                <Skeleton className="h-4 w-[80px]" style={{ width: cIdx === 0 ? 120 : 80 }} />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
