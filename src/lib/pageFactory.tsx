import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DataGridPage from '@/components/DataGridPage';

// Generic page configuration
interface PageConfig<T = any> {
    // Data fetching
    fetchData: () => Promise<{ data: T[] | null; error: any }>;

    // Navigation
    getTitle?: () => string;
    getBackPath?: () => string;
    getNextPath: (item: T) => string;

    // Item display
    getItemTitle: (item: T) => string;
    getItemKey: (item: T) => string;
    getItemValue?: (item: T) => number;
    getItemClassName?: (item: T) => string;

    // Layout
    showHeader?: boolean;
    showBackButton?: boolean;
    showGridToggle?: boolean;
    defaultCols?: 1 | 2 | 3 | 4;
    emptyMessage?: string;
    storageKey?: string;

    // Actions
    onItemClick?: (item: T) => void;
    secondaryAction?: {
        label: string;
        disabled?: boolean;
    };

    // Context updates
    updateContext?: (item: T) => void;
}

/**
 * Generic page factory - creates consistent page components with minimal boilerplate
 * Follows the GOLD principle: achieve maximum functionality with minimal code
 */
export function createPage<T = any>(config: PageConfig<T>) {
    return function Page() {
        const navigate = useNavigate();

        // Memoized derived values
        const title = useMemo(() => config.getTitle?.() || '', []);
        const backPath = useMemo(() => config.getBackPath?.() || '/fincas', []);

        const handleItemClick = useCallback((item: T) => {
            // Update context if needed
            config.updateContext?.(item);

            // Custom click handler or default navigation
            if (config.onItemClick) {
                config.onItemClick(item);
            } else {
                navigate(config.getNextPath(item));
            }
        }, [navigate]);

        return (
            <DataGridPage
                fetchData={config.fetchData}
                title={title}
                showBackButton={config.showBackButton ?? true}
                backPath={backPath}
                emptyMessage={config.emptyMessage || "No hay datos disponibles"}
                onItemClick={handleItemClick}
                getItemTitle={config.getItemTitle}
                getItemKey={config.getItemKey}
                getItemValue={config.getItemValue}
                getItemClassName={config.getItemClassName}
                showHeader={config.showHeader ?? true}
                showGridToggle={config.showGridToggle ?? false}
                defaultCols={config.defaultCols ?? 2}
                storageKey={config.storageKey || 'defaultGridLayout'}
                secondaryAction={config.secondaryAction}
            />
        );
    };
}

// Utility hook for common page patterns
export function usePageNavigation() {
    const { currentFinca, currentBloque } = useAuth();

    const truncateLocation = useCallback((name: string, maxLength: number = 5) =>
        name.length > maxLength ? name.substring(0, maxLength) : name, []
    );

    const getBreadcrumbTitle = useCallback(() => {
        if (currentFinca && currentBloque) {
            const truncatedFinca = truncateLocation(currentFinca.nombre);
            const truncatedBloque = truncateLocation(currentBloque.nombre);
            return `${truncatedFinca} / ${truncatedBloque}`;
        }
        if (currentBloque) {
            return truncateLocation(currentBloque.nombre);
        }
        if (currentFinca) {
            return truncateLocation(currentFinca.nombre);
        }
        return '';
    }, [currentFinca, currentBloque, truncateLocation]);

    const getContextualBackPath = useCallback(() => {
        if (currentBloque && currentFinca) {
            return `/bloques/${currentFinca.id}`;
        }
        if (currentFinca) {
            return `/bloques/${currentFinca.id}`;
        }
        return '/fincas';
    }, [currentFinca, currentBloque]);

    return {
        getBreadcrumbTitle,
        getContextualBackPath,
        truncateLocation,
        currentFinca,
        currentBloque
    };
}
