import { createClient } from '@supabase/supabase-js';

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

export const useSupabase = () => {
    // Generic database operations
    const fetchData = async (table: string, queryOptions: any = {}) => {
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
    };    // Authentication with PIN
    const verifyAdminPin = async (pin: string): Promise<{ isValid: boolean; userData?: Usuario }> => {
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
    };

    return {
        // Database
        fetchData,

        // Auth
        verifyAdminPin,

        // Raw client if needed for advanced operations
        supabase
    };
};
