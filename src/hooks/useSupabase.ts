import { createClient } from '@supabase/supabase-js';
import { useCallback } from 'react';

// Initialize the Supabase client
const supabaseUrl = 'https://enejgdsgqahbktocmvev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZWpnZHNncWFoYmt0b2NtdmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODE5NDEsImV4cCI6MjA2NTQ1Nzk0MX0.wgC4YCVjGORnqOa1FjlwF9HvoI_22d_Me-CxQxUwRwU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define types for our database tables
interface Usuario {
    id: string;
    pin: string;
    role: string;
    nombre?: string;
    created_at?: string;
}

interface Finca {
    id: string;
    nombre: string;
    ubicacion?: string;
    hectareas?: number;
    created_at?: string;
    // Add other fields as needed
}

interface Bloque {
    id: string;
    nombre: string;
    finca_id: string;
    hectareas?: number;
    created_at?: string;
    // Add other fields as needed
}

export const useSupabase = () => {    // Generic database operations
    const fetchData = useCallback(async (table: string, queryOptions: any = {}) => {
        let query = supabase.from(table).select(queryOptions.select || '*');

        // Apply filters if provided
        if (queryOptions.filters) {
            queryOptions.filters.forEach((filter: any) => {
                query = query.filter(filter.column, filter.operator, filter.value);
            });
        }

        // Apply ordering if provided
        if (queryOptions.orderBy) {
            query = query.order(queryOptions.orderBy.column, {
                ascending: queryOptions.orderBy.ascending
            });
        }

        const { data, error } = await query;
        return { data, error };
    }, []);

    // Authentication with PIN
    const verifyAdminPin = useCallback(async (pin: string): Promise<{ isValid: boolean; userData?: Usuario }> => {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('pin', pin)
                // .eq('rol', 'admin')
                .single();

            if (error) {
                console.error('Error verifying PIN:', error);
                return { isValid: false };
            }

            return {
                isValid: !!data,
                userData: data as Usuario
            };
        } catch (error) {
            console.error('Error in verifyAdminPin:', error);
            return { isValid: false };
        }
    }, []);// Fetch all fincas
    const fetchFincas = useCallback(async (): Promise<{ data: Finca[] | null; error: any }> => {
        try {
            const { data, error } = await supabase
                .from('fincas')
                .select('*')
                .order('nombre');

            if (error) {
                console.error('Error fetching fincas:', error);
                return { data: null, error };
            }

            return { data: data as Finca[], error: null };
        } catch (error) {
            console.error('Error in fetchFincas:', error);
            return { data: null, error };
        }
    }, []);    // Fetch blocks by finca ID
    const fetchBloquesByFincaId = useCallback(async (fincaId: string): Promise<{ data: Bloque[] | null; error: any }> => {
        try {
            const { data, error } = await supabase
                .from('bloques')
                .select('*')
                .eq('finca_id', fincaId)
            // .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching bloques:', error);
                return { data: null, error };
            }

            return { data: data as Bloque[], error: null };
        } catch (error) {
            console.error('Error in fetchBloquesByFincaId:', error);
            return { data: null, error };
        }
    }, []);

    // Fetch a single finca by ID
    const fetchFincaById = useCallback(async (fincaId: string): Promise<{ data: Finca | null; error: any }> => {
        try {
            const { data, error } = await supabase
                .from('fincas')
                .select('*')
                .eq('id', fincaId)
                .single();

            if (error) {
                console.error('Error fetching finca:', error);
                return { data: null, error };
            }

            return { data: data as Finca, error: null };
        } catch (error) {
            console.error('Error in fetchFincaById:', error);
            return { data: null, error };
        }
    }, []);

    return {
        // Database
        fetchData,
        fetchFincas,
        fetchBloquesByFincaId,
        fetchFincaById,

        // Auth
        verifyAdminPin,

        // Raw client if needed for advanced operations
        supabase
    };
};
