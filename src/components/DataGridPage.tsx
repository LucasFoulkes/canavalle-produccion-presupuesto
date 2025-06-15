import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { useDataGrid } from '@/hooks/useDataGrid';
import DataStateHandler from './DataStateHandler';
import GridCard from './GridCard';

interface DataGridPageProps {
    // Data fetching
    fetchData: () => Promise<{ data: any[] | null; error: any }>;

    // Display
    title?: string;
    emptyMessage?: string;

    // Navigation
    showBackButton?: boolean;
    backPath?: string;
    onItemClick?: (item: any) => void;

    // Item display
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

    // Initialize grid layout from localStorage or default to 2
    const [gridLayout, setGridLayout] = useState<1 | 2 | 3 | 4>(() => {
        try {
            const saved = localStorage.getItem('gridLayout');
            if (saved && [1, 2, 3, 4].includes(Number(saved))) {
                return Number(saved) as 1 | 2 | 3 | 4;
            }
        } catch (error) {
            console.warn('Failed to load grid layout from localStorage:', error);
        }
        return 2; // Default to 2 columns
    });

    // Save grid layout to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('gridLayout', gridLayout.toString());
        } catch (error) {
            console.warn('Failed to save grid layout to localStorage:', error);
        }
    }, [gridLayout]);

    const getGridClasses = () => {
        switch (gridLayout) {
            case 1:
                return 'grid grid-cols-1 gap-2';
            case 2:
                return 'grid grid-cols-2 gap-2';
            case 3:
                return 'grid grid-cols-3 gap-2';
            case 4:
                return 'grid grid-cols-4 gap-2';
            default:
                return 'grid grid-cols-2 gap-2';
        }
    };

    const getCardAspectRatio = () => {
        return gridLayout === 1 ? 'min-h-[60px]' : 'aspect-square';
    };

    const toggleGridLayout = () => {
        setGridLayout(prev => {
            switch (prev) {
                case 1: return 2;
                case 2: return 3;
                case 3: return 4;
                case 4: return 1;
                default: return 2;
            }
        });
    };

    const handleItemClick = (item: any) => {
        if (onItemClick) {
            onItemClick(item);
        }
    }; return (
        <div className="container mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-6 px-4 py-2">
                <div className="flex items-center gap-3">
                    {showBackButton && (
                        <button
                            onClick={() => navigate(backPath)}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    {title && <h1 className="text-xl font-semibold">{title}</h1>}
                </div>

                {/* Grid Layout Toggle Button */}
                <button
                    onClick={toggleGridLayout}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                    title={`Cambiar a ${gridLayout === 1 ? '2' : gridLayout === 2 ? '3' : gridLayout === 3 ? '4' : '1'} columna${gridLayout === 4 ? '' : 's'}`}
                >
                    <Grid3X3 className="w-5 h-5" />
                </button>
            </div>

            {/* Data Grid */}
            <DataStateHandler
                loading={loading}
                error={error}
                data={data}
                emptyMessage={emptyMessage}
            >
                <div className={getGridClasses()}>
                    {data.map((item) => (
                        <GridCard
                            key={getItemKey(item)}
                            title={getItemTitle(item)}
                            onClick={() => handleItemClick(item)}
                            className={getCardAspectRatio()}
                        />
                    ))}
                </div>
            </DataStateHandler>
        </div>
    );
}
