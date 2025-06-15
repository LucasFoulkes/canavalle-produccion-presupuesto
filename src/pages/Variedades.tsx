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
    };

    // Utility function to truncate location names
    const truncateLocation = (name: string, maxLength: number = 5) => {
        return name.length > maxLength ? name.substring(0, maxLength) : name;
    };

    // Utility function to truncate action names (1 letter of first word, 3 of second if 2 words)
    const truncateAction = (actionName: string) => {
        const words = actionName.split(' ');
        if (words.length >= 2) {
            return `${words[0].charAt(0)}${words[1].substring(0, 3)}`;
        }
        return actionName.substring(0, 5); // Fallback to 5 chars if single word
    };    // Get breadcrumb title showing the hierarchy
    const getTitle = () => {
        if (currentFinca && currentBloque && accionId) {
            const truncatedFinca = truncateLocation(currentFinca.nombre);
            const truncatedBloque = truncateLocation(currentBloque.nombre);
            const actionName = ACCIONES_MAP[accionId as keyof typeof ACCIONES_MAP] || accionId;
            const truncatedAction = truncateAction(actionName);
            return `${truncatedFinca} / ${truncatedBloque} / ${truncatedAction}`;
        }
        if (currentFinca && currentBloque) {
            const truncatedFinca = truncateLocation(currentFinca.nombre);
            const truncatedBloque = truncateLocation(currentBloque.nombre);
            return `${truncatedFinca} / ${truncatedBloque}`;
        }
        if (currentBloque) {
            return truncateLocation(currentBloque.nombre);
        }
        return 'Variedades';
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
