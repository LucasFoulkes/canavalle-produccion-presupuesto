import { supabase } from "@/lib/supabase";

export const useDataService = () => {
    const getAllFromTable = async (tableName: string) => {
        try {
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

    return { getAllFromTable };
};
