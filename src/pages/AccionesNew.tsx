import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { createPage, usePageNavigation } from '@/lib/pageFactory';
import { useCompletionStatus } from '@/hooks/useCompletionStatus';
import { ACCIONES_ITEMS, AccionItem } from '@/lib/schema';

export default function Acciones() {
    const { bloqueId } = useParams<{ bloqueId: string }>();
    const { getBreadcrumbTitle, getContextualBackPath } = usePageNavigation();
    const { getMultipleCompletionStatus } = useCompletionStatus();

    const fetchAccionesWithStatus = useCallback(async () => {
        if (!bloqueId) return { data: ACCIONES_ITEMS, error: null };

        try {
            const actionIds = ACCIONES_ITEMS.map(accion => accion.id);
            const statusMap = await getMultipleCompletionStatus(bloqueId, actionIds);

            const accionesWithStatus = ACCIONES_ITEMS.map(accion => ({
                ...accion,
                completionStatus: statusMap[accion.id]
            }));

            return { data: accionesWithStatus, error: null };
        } catch (error) {
            return { data: ACCIONES_ITEMS, error };
        }
    }, [bloqueId, getMultipleCompletionStatus]);

    const getItemClassName = useCallback((accion: AccionItem): string => {
        const statusStyles = {
            complete: 'border-green-500 border-2 bg-green-500/10 text-green-500/70',
            partial: 'border-yellow-500 border-2 bg-yellow-500/10 text-yellow-500/70',
            empty: 'border-red-500 border-2 bg-red-500/10 text-red-500/70'
        };
        return statusStyles[accion.completionStatus || 'empty'];
    }, []);

    // Use the factory pattern for the actual page creation
    const PageComponent = createPage<AccionItem>({
        fetchData: fetchAccionesWithStatus,
        getTitle: getBreadcrumbTitle,
        getBackPath: getContextualBackPath,
        getNextPath: (accion) => `/variedades/${bloqueId}/${accion.id}`,
        getItemTitle: (accion) => accion.nombre,
        getItemKey: (accion) => accion.id,
        getItemClassName,
        showHeader: true,
        showBackButton: true,
        showGridToggle: false,
        defaultCols: 1,
        emptyMessage: "No hay acciones disponibles",
        storageKey: "accionesGridLayout"
    });

    return <PageComponent />;
}
