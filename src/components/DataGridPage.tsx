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
            case 1: return 'grid grid-cols-1 gap-4';
            case 2: return 'grid grid-cols-2 gap-4';
            case 3: return 'grid grid-cols-3 gap-4';
            case 4: return 'grid grid-cols-4 gap-3';
            default: return 'grid grid-cols-2 gap-4';
        }
    }; return (
        <div className="space-y-6">
            {showHeader && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        {title && (
                            <Button
                                variant='outline'
                                className='h-14 flex-grow flex items-center justify-between px-6 glass-professional shadow-professional-lg hover-professional border-2'
                                onClick={showBackButton ? () => navigate(backPath) : undefined}
                            >
                                <div className="flex items-center">
                                    {showBackButton && <ChevronLeft className="w-5 h-5 mr-3 text-professional-primary" />}
                                </div>
                                <h1 className="text-xl font-semibold flex-1 text-center truncate px-2 text-professional-primary">{title}</h1>
                                <div className="w-8"></div> {/* Spacer to balance the layout */}
                            </Button>
                        )}

                        {showGridToggle && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={toggleGrid}
                                className="h-14 w-14 flex-shrink-0 glass-professional shadow-professional hover-professional border-2"
                            >
                                <Grid3X3 className="w-5 h-5 text-professional-primary" />
                            </Button>
                        )}
                    </div>

                    {secondaryAction && (
                        <Button
                            className="w-full h-12 text-lg font-medium bg-gradient-primary hover:opacity-90 text-white shadow-professional-lg hover-professional transition-all duration-200 border-0 rounded-lg"
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
                        key={getItemKey(item)} className={`
                            w-full text-base font-medium
                            ${cols === 1 ? 'h-14' : 'aspect-square h-full min-h-16'} 
                            flex items-center 
                            ${getItemValue ? 'justify-between' : 'justify-center'} 
                            px-4 py-3
                            glass-professional
                            shadow-professional hover:shadow-professional-lg
                            transition-all duration-150 
                            rounded-lg 
                            hover-professional
                            ${getItemClassName ? getItemClassName(item) : 'border-2 text-professional-primary'}
                        `}
                        onClick={() => onItemClick?.(item)}
                        variant="ghost"
                    >
                        <span className={`${getItemValue ? 'flex-1 text-left' : 'text-center'} leading-tight`}>{getItemTitle(item)}</span>
                        {getItemValue && (
                            <span className="text-lg font-semibold text-professional-accent ml-2">
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
