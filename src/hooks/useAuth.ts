import { supabase } from '@/lib/supabase'

export const useAuth = () => ({
    login: async (pin: string) => {
        const { data } = await supabase.from('usuarios').select('*').eq('pin', pin).single()
        return data
    }
})