import { createClient } from '@supabase/supabase-js';
import { useCallback } from 'react';

const supabase = createClient(
    'https://enejgdsgqahbktocmvev.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZWpnZHNncWFoYmt0b2NtdmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODE5NDEsImV4cCI6MjA2NTQ1Nzk0MX0.wgC4YCVjGORnqOa1FjlwF9HvoI_22d_Me-CxQxUwRwU'
);

interface Usuario { id: string; pin: string; role: string; nombre?: string; }
interface Finca { id: string; nombre: string; ubicacion?: string; hectareas?: number; }
interface Bloque { id: string; nombre: string; finca_id: string; hectareas?: number; }
interface Variedad { id: string; nombre: string; }

type QueryResult<T> = Promise<{ data: T | null; error: any }>;

export const useSupabase = () => {
    const query = useCallback(async <T>(table: string, select = '*', filters?: Record<string, any>): QueryResult<T[]> => {
        try {
            let q = supabase.from(table).select(select);
            if (filters) Object.entries(filters).forEach(([key, value]) => q = q.eq(key, value));
            const { data, error } = await q;
            return { data: error ? null : data as T[], error };
        } catch (error) {
            return { data: null, error };
        }
    }, []);

    const verifyAdminPin = useCallback(async (pin: string) => {
        const { data, error } = await supabase.from('usuarios').select('*').eq('pin', pin).single();
        return { isValid: !error && !!data, userData: data as Usuario };
    }, []);

    const fetchFincas = useCallback((): QueryResult<Finca[]> => query('fincas'), [query]);

    const fetchBloquesByFincaId = useCallback((fincaId: string): QueryResult<Bloque[]> =>
        query('bloques', '*', { finca_id: fincaId }), [query]);

    const fetchFincaById = useCallback(async (fincaId: string): QueryResult<Finca> => {
        const { data, error } = await supabase.from('fincas').select('*').eq('id', fincaId).single();
        return { data: error ? null : data as Finca, error };
    }, []);

    const fetchBloqueById = useCallback(async (bloqueId: string): QueryResult<Bloque> => {
        const { data, error } = await supabase.from('bloques').select('*').eq('id', bloqueId).single();
        return { data: error ? null : data as Bloque, error };
    }, []);

    const fetchVariedadesByBloqueId = useCallback(async (bloqueId: string): QueryResult<Variedad[]> => {
        try {
            const { data: relations } = await supabase
                .from('bloque_variedad')
                .select('variedad_id')
                .eq('bloque_id', bloqueId);

            if (!relations?.length) return { data: [], error: null };

            const ids = relations.map(r => r.variedad_id);
            const { data, error } = await supabase
                .from('variedades')
                .select('id, nombre')
                .in('id', ids)

            return { data: error ? [] : data as Variedad[], error };
        } catch (error) {
            return { data: null, error };
        }
    }, []);

    // Get bloque_variedad_id for a specific bloque and variedad
    const getBloqueVariedadId = useCallback(async (bloqueId: string, variedadId: string): Promise<string | null> => {
        const { data } = await supabase
            .from('bloque_variedad')
            .select('id')
            .eq('bloque_id', bloqueId)
            .eq('variedad_id', variedadId)
            .single();
        return data?.id || null;
    }, []);    // Get today's action value for a specific bloque_variedad and action type
    const getActionValue = useCallback(async (bloqueVariedadId: string, accionTipo: string): Promise<number> => {
        try {
            console.log('Getting action value for:', { bloqueVariedadId, accionTipo });

            // Map action IDs to column names
            const columnMapping: { [key: string]: string } = {
                'produccion-real': 'produccion_real',
                'pinche-apertura': 'pinche_apertura',
                'pinche-sanitario': 'pinche_sanitario',
                'pinche-tierno': 'pinche_tierno',
                'clima': 'temperatura', // Assuming clima maps to temperatura
                'arveja': 'arveja',
                'garbanzo': 'garbanzo',
                'uva': 'uva'
            };

            const columnName = columnMapping[accionTipo];
            if (!columnName) {
                console.warn('Unknown action type:', accionTipo);
                return 0;
            }

            const { data, error } = await supabase
                .from('acciones')
                .select(columnName)
                .eq('bloque_variedad_id', bloqueVariedadId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching action value:', error);
                return 0;
            }
            console.log('Action value result:', data);
            return (data as any)?.[columnName] || 0;
        } catch (error) {
            console.error('Exception in getActionValue:', error);
            return 0;
        }
    }, []);    // Update or create an action entry
    const upsertActionValue = useCallback(async (bloqueVariedadId: string, accionTipo: string, valor: number): Promise<{ success: boolean; error?: any }> => {
        console.log('Upserting action value:', { bloqueVariedadId, accionTipo, valor });

        try {
            // Map action IDs to column names
            const columnMapping: { [key: string]: string } = {
                'produccion-real': 'produccion_real',
                'pinche-apertura': 'pinche_apertura',
                'pinche-sanitario': 'pinche_sanitario',
                'pinche-tierno': 'pinche_tierno',
                'clima': 'temperatura', // Assuming clima maps to temperatura
                'arveja': 'arveja',
                'garbanzo': 'garbanzo',
                'uva': 'uva'
            };

            const columnName = columnMapping[accionTipo];
            if (!columnName) {
                console.error('Unknown action type:', accionTipo);
                return { success: false, error: 'Unknown action type' };
            }

            // First, check if an entry exists for this bloque_variedad_id
            const { data: existingEntry, error: selectError } = await supabase
                .from('acciones')
                .select('id')
                .eq('bloque_variedad_id', bloqueVariedadId)
                .maybeSingle();

            // If there's an error selecting, return error
            if (selectError) {
                console.error('Error checking existing entry:', selectError);
                return { success: false, error: selectError };
            } console.log('Existing entry:', existingEntry);

            let result;
            if (existingEntry) {
                // Update existing entry - only update the specific column
                console.log('Updating existing entry with ID:', existingEntry.id);
                const updateData = { [columnName]: valor };
                result = await supabase
                    .from('acciones')
                    .update(updateData)
                    .eq('id', existingEntry.id);
            } else {
                // Create new entry - set all other columns to 0 and the specific column to the value
                console.log('Creating new entry');
                const insertData = {
                    bloque_variedad_id: bloqueVariedadId,
                    produccion_real: accionTipo === 'produccion-real' ? valor : 0,
                    pinche_apertura: accionTipo === 'pinche-apertura' ? valor : 0,
                    pinche_sanitario: accionTipo === 'pinche-sanitario' ? valor : 0,
                    pinche_tierno: accionTipo === 'pinche-tierno' ? valor : 0,
                    temperatura: accionTipo === 'clima' ? valor : 0,
                    humedad: 0, // Default to 0
                    arveja: accionTipo === 'arveja' ? valor : 0,
                    garbanzo: accionTipo === 'garbanzo' ? valor : 0,
                    uva: accionTipo === 'uva' ? valor : 0
                };
                result = await supabase
                    .from('acciones')
                    .insert(insertData);
            }

            console.log('Upsert result:', result);
            return { success: !result.error, error: result.error };
        } catch (error) {
            console.error('Error in upsertActionValue:', error);
            return { success: false, error };
        }
    }, []);

    return {
        fetchFincas,
        fetchBloquesByFincaId,
        fetchFincaById,
        fetchBloqueById,
        fetchVariedadesByBloqueId,
        verifyAdminPin,
        getBloqueVariedadId,
        getActionValue,
        upsertActionValue,
        supabase
    };
};
