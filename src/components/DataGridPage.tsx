import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
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
}

export default function DataGridPage({
    fetchData,
    title,
    emptyMessage = "No hay datos disponibles",
    showBackButton = false,
    backPath = "/acciones",
    onItemClick,
    getItemTitle,
    getItemKey
}: DataGridPageProps) {
    const navigate = useNavigate();
    const { data, loading, error } = useDataGrid({ fetchData });

    const [cols, setCols] = useState<1 | 2 | 3 | 4>(() => {
        const saved = localStorage.getItem('gridLayout');
        return saved && [1, 2, 3, 4].includes(+saved) ? +saved as 1 | 2 | 3 | 4 : 2;
    });

    useEffect(() => {
        localStorage.setItem('gridLayout', cols.toString());
    }, [cols]); const toggleGrid = () => setCols(prev => prev === 4 ? 1 : prev + 1 as 1 | 2 | 3 | 4);

    return (
        <div className="container mx-auto space-y-4">
            <div className="flex items-center justify-between ">
                <Button variant='outline' className='uppercase h-16 flex-grow justify-between'>
                    {showBackButton && (
                        <button
                            onClick={() => navigate(backPath)}
                            className="flex items-center justify-center w-8 h-8 rounded-full"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    {title && <h1 className="text-4xl font-bold flex-grow">{title}</h1>}
                </Button>

                <button
                    onClick={toggleGrid}
                    className="flex items-center justify-center w-8 h-8 rounded-full"
                >
                    <Grid3X3 className="w-5 h-5" />
                </button>
            </div>

            <DataStateHandler
                loading={loading}
                error={error}
                data={data}
                emptyMessage={emptyMessage}
            >
                <div className={`grid grid-cols-${cols} gap-3`}>
                    {data.map((item) => (
                        <GridCard
                            key={getItemKey(item)}
                            title={getItemTitle(item)}
                            onClick={() => onItemClick?.(item)}
                            className={cols === 1 ? 'min-h-[60px]' : 'aspect-square'}
                        />
                    ))}
                </div>
            </DataStateHandler>
        </div>
    );
}
