import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import DataGridPage from '@/components/DataGridPage';

const ACCIONES_ITEMS = [
    { id: 'produccion-real', nombre: 'PRODUCCION REAL' },
    { id: 'pinche-apertura', nombre: 'PINCHE DE APERTURA' },
    { id: 'pinche-sanitario', nombre: 'PINCHE SANITARIO' },
    { id: 'pinche-tierno', nombre: 'PINCHE EN TIERNO' },
    { id: 'clima', nombre: 'CLIMA' },
    { id: 'arveja', nombre: 'ARVEJA' },
    { id: 'garbanzo', nombre: 'GARBANZO' },
    { id: 'uva', nombre: 'UVA' }
];

export default function Acciones() {
    const { bloqueId } = useParams<{ bloqueId: string }>();
    const navigate = useNavigate();
    const { currentFinca, currentBloque } = useAuth();
    const { fetchVariedadesByBloqueId, getBloqueVariedadId, supabase } = useSupabase();

    // Utility function to truncate location names
    const truncateLocation = (name: string, maxLength: number = 5) => {
        return name.length > maxLength ? name.substring(0, maxLength) : name;
    };

    // Get breadcrumb title showing the hierarchy
    const getTitle = () => {
        if (currentFinca && currentBloque) {
            const truncatedFinca = truncateLocation(currentFinca.nombre);
            const truncatedBloque = truncateLocation(currentBloque.nombre);
            return `${truncatedFinca} / ${truncatedBloque}`;
        }
        if (currentBloque) {
            return truncateLocation(currentBloque.nombre);
        }
        return 'Acciones';
    };

    const getBackPath = () => {
        if (currentFinca) {
            return `/bloques/${currentFinca.id}`;
        }
        return '/fincas';
    };    // Calculate completion status for an action
    const getActionCompletionStatus = useCallback(async (actionId: string): Promise<'empty' | 'partial' | 'complete'> => {
        if (!bloqueId) return 'empty';

        try {
            // Get all variedades for this bloque
            const variedadesResult = await fetchVariedadesByBloqueId(bloqueId);
            if (!variedadesResult.data || variedadesResult.data.length === 0) {
                return 'empty';
            }

            // Column mapping for each action type
            const columnMapping: { [key: string]: string[] } = {
                'produccion-real': ['produccion_real'],
                'pinche-apertura': ['pinche_apertura'],
                'pinche-sanitario': ['pinche_sanitario'],
                'pinche-tierno': ['pinche_tierno'],
                'clima': ['temperatura', 'humedad'],
                'arveja': ['arveja'],
                'garbanzo': ['garbanzo'],
                'uva': ['uva']
            };

            const columns = columnMapping[actionId];
            if (!columns) return 'empty';

            // For clima, we only need to check one bloque_variedad_id (since it's per-bloque)
            const variedadesToCheck = actionId === 'clima' ? [variedadesResult.data[0]] : variedadesResult.data;

            let totalExpectedValues = 0;
            let nonZeroValues = 0;

            for (const variedad of variedadesToCheck) {
                const bloqueVariedadId = await getBloqueVariedadId(bloqueId, variedad.id);
                if (!bloqueVariedadId) continue;

                // Get action data for this bloque_variedad
                const { data: actionData } = await supabase
                    .from('acciones')
                    .select(columns.join(', '))
                    .eq('bloque_variedad_id', bloqueVariedadId)
                    .maybeSingle();

                for (const column of columns) {
                    totalExpectedValues++;
                    const value = (actionData as any)?.[column] || 0;
                    if (value > 0) {
                        nonZeroValues++;
                    }
                }

                // For clima, we only check one entry (break after first variedad)
                if (actionId === 'clima') break;
            }

            if (nonZeroValues === 0) return 'empty';
            if (nonZeroValues === totalExpectedValues) return 'complete';
            return 'partial';
        } catch (error) {
            console.error('Error checking action completion:', error);
            return 'empty';
        }
    }, [bloqueId, fetchVariedadesByBloqueId, getBloqueVariedadId, supabase]);    // Fetch actions with completion status
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
    }, [getActionCompletionStatus]); const handleAccionClick = (accion: any) => {
        // Navigate to variedades with the selected action
        navigate(`/variedades/${bloqueId}/${accion.id}`);
    }; return (
        <DataGridPage
            fetchData={fetchAccionesWithStatus}
            title={getTitle()}
            showBackButton={true}
            backPath={getBackPath()}
            emptyMessage="No hay acciones disponibles"
            onItemClick={handleAccionClick}
            getItemTitle={(accion) => accion.nombre}
            getItemKey={(accion) => accion.id}
            getItemClassName={(accion) => {
                const status = accion.completionStatus;
                if (status === 'complete') return 'border-green-500 border-2 bg-green-500/10 text-green-500/70';
                if (status === 'partial') return 'border-yellow-500 border-2 bg-yellow-500/10 text-yellow-500/70';
                return 'border-red-500 border-2 bg-red-500/10 text-red-500/70'; // empty status = red
            }}
            showHeader={true}
            showGridToggle={false}
            defaultCols={1}
            storageKey="accionesGridLayout"
        />
    );
}
