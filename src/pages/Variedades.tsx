import { useParams } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import DataGridPage from '@/components/DataGridPage';
import ActionValueDialog from '@/components/ActionValueDialog';
import { Leaf, Wheat, Sun, TreePine, Grape } from 'lucide-react';

export default function Variedades() {
    const { bloqueId, accionId } = useParams<{ bloqueId: string; accionId: string }>();
    const { fetchVariedadesByBloqueId, getBloqueVariedadId, getActionValue, upsertActionValue, supabase } = useSupabase();
    const { currentFinca, currentBloque } = useAuth();

    // State for dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedVariedad, setSelectedVariedad] = useState<any>(null);
    const [currentActionValue, setCurrentActionValue] = useState(0);
    const [refetchData, setRefetchData] = useState<(() => Promise<void>) | null>(null);

    // Handle refetch function from DataGridPage
    const handleRefetch = useCallback((refetchFn: () => Promise<void>) => {
        console.log('Variedades: Received refetch function:', typeof refetchFn);
        setRefetchData(() => refetchFn);
    }, []);    // Enhanced action items mapping with icons and descriptions
    const ACCIONES_MAP = {
        'produccion-real': {
            name: 'PRODUCCIÓN REAL',
            icon: <Wheat className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Registro de producción efectiva'
        },
        'pinche-apertura': {
            name: 'PINCHE DE APERTURA',
            icon: <TreePine className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Control de apertura de cultivos'
        },
        'pinche-sanitario': {
            name: 'PINCHE SANITARIO',
            icon: <Leaf className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Manejo sanitario de cultivos'
        },
        'pinche-tierno': {
            name: 'PINCHE EN TIERNO',
            icon: <Leaf className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Control en estado tierno'
        },
        'clima': {
            name: 'CLIMA',
            icon: <Sun className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Condiciones climáticas'
        },
        'arveja': {
            name: 'ARVEJA',
            icon: <Leaf className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Cultivo de arveja'
        },
        'garbanzo': {
            name: 'GARBANZO',
            icon: <Leaf className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Cultivo de garbanzo'
        },
        'uva': {
            name: 'UVA',
            icon: <Grape className="h-6 w-6" />,
            color: 'text-primary',
            description: 'Cultivo de uva'
        }
    };

    // Utility function to truncate location names with enhanced styling
    const truncateLocation = (name: string, maxLength: number = 6) => {
        return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
    };

    // Get enhanced breadcrumb title showing the hierarchy
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
    };

    // Get the action name for display
    const getActionName = () => {
        if (accionId) {
            const actionDetails = ACCIONES_MAP[accionId as keyof typeof ACCIONES_MAP];
            return actionDetails?.name || accionId.toUpperCase();
        }
        return null;
    };

    // Get back path
    const getBackPath = () => {
        if (bloqueId) {
            return `/acciones/${bloqueId}`;
        }
        return '/fincas';
    };

    // Define which actions support per-variedad value display and editing
    const ACTIONS_WITH_VALUES = [
        'produccion-real',
        'pinche-apertura',
        'pinche-sanitario',
        'pinche-tierno',
        'arveja',
        'garbanzo',
        'uva'
    ];

    const fetchVariedades = useCallback(async () => {
        if (!bloqueId) {
            return Promise.resolve({ data: [], error: null });
        }

        // Special case for clima - show temperatura and humedad options
        if (accionId === 'clima') {
            const climaOptions = [
                { id: 'temperatura', nombre: 'TEMPERATURA' },
                { id: 'humedad', nombre: 'HUMEDAD' }
            ];
            // For clima, we need to get a single bloque_variedad_id (we'll use the first variedad for this bloque)
            const variedadesResult = await fetchVariedadesByBloqueId(bloqueId);
            if (variedadesResult.data && variedadesResult.data.length > 0) {
                const firstVariedad = variedadesResult.data[0];
                const bloqueVariedadId = await getBloqueVariedadId(bloqueId, firstVariedad.id);
                const climaOptionsWithData = await Promise.all(
                    climaOptions.map(async (option) => {
                        if (bloqueVariedadId) {
                            // Get the value for temperature or humidity by directly querying the column
                            const columnName = option.id === 'temperatura' ? 'temperatura' : 'humedad';
                            const { data } = await supabase
                                .from('acciones')
                                .select(columnName)
                                .eq('bloque_variedad_id', bloqueVariedadId)
                                .maybeSingle();

                            const actionValue = (data as any)?.[columnName] || 0;
                            return {
                                ...option,
                                bloqueVariedadId,
                                actionValue,
                                climaType: option.id // Store whether this is temperatura or humedad
                            };
                        }
                        return {
                            ...option,
                            bloqueVariedadId: null,
                            actionValue: 0,
                            climaType: option.id
                        };
                    })
                );
                return { data: climaOptionsWithData, error: null };
            }
            return { data: climaOptions, error: null };
        }

        const result = await fetchVariedadesByBloqueId(bloqueId);
        if (result.data && accionId && ACTIONS_WITH_VALUES.includes(accionId)) {
            // For actions with values, we need to fetch action values and bloque_variedad_ids
            const variedadesWithData = await Promise.all(
                result.data.map(async (variedad: any) => {
                    const bloqueVariedadId = await getBloqueVariedadId(bloqueId, variedad.id);
                    if (bloqueVariedadId) {
                        const actionValue = await getActionValue(bloqueVariedadId, accionId);
                        return {
                            ...variedad,
                            bloqueVariedadId,
                            actionValue
                        };
                    }
                    return {
                        ...variedad,
                        bloqueVariedadId: null,
                        actionValue: 0
                    };
                })
            );
            return { data: variedadesWithData, error: null };
        }

        return result;
    }, [bloqueId, fetchVariedadesByBloqueId, accionId, getBloqueVariedadId, getActionValue, supabase]);

    const handleVariedadClick = (variedad: any) => {
        if (accionId === 'clima' || (accionId && ACTIONS_WITH_VALUES.includes(accionId))) {
            setSelectedVariedad(variedad);
            setCurrentActionValue(variedad.actionValue || 0);
            setDialogOpen(true);
        }
    };

    const handleSaveActionValue = async (value: number) => {
        if (selectedVariedad && selectedVariedad.bloqueVariedadId && accionId) {
            console.log('Saving action value:', {
                bloqueVariedadId: selectedVariedad.bloqueVariedadId,
                accionId,
                value,
                selectedVariedad: selectedVariedad.nombre,
                climaType: selectedVariedad.climaType
            });

            let result;
            if (accionId === 'clima' && selectedVariedad.climaType) {
                // Special handling for clima - directly update the specific column
                const columnName = selectedVariedad.climaType === 'temperatura' ? 'temperatura' : 'humedad';

                // Check if entry exists
                const { data: existingEntry } = await supabase
                    .from('acciones')
                    .select('id')
                    .eq('bloque_variedad_id', selectedVariedad.bloqueVariedadId)
                    .maybeSingle();

                if (existingEntry) {
                    // Update existing entry
                    const updateData = { [columnName]: value };
                    const updateResult = await supabase
                        .from('acciones')
                        .update(updateData)
                        .eq('id', existingEntry.id);
                    result = { success: !updateResult.error, error: updateResult.error };
                } else {
                    // Create new entry
                    const insertData = {
                        bloque_variedad_id: selectedVariedad.bloqueVariedadId,
                        produccion_real: 0,
                        pinche_apertura: 0,
                        pinche_sanitario: 0,
                        pinche_tierno: 0,
                        temperatura: selectedVariedad.climaType === 'temperatura' ? value : 0,
                        humedad: selectedVariedad.climaType === 'humedad' ? value : 0,
                        arveja: 0,
                        garbanzo: 0,
                        uva: 0
                    };
                    const insertResult = await supabase
                        .from('acciones')
                        .insert(insertData);
                    result = { success: !insertResult.error, error: insertResult.error };
                }
            } else {
                // Regular handling for other actions
                result = await upsertActionValue(selectedVariedad.bloqueVariedadId, accionId, value);
            }

            if (result.success) {
                console.log('Save successful, refetching data...');
                // Refresh the data to show updated values
                if (refetchData && typeof refetchData === 'function') {
                    await refetchData();
                    console.log('Data refetched successfully');
                } else {
                    console.error('refetchData is not available or not a function:', refetchData);
                }
            } else {
                console.error('Error saving action value:', result.error);
            }
        } else {
            console.error('Missing required data for save:', {
                hasSelectedVariedad: !!selectedVariedad,
                hasBloqueVariedadId: !!selectedVariedad?.bloqueVariedadId,
                hasAccionId: !!accionId
            });
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedVariedad(null);
        setCurrentActionValue(0);
    };

    return (
        <>
            <DataGridPage
                fetchData={fetchVariedades}
                title={getTitle()}
                showBackButton={true}
                backPath={getBackPath()}
                emptyMessage={accionId === 'clima' ? "No hay datos de clima disponibles para este bloque" : "No hay variedades disponibles para este bloque"}
                onItemClick={handleVariedadClick}
                getItemTitle={(variedad) => variedad.nombre}
                getItemKey={(variedad) => variedad.id}
                getItemValue={(accionId === 'clima' || (accionId && ACTIONS_WITH_VALUES.includes(accionId))) ? (variedad) => variedad.actionValue || 0 : undefined}
                onRefetch={handleRefetch}
                showHeader={true}
                showGridToggle={false}
                defaultCols={1}
                storageKey="variedadesGridLayout"
                secondaryAction={getActionName() ? {
                    label: getActionName()!
                } : undefined}
            />

            {dialogOpen && selectedVariedad && (
                <ActionValueDialog
                    isOpen={dialogOpen}
                    onClose={handleCloseDialog}
                    onSave={handleSaveActionValue}
                    variedadName={selectedVariedad.nombre}
                    actionName={getActionName() || 'Acción'}
                    currentValue={currentActionValue}
                />
            )}
        </>
    );
}