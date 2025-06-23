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
    }
});