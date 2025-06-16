import { useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { COLUMN_MAPPING, CompletionStatus, isPerBloque } from '@/lib/schema';

/**
 * Hook for calculating completion status of actions
 * Centralizes the complex logic and makes it reusable
 */
export function useCompletionStatus() {
    const { fetchVariedadesByBloqueId, getBloqueVariedadId, supabase } = useSupabase();

    const getActionCompletionStatus = useCallback(async (
        bloqueId: string,
        actionId: string
    ): Promise<CompletionStatus> => {
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

            // For per-bloque actions (like clima), only check first variedad
            const variedadesToCheck = isPerBloque(actionId)
                ? [variedadesResult.data[0]]
                : variedadesResult.data;

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

            // Count non-zero values
            let totalExpectedValues = 0;
            let nonZeroValues = 0;

            for (const actionData of actionDataArray || []) {
                for (const column of columns) {
                    totalExpectedValues++;
                    const value = (actionData as any)?.[column] || 0;
                    if (value > 0) {
                        nonZeroValues++;
                    }
                }
                // For per-bloque actions, only check one entry
                if (isPerBloque(actionId)) break;
            }

            if (nonZeroValues === 0) return 'empty';
            if (nonZeroValues === totalExpectedValues) return 'complete';
            return 'partial';
        } catch (error) {
            console.error('Error checking action completion:', error);
            return 'empty';
        }
    }, [fetchVariedadesByBloqueId, getBloqueVariedadId, supabase]);

    // Batch fetch completion status for multiple actions
    const getMultipleCompletionStatus = useCallback(async (
        bloqueId: string,
        actionIds: string[]
    ): Promise<Record<string, CompletionStatus>> => {
        const results = await Promise.all(
            actionIds.map(async (actionId) => [
                actionId,
                await getActionCompletionStatus(bloqueId, actionId)
            ])
        );

        return Object.fromEntries(results);
    }, [getActionCompletionStatus]);

    return {
        getActionCompletionStatus,
        getMultipleCompletionStatus
    };
}
