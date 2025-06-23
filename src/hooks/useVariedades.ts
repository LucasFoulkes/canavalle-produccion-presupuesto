import { supabase } from '@/lib/supabase'

export const useVariedades = () => ({
    getByBloque: async (bloqueId: string) => {
        const { data } = await supabase
            .from('bloque_variedad')
            .select('variedades(id, nombre)')
            .eq('bloque_id', bloqueId)
        return data?.map(item => item.variedades) || []
    }
})
