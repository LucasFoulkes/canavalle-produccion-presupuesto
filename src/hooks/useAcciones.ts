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
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Check if there's already an entry for today
        const { data: existingEntry } = await supabase
            .from('acciones')
            .select('id')
            .eq('bloque_variedad_id', bloqueVariedadId)
            .gte('created_at', `${today}T00:00:00.000Z`)
            .lt('created_at', `${today}T23:59:59.999Z`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existingEntry) {
            // Update existing entry
            const { error } = await supabase
                .from('acciones')
                .update({ [accion]: value })
                .eq('id', existingEntry.id);
            return !error;
        } else {
            // Create new entry
            const { error } = await supabase
                .from('acciones')
                .insert({
                    [accion]: value,
                    bloque_variedad_id: bloqueVariedadId
                });
            return !error;
        }
    },

    getLatestBatch: async (accion: string, bloqueVariedadIds: string[]) => {
        if (!bloqueVariedadIds.length) return {};

        const { data } = await supabase
            .from('acciones')
            .select(`bloque_variedad_id, ${accion}, created_at`)
            .in('bloque_variedad_id', bloqueVariedadIds)
            .order('created_at', { ascending: false });

        // Get the latest value for each bloque_variedad_id
        const latestValues: Record<string, any> = {};
        (data as any)?.forEach((row: any) => {
            if (!latestValues[row.bloque_variedad_id]) {
                latestValues[row.bloque_variedad_id] = row[accion];
            }
        });

        return latestValues;
    },
});