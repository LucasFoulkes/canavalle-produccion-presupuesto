import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Grid3X3 } from 'lucide-react';
import { useDataGrid } from '@/hooks/useDataGrid';
import DataStateHandler from './DataStateHandler';
import GridCard from './GridCard';
import { Button } from '@/components/ui/button';

interface DataGridPageProps {
    fetchData: () => Promise<{ data: any[] | null; error: any }>;
    title?: string;
    emptyMessage?: string;
    showBackButton?: boolean;
    backPath?: string;
    onItemClick?: (item: any) => void;
    getItemTitle: (item: any) => string;
    getItemKey: (item: any) => string | number;
    showHeader?: boolean;
    showGridToggle?: boolean;
    defaultCols?: 1 | 2 | 3 | 4;
    storageKey?: string;
}

export default function DataGridPage({
    fetchData,
    title,
    emptyMessage = "No hay datos disponibles",
    showBackButton = false,
    backPath = "/acciones",
    onItemClick,
    getItemTitle,
    getItemKey,
    showHeader = true,
    showGridToggle = true,
    defaultCols = 2,
    storageKey = 'gridLayout'
}: DataGridPageProps) {
    const navigate = useNavigate();
    const { data, loading, error } = useDataGrid({ fetchData }); const [cols, setCols] = useState<1 | 2 | 3 | 4>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved && [1, 2, 3, 4].includes(+saved) ? +saved as 1 | 2 | 3 | 4 : defaultCols;
    });

    useEffect(() => {
        localStorage.setItem(storageKey, cols.toString());
    }, [cols, storageKey]);

    const toggleGrid = () => setCols(prev => prev === 4 ? 1 : prev + 1 as 1 | 2 | 3 | 4); const getGridClasses = () => {
        switch (cols) {
            case 1: return 'grid grid-cols-1 gap-3';
            case 2: return 'grid grid-cols-2 gap-3';
            case 3: return 'grid grid-cols-3 gap-3';
            case 4: return 'grid grid-cols-4 gap-3';
            default: return 'grid grid-cols-2 gap-3';
        }
    }; return (
        <div className="container mx-auto space-y-4">
            {showHeader && (
                <div className="flex items-center justify-between ">
                    <Button variant='outline' className='uppercase h-16 flex-grow justify-between'>
                        {showBackButton && (
                            <button
                                onClick={() => navigate(backPath)}
                                className="flex items-center justify-center w-8 h-8 rounded-full"
                            >
                                <ChevronLeft className="size-10 text-zinc-300" />
                            </button>
                        )}
                        {title && <h1 className="text-4xl font-bold flex-grow">{title}</h1>}
                    </Button>

                    {showGridToggle && (
                        <button
                            onClick={toggleGrid}
                            className="flex items-center justify-center w-8 h-8 rounded-full"
                        >
                            <Grid3X3 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}

            <DataStateHandler
                loading={loading}
                error={error}
                data={data}
                emptyMessage={emptyMessage}
            >                <div className={getGridClasses()}>
                    {data.map((item) => (
                        <GridCard
                            key={getItemKey(item)}
                            title={getItemTitle(item)}
                            onClick={() => onItemClick?.(item)}
                        />
                    ))}
                </div>
            </DataStateHandler>
        </div>
    );
}
