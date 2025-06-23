// create or replace function public.column_names(p_table text)
// returns setof text
// security definer                     -- run with the function owner’s rights
// set search_path = public, pg_catalog -- keep it tight
// language sql stable as $$
// select column_name
// from information_schema.columns
// where table_schema = 'public'
//   and table_name   = p_table
// order by ordinal_position;
// $$;
// grant execute on function public.column_names(text) to anon; --or to auth role

import { supabase } from '@/lib/supabase';
export const useAcciones = () => ({
    getColumns: async (tableName: string) => {
        const { data, error } = await supabase
            .rpc('column_names', { p_table: tableName });

        if (error) {
            console.error(error);                // helps the next time
            return [];
        }

        const filtered = (data as string[]).filter(col =>
            !['id', 'created_at', 'bloque_variedad_id'].includes(col)
        );

        return filtered;               // already ordered
    },
    getLatest: async (accion: string, bloqueVariedadId: string) => {
        const { data } = await supabase
            .from('acciones')
            .select(accion)
            .eq('bloque_variedad_id', bloqueVariedadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        return (data as any)?.[accion] || null
    },

    update: async (accion: string, bloqueVariedadId: string, value: number) => {
        const { error } = await supabase
            .from('acciones')
            .insert({
                [accion]: value,
                bloque_variedad_id: bloqueVariedadId
            })
        return !error
    }
});