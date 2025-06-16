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
    backPath?: string; onItemClick?: (item: any) => void;
    getItemTitle: (item: any) => string;
    getItemKey: (item: any) => string | number;
    getItemValue?: (item: any) => number; // Optional function to get a value to display on the right
    getItemClassName?: (item: any) => string; // Optional function to get custom CSS classes for the item
    onRefetch?: (refetchFn: () => Promise<void>) => void; // Callback to provide refetch function to parent
    showHeader?: boolean;
    showGridToggle?: boolean;
    defaultCols?: 1 | 2 | 3 | 4;
    storageKey?: string;
    secondaryAction?: {
        label: string;
        disabled?: boolean;
    };
}

export default function DataGridPage({
    fetchData,
    title,
    emptyMessage = "No hay datos disponibles",
    showBackButton = false,
    backPath = "/fincas",
    onItemClick, getItemTitle,
    getItemKey,
    getItemValue,
    getItemClassName,
    onRefetch,
    showHeader = true,
    showGridToggle = true,
    defaultCols = 2,
    storageKey = 'gridLayout',
    secondaryAction
}: DataGridPageProps) {
    const navigate = useNavigate();
    const { data, loading, error, refetch } = useDataGrid({ fetchData });    // Provide refetch function to parent component
    useEffect(() => {
        if (onRefetch) {
            onRefetch(refetch);
        }
    }, [onRefetch, refetch]); const [cols, setCols] = useState<1 | 2 | 3 | 4>(() => {
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
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {title && (
                            <Button
                                variant='outline'
                                className='uppercase h-16 flex-grow flex items-center justify-between px-4'
                                onClick={showBackButton ? () => navigate(backPath) : undefined}
                            >
                                <div className="flex items-center">
                                    {showBackButton && <ChevronLeft className="w-6 h-6 mr-3" />}
                                </div>
                                <h1 className="text-2xl font-bold flex-1 text-center truncate px-2">{title}</h1>
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
                    </div>                    {secondaryAction && (
                        <Button
                            className="w-full uppercase text-lg h-16 text-2xl font-bold"
                            variant='secondary'
                            disabled={secondaryAction.disabled}
                        >
                            {secondaryAction.label}
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
                    {data.map((item) => (<Button
                        key={getItemKey(item)}
                        className={`w-full uppercase text-lg ${cols === 1 ? 'h-16' : 'aspect-square h-full'} flex items-center ${getItemValue ? 'justify-between' : 'justify-center'} px-4 ${getItemClassName ? getItemClassName(item) : ''}`}
                        onClick={() => onItemClick?.(item)}
                        variant="outline"
                    >
                        <span className={`${getItemValue ? 'flex-1 text-left' : 'text-center'}`}>{getItemTitle(item)}</span>
                        {getItemValue && (
                            <span className="text-2xl font-bold text-black">
                                {getItemValue(item)}
                            </span>
                        )}
                    </Button>
                    ))}
                </div>
            </DataStateHandler>
        </div>
    );
}
