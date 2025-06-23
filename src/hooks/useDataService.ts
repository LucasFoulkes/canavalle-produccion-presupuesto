import { supabase } from "@/lib/supabase";

export const useDataService = () => {
    const getAllFromTable = async (tableName: string) => {
        try {            // Special handling for bloque_variedad to include finca name
            if (tableName === 'bloque_variedad') {
                const { data, error } = await supabase
                    .from('bloque_variedad')
                    .select(`
                        *,
                        bloque:bloque_id(finca:finca_id(nombre))
                    `)
                    .order('id', { ascending: true });

                if (error) throw error;                // Flatten the data to include finca name directly
                return data?.map(item => ({
                    finca: item.bloque?.finca?.nombre || '-',
                    ...item
                })) || [];
            }

            // Default handling for other tables
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error fetching ${tableName}:`, error);
            return [];
        }
    };

    // Get lookup data for foreign key resolution
    const getLookupData = async () => {
        try {
            const [fincas, bloques, variedades] = await Promise.all([
                getAllFromTable('fincas'),
                getAllFromTable('bloques'),
                getAllFromTable('variedades')
            ]);

            return {
                finca_id: fincas?.reduce((acc: any, item: any) => ({ ...acc, [item.id]: item.nombre }), {}) || {},
                bloque_id: bloques?.reduce((acc: any, item: any) => ({ ...acc, [item.id]: item.nombre }), {}) || {},
                variedad_id: variedades?.reduce((acc: any, item: any) => ({ ...acc, [item.id]: item.nombre }), {}) || {},
            };
        } catch (error) {
            console.error('Error fetching lookup data:', error);
            return {};
        }
    };

    return { getAllFromTable, getLookupData };
};
