import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DataTableProps {
    data: any[];
}

const formatCellValue = (value: any, columnName: string): string => {
    if (!value) return '-';

    // Format timestamps (created_at, updated_at, etc.)
    if (columnName.includes('_at') && typeof value === 'string' && value.includes('T')) {
        try {
            const date = new Date(value);
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return value.toString();
        }
    }

    return value.toString();
};

export default function DataTable({ data }: DataTableProps) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No data available
            </div>
        );
    }    // Extract column headers from the first object
    const columns = Object.keys(data[0]).filter(column => column !== 'id');

    return (
        <div className="h-full">
            <Table className="h-full bg-white">
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column} className="capitalize text-xs text-center">
                                {column.replace('_', ' ')}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index}>
                            {columns.map((column) => (
                                <TableCell key={column} className="text-xs">
                                    {formatCellValue(row[column], column)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
