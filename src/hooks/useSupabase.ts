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

    return {
        fetchFincas,
        fetchBloquesByFincaId,
        fetchFincaById,
        fetchBloqueById,
        fetchVariedadesByBloqueId,
        verifyAdminPin,
        supabase
    };
};
