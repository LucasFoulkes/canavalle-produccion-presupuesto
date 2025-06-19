import { supabase } from '@/lib/supabase'

export interface Accion {
    id: number
    created_at: string
    produccion_real?: number
    pinche_apertura?: number
    pinche_sanitario?: number
    pinche_tierno?: number
    temperatura?: number
    humedad?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    bloque_variedad_id?: number
}

export interface CreateAccionData {
    produccion_real?: number
    pinche_apertura?: number
    pinche_sanitario?: number
    pinche_tierno?: number
    temperatura?: number
    humedad?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    bloque_variedad_id?: number
}

export interface UpdateAccionData {
    produccion_real?: number
    pinche_apertura?: number
    pinche_sanitario?: number
    pinche_tierno?: number
    temperatura?: number
    humedad?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    bloque_variedad_id?: number
}

export class AccionesService {
    // READ - Get all acciones
    static async getAllAcciones() {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .order('created_at', { ascending: false })

        return { data, error }
    }

    // READ - Get single accion
    static async getAccionById(id: number) {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('id', id)
            .single()

        return { data, error }
    }

    // CREATE - Add new accion
    static async createAccion(accionData: CreateAccionData) {
        const { data, error } = await supabase
            .from('acciones')
            .insert([accionData])
            .select('*')
            .single()

        return { data, error }
    }

    // UPDATE - Edit existing accion
    static async updateAccion(id: number, updates: UpdateAccionData) {
        const { data, error } = await supabase
            .from('acciones')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()

        return { data, error }
    }

    // DELETE - Remove accion
    static async deleteAccion(id: number) {
        const { data, error } = await supabase
            .from('acciones')
            .delete()
            .eq('id', id)

        return { data, error }
    }

    // READ - Get acciones by bloque_variedad_id
    static async getAccionesByBloqueVariedadId(bloqueVariedadId: number) {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('bloque_variedad_id', bloqueVariedadId)
            .order('created_at', { ascending: false })

        return { data, error }
    }

    // READ - Get latest value for specific bloque_variedad and action column
    static async getLatestActionValue(bloqueVariedadId: number, actionColumn: string) {
        const { data, error } = await supabase
            .from('acciones')
            .select(`id, ${actionColumn}, created_at`)
            .eq('bloque_variedad_id', bloqueVariedadId)
            .not(actionColumn, 'is', null) // Only get records where this column has a value
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            // If no records found, return 0 as default
            if (error.code === 'PGRST116') {
                return { data: { value: 0 }, error: null }
            }
            return { data: null, error }
        } return {
            data: { value: (data as any)[actionColumn] || 0 },
            error: null
        }
    }

    // GETCOLUMNS - Get column names for a table (keeping existing functionality)
    static async getColumns() {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .limit(1)

        if (error) return { data: [], error }

        const columns = data.length ? Object.keys(data[0]) : []
        return { data: columns, error: null }
    }
}