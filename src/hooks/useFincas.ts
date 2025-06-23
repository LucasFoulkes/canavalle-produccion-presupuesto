import { supabase } from '@/lib/supabase'

export const useFincas = () => ({
    getAll: async () => {
        const { data } = await supabase.from('fincas').select('*')
        return data
    }
})