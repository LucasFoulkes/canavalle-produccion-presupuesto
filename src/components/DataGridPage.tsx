import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Grid3X3 } from 'lucide-react';
import { useDataGrid } from '@/hooks/useDataGrid';
import DataStateHandler from './DataStateHandler';
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
    backPath = "/fincas",
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
                <div className="flex items-center gap-2">                    {title && (
                    <Button
                        variant='outline'
                        className='uppercase h-16 flex-grow flex items-center justify-between px-4'
                        onClick={showBackButton ? () => navigate(backPath) : undefined}
                    >
                        <div className="flex items-center">
                            {showBackButton && <ChevronLeft className="w-6 h-6 mr-3" />}
                        </div>
                        <h1 className="text-4xl font-bold flex-1 text-center">{title}</h1>
                        <div className="w-9"></div> {/* Spacer to balance the layout */}
                    </Button>
                )}

                    {showGridToggle && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleGrid}
                            className="flex-shrink-0"
                        >
                            <Grid3X3 className="w-5 h-5" />
                        </Button>
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
                        <Button
                            key={getItemKey(item)}
                            className={`w-full uppercase text-lg ${cols === 1 ? 'h-16' : 'aspect-square h-full'}`}
                            onClick={() => onItemClick?.(item)}
                            variant="outline"
                        >
                            {getItemTitle(item)}
                        </Button>
                    ))}
                </div>
            </DataStateHandler>
        </div>
    );
}
