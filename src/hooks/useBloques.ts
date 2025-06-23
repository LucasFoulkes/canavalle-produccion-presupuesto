import { supabase } from '@/lib/supabase'

export const useBloques = () => ({
    getByFinca: async (fincaId: string) => {
        const { data } = await supabase.from('bloques').select('*').eq('finca_id', fincaId)
        return data
    }
})
