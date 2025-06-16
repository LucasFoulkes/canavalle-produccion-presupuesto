import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import DataGridPage from '@/components/DataGridPage';

// Types
interface AccionItem {
    id: string;
    nombre: string;
    completionStatus?: 'empty' | 'partial' | 'complete';
}

type CompletionStatus = 'empty' | 'partial' | 'complete';

const ACCIONES_ITEMS: AccionItem[] = [
    { id: 'produccion-real', nombre: 'PRODUCCION REAL' },
    { id: 'pinche-apertura', nombre: 'PINCHE DE APERTURA' },
    { id: 'pinche-sanitario', nombre: 'PINCHE SANITARIO' },
    { id: 'pinche-tierno', nombre: 'PINCHE EN TIERNO' },
    { id: 'clima', nombre: 'CLIMA' },
    { id: 'arveja', nombre: 'ARVEJA' },
    { id: 'garbanzo', nombre: 'GARBANZO' },
    { id: 'uva', nombre: 'UVA' }
];

// Column mapping for each action type - centralized to avoid duplication
const COLUMN_MAPPING: Record<string, string[]> = {
    'produccion-real': ['produccion_real'],
    'pinche-apertura': ['pinche_apertura'],
    'pinche-sanitario': ['pinche_sanitario'],
    'pinche-tierno': ['pinche_tierno'],
    'clima': ['temperatura', 'humedad'],
    'arveja': ['arveja'],
    'garbanzo': ['garbanzo'],
    'uva': ['uva']
};

export default function Acciones() {
    const { bloqueId } = useParams<{ bloqueId: string }>();
    const navigate = useNavigate();
    const { currentFinca, currentBloque } = useAuth();
    const { fetchVariedadesByBloqueId, getBloqueVariedadId, supabase } = useSupabase();    // Memoized utility functions
    const truncateLocation = useMemo(() =>
        (name: string, maxLength: number = 5): string => {
            return name.length > maxLength ? name.substring(0, maxLength) : name;
        }, []
    );

    // Get breadcrumb title showing the hierarchy
    const getTitle = useMemo(() => {
        if (currentFinca && currentBloque) {
            const truncatedFinca = truncateLocation(currentFinca.nombre);
            const truncatedBloque = truncateLocation(currentBloque.nombre);
            return `${truncatedFinca} / ${truncatedBloque}`;
        }
        if (currentBloque) {
            return truncateLocation(currentBloque.nombre);
        }
        return 'Acciones';
    }, [currentFinca, currentBloque, truncateLocation]);

    const getBackPath = useMemo(() => {
        if (currentFinca) {
            return `/bloques/${currentFinca.id}`;
        }
        return '/fincas';
    }, [currentFinca]);    // Calculate completion status for an action
    const getActionCompletionStatus = useCallback(async (actionId: string): Promise<CompletionStatus> => {
        if (!bloqueId) return 'empty';

        try {
            // Get all variedades for this bloque
            const variedadesResult = await fetchVariedadesByBloqueId(bloqueId);
            if (!variedadesResult.data || variedadesResult.data.length === 0) {
                return 'empty';
            }

            const columns = COLUMN_MAPPING[actionId];
            if (!columns) {
                console.warn(`Unknown action type: ${actionId}`);
                return 'empty';
            }

            // For clima, we only need to check one bloque_variedad_id (since it's per-bloque)
            const variedadesToCheck = actionId === 'clima' ? [variedadesResult.data[0]] : variedadesResult.data;

            let totalExpectedValues = 0;
            let nonZeroValues = 0;

            // Batch all bloque_variedad_id requests
            const bloqueVariedadIds = await Promise.all(
                variedadesToCheck.map(variedad => getBloqueVariedadId(bloqueId, variedad.id))
            );

            // Filter out null values and batch database queries
            const validBloqueVariedadIds = bloqueVariedadIds.filter(Boolean) as string[];

            if (validBloqueVariedadIds.length === 0) return 'empty';

            // Batch query all action data
            const { data: actionDataArray } = await supabase
                .from('acciones')
                .select(columns.join(', '))
                .in('bloque_variedad_id', validBloqueVariedadIds);

            // Count values
            for (const actionData of actionDataArray || []) {
                for (const column of columns) {
                    totalExpectedValues++;
                    const value = (actionData as any)?.[column] || 0;
                    if (value > 0) {
                        nonZeroValues++;
                    }
                }
                // For clima, we only check one entry
                if (actionId === 'clima') break;
            }

            if (nonZeroValues === 0) return 'empty';
            if (nonZeroValues === totalExpectedValues) return 'complete';
            return 'partial';
        } catch (error) {
            console.error('Error checking action completion:', error);
            return 'empty';
        }
    }, [bloqueId, fetchVariedadesByBloqueId, getBloqueVariedadId, supabase]);// Fetch actions with completion status
    const fetchAccionesWithStatus = useCallback(async () => {
        try {
            const accionesWithStatus = await Promise.all(
                ACCIONES_ITEMS.map(async (accion) => {
                    const status = await getActionCompletionStatus(accion.id);
                    return {
                        ...accion,
                        completionStatus: status
                    };
                })
            );
            return { data: accionesWithStatus, error: null };
        } catch (error) {
            return { data: ACCIONES_ITEMS, error };
        }
    }, [getActionCompletionStatus]);

    const handleAccionClick = useCallback((accion: AccionItem) => {
        // Navigate to variedades with the selected action
        navigate(`/variedades/${bloqueId}/${accion.id}`);
    }, [navigate, bloqueId]);

    // Memoized class name generator for better performance
    const getItemClassName = useCallback((accion: AccionItem): string => {
        const status = accion.completionStatus;
        switch (status) {
            case 'complete':
                return 'border-green-500 border-2 bg-green-500/10 text-green-500/70';
            case 'partial':
                return 'border-yellow-500 border-2 bg-yellow-500/10 text-yellow-500/70';
            default: // 'empty' or undefined
                return 'border-red-500 border-2 bg-red-500/10 text-red-500/70';
        }
    }, []);

    return (<DataGridPage
        fetchData={fetchAccionesWithStatus}
        title={getTitle}
        showBackButton={true}
        backPath={getBackPath}
        emptyMessage="No hay acciones disponibles"
        onItemClick={handleAccionClick} getItemTitle={(accion: AccionItem) => accion.nombre}
        getItemKey={(accion: AccionItem) => accion.id} getItemClassName={getItemClassName}
        showHeader={true}
        showGridToggle={false}
        defaultCols={1}
        storageKey="accionesGridLayout"
    />
    );
}
