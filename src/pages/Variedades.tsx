import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import DataGridPage from '@/components/DataGridPage';

export default function Variedades() {
    const { bloqueId, accionId } = useParams<{ bloqueId: string; accionId: string }>();
    const { fetchVariedadesByBloqueId } = useSupabase();
    const { currentFinca, currentBloque } = useAuth();

    // Action items mapping (to get the action name from ID)
    const ACCIONES_MAP = {
        'produccion-real': 'PRODUCCION REAL',
        'pinche-apertura': 'PINCHE DE APERTURA',
        'pinche-sanitario': 'PINCHE SANITARIO',
        'pinche-tierno': 'PINCHE EN TIERNO',
        'porcentaje-ciegos': 'PORCENTAJE DE CIEGOS',
        'clima': 'CLIMA',
        'arveja': 'ARVEJA',
        'garbanzo': 'GARBANZO',
        'uva': 'UVA'
    };    // Utility function to truncate location names
    const truncateLocation = (name: string, maxLength: number = 5) => {
        return name.length > maxLength ? name.substring(0, maxLength) : name;
    };

    // Get breadcrumb title showing the hierarchy (location only)
    const getTitle = () => {
        if (currentFinca && currentBloque) {
            const truncatedFinca = truncateLocation(currentFinca.nombre);
            const truncatedBloque = truncateLocation(currentBloque.nombre);
            return `${truncatedFinca} / ${truncatedBloque}`;
        }
        if (currentBloque) {
            return truncateLocation(currentBloque.nombre);
        }
        return 'Variedades';
    };    // Get the action name for display
    const getActionName = () => {
        if (accionId) {
            return ACCIONES_MAP[accionId as keyof typeof ACCIONES_MAP] || accionId;
        }
        return null;
    }; const getBackPath = () => {
        if (bloqueId) {
            return `/acciones/${bloqueId}`;
        }
        return '/fincas';
    }; const fetchVariedades = useCallback(() => {
        if (!bloqueId) {
            return Promise.resolve({ data: [], error: null });
        }
        return fetchVariedadesByBloqueId(bloqueId);
    }, [bloqueId, fetchVariedadesByBloqueId]); const handleVariedadClick = (_variedad: any) => {
        // Handle variedad selection logic here
    }; return (
        <DataGridPage
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
            storageKey="variedadesGridLayout" secondaryAction={getActionName() ? {
                label: getActionName()!
            } : undefined}
        />
    );
}
