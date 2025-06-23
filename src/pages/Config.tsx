import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/bottom-nav";
import DataTable from "@/components/data-table";
import { useDataService } from "@/hooks/useDataService";

const TABLES = [
    { key: 'acciones', label: 'Acciones' },
    { key: 'fincas', label: 'Fincas' },
    { key: 'bloques', label: 'Bloques' },
    { key: 'variedades', label: 'Variedades' },
    { key: 'bloque_variedad', label: 'Bloque Variedad' },
];

export default function Config() {
    const { getAllFromTable } = useDataService();
    const [tableData, setTableData] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAllTables = async () => {
            setLoading(true);
            const data: Record<string, any[]> = {};

            for (const table of TABLES) {
                data[table.key] = await getAllFromTable(table.key);
            }

            setTableData(data);
            setLoading(false);
        };

        loadAllTables();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col h-full justify-between">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p>Loading database tables...</p>
                    </div>
                </div>
                <BottomNav currentPage="config" />
            </div>
        );
    }

    return (
        < div className="flex flex-col h-full justify-between">
            < div className="flex-1 overflow-hidden" >
                <Tabs defaultValue="acciones" className="h-full flex flex-col">
                    <div className="overflow-x-auto ">
                        <TabsList className="inline-flex w-max min-w-full bg-zinc-200 rounded-none">
                            {TABLES.map((table) => (
                                <TabsTrigger key={table.key} value={table.key} className="text-sm whitespace-nowrap px-4">
                                    {table.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    <div className="flex-1 overflow-hidden px-4 pt-2">
                        {TABLES.map((table) => (
                            <TabsContent key={table.key} value={table.key} className="h-full overflow-y-auto bg-white rounded-lg p-2">
                                <DataTable
                                    data={tableData[table.key] || []}
                                />
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </ div>
            <BottomNav currentPage="config" />
        </div >
    );
}
