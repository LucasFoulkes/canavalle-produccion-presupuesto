import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import CreateEntryDialog from "./create-entry-dialog";

interface DataTableProps {
    data: any[];
    lookupData?: Record<string, any>;
    tableName?: string;
    onRefresh?: () => void;
}

const formatCellValue = (value: any, columnName: string, lookupData: Record<string, any> = {}): string => {
    if (!value) return '-';

    // Handle foreign key lookups (columns ending with _id)
    if (columnName.endsWith('_id') && lookupData[columnName]) {
        const lookupValue = lookupData[columnName][value];
        return lookupValue || value.toString();
    }

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

export default function DataTable({ data, lookupData = {}, tableName, onRefresh }: DataTableProps) {
    const [searchTerm, setSearchTerm] = useState('');

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No data available
            </div>
        );
    }

    // Extract column headers from the first object
    const columns = Object.keys(data[0])
        .filter(column => column !== 'id')
        .filter(column => typeof data[0][column] !== 'object' || data[0][column] === null);

    // Filter data based on search term
    const filteredData = data.filter(row =>
        columns.some(column => {
            const cellValue = formatCellValue(row[column], column, lookupData);
            return cellValue.toLowerCase().includes(searchTerm.toLowerCase());
        })
    ); return (
        <div className="h-full flex flex-col gap-4">
            <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
            />

            <div className="flex-1 overflow-y-auto bg-white rounded-lg">
                <Table>
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
                        {filteredData.map((row, index) => (
                            <TableRow key={index}>
                                {columns.map((column) => (
                                    <TableCell key={column} className="text-xs">
                                        {formatCellValue(row[column], column, lookupData)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {tableName && onRefresh && (
                <CreateEntryDialog
                    tableName={tableName}
                    columns={columns}
                    lookupData={lookupData}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    );
}
