import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DynamicTableProps<T> {
    data: T[]
    hiddenColumns?: string[]  // e.g., ['id', 'bloque_variedad_id']
}

export function DynamicTable<T extends Record<string, any>>({
    data,
    hiddenColumns = ['id'],  // Default hides id
}: DynamicTableProps<T>) {
    const columns: string[] = data.length > 0
        ? Object.keys(data[0]).filter(key => !hiddenColumns.includes(key))
        : []

    return (
        <Table noWrapper className='capitalize text-xs text-center'>
            <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                    {columns.map((key) => (
                        <TableHead key={key} className={cn("text-center sticky top-0")}>
                            {key}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={columns.length || 1} className="text-center px-0">
                            No hay datos disponibles
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((item, index) => (
                        <TableRow key={item.id || index}>
                            {columns.map((key) => (
                                <TableCell key={`${item.id || index}-${key}`} className="px-0 py-3">
                                    {typeof item[key] === 'object' && item[key] !== null ? JSON.stringify(item[key]) : (item[key] ?? '-')}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    )
}