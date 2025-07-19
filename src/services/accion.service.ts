import { supabase } from '@/lib/supabase'
import { Accion } from '@/types/database'

export const accionService = {
    // Get all acciones
    async getAllAcciones(): Promise<Accion[]> {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')

        if (error) throw error
        return data || []
    },

    // Get a specific accion by ID
    async getAccionById(accionId: number): Promise<Accion | null> {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('id', accionId)
            .single()

        if (error) throw error
        return data
    },

    // Get column names for the acciones table
    async getAccionesColumns(): Promise<string[]> {
        try {
            // First get at least one row to examine its structure
            const { data, error } = await supabase
                .from('acciones')
                .select('*')
                .limit(1)

            if (error) throw error

            // If we have data, return the column names
            if (data && data.length > 0) {
                return Object.keys(data[0])
            }

            // If the table is empty, return default column names
            // These match your actual table structure
            return [
                'id',
                'created_at',
                'produccion_real',
                'pinche_apertura',
                'pinche_sanitario',
                'pinche_tierno',
                'temperatura',
                'humedad',
                'arveja',
                'garbanzo',
                'uva',
                'bloque_variedad_id'
            ]
        } catch (err) {
            console.error('Error getting acciones columns:', err)
            // Return default column names as fallback
            return [
                'id',
                'created_at',
                'produccion_real',
                'pinche_apertura',
                'pinche_sanitario',
                'pinche_tierno',
                'temperatura',
                'humedad',
                'arveja',
                'garbanzo',
                'uva',
                'bloque_variedad_id'
            ]
        }
    }
}