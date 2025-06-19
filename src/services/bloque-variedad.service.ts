import { supabase } from '@/lib/supabase'

export interface BloqueVariedad {
    id: number
    bloque_id: number
    variedad_id: number
    created_at?: string
}

export interface CreateBloqueVariedadData {
    bloque_id: number
    variedad_id: number
}

export class BloqueVariedadService {
    // READ - Get all bloque_variedad relationships
    static async getAllBloqueVariedades() {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select('*')

        return { data, error }
    }

    // READ - Get bloque_variedad by bloque and variedad
    static async getBloqueVariedadByIds(bloqueId: number, variedadId: number) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select('*')
            .eq('bloque_id', bloqueId)
            .eq('variedad_id', variedadId)
            .single()

        return { data, error }
    }    // CREATE - Create or get existing bloque_variedad relationship
    static async getOrCreateBloqueVariedad(bloqueId: number, variedadId: number) {
        console.log('Getting or creating bloque_variedad for bloque:', bloqueId, 'variedad:', variedadId)

        // First try to get existing relationship
        const { data: existing, error: getError } = await this.getBloqueVariedadByIds(bloqueId, variedadId)

        if (!getError && existing) {
            console.log('Found existing bloque_variedad:', existing)
            return { data: existing, error: null }
        }

        console.log('No existing bloque_variedad found, creating new one. Error:', getError)

        // If not found, create new relationship
        const { data, error } = await supabase
            .from('bloque_variedad')
            .insert([{ bloque_id: bloqueId, variedad_id: variedadId }])
            .select('*')
            .single()

        console.log('Created new bloque_variedad:', data, 'Error:', error)
        return { data, error }
    }

    // READ - Get single bloque_variedad by id
    static async getBloqueVariedadById(id: number) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select('*')
            .eq('id', id)
            .single()

        return { data, error }
    }
}
