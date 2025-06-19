import { supabase } from '@/lib/supabase'

export interface Usuario {
    id: number
    pin: string
    // Add other fields from your usuarios table here
}

export class AuthService {
    static async authenticateWithPin(pin: string): Promise<{ data: Usuario | null; error: string | null }> {
        try {
            // Query usuarios table for matching pin
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('pin', pin)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return { data: null, error: 'PIN no encontrado' }
                }
                return { data: null, error: error.message }
            }

            return { data, error: null }
        } catch (err) {
            return { data: null, error: 'Error de autenticación' }
        }
    }
}
