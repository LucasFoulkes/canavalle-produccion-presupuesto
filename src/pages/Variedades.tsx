import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import DataGridPage from '@/components/DataGridPage';

export default function Variedades() {
    const { bloqueId } = useParams<{ bloqueId: string }>();
    const { fetchVariedadesByBloqueId } = useSupabase();
    const { currentFinca, currentBloque } = useAuth();

    // Get title and back path from context
    const getTitle = () => {
        if (currentBloque) {
            return `${currentBloque.nombre} - Variedades`;
        }
        return 'Variedades';
    };

    const getBackPath = () => {
        if (currentFinca) {
            return `/bloques/${currentFinca.id}`;
        }
        return '/acciones';
    }; const fetchVariedades = useCallback(() => {
        if (!bloqueId) {
            return Promise.resolve({ data: [], error: null });
        }
        return fetchVariedadesByBloqueId(bloqueId);
    }, [bloqueId, fetchVariedadesByBloqueId]); const handleVariedadClick = (_variedad: any) => {
        // Handle variedad selection logic here
    };

    return (<DataGridPage
        fetchData={fetchVariedades}
        title={getTitle()}
        showBackButton={true}
        backPath={getBackPath()}
        emptyMessage="No hay variedades disponibles para este bloque"
        onItemClick={handleVariedadClick}
        getItemTitle={(variedad) => variedad.nombre}
        getItemKey={(variedad) => variedad.id}
        showHeader={true}
        showGridToggle={false}
        defaultCols={1}
        storageKey="variedadesGridLayout"
    />
    );
}
