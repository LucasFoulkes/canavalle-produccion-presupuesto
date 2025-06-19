import { supabase } from '@/lib/supabase'

export interface Variedad {
    id: number
    nombre: string
}

export interface CreateVariedadData {
    nombre: string
}

export interface UpdateVariedadData {
    nombre?: string
}

export class VariedadesService {
    // READ - Get all variedades
    static async getAllVariedades() {
        const { data, error } = await supabase
            .from('variedades')
            .select('id, nombre')

        return { data, error }
    }

    // READ - Get single variedad
    static async getVariedadById(id: number) {
        const { data, error } = await supabase
            .from('variedades')
            .select('id, nombre')
            .eq('id', id)
            .single()

        return { data, error }
    }

    // CREATE - Add new variedad
    static async createVariedad(variedadData: CreateVariedadData) {
        const { data, error } = await supabase
            .from('variedades')
            .insert([variedadData])
            .select('id, nombre')
            .single()

        return { data, error }
    }

    // UPDATE - Edit existing variedad
    static async updateVariedad(id: number, updates: UpdateVariedadData) {
        const { data, error } = await supabase
            .from('variedades')
            .update(updates)
            .eq('id', id)
            .select('id, nombre')
            .single()

        return { data, error }
    }

    // DELETE - Remove variedad
    static async deleteVariedad(id: number) {
        const { data, error } = await supabase
            .from('variedades')
            .delete()
            .eq('id', id)

        return { data, error }
    }    // READ - Get all variedades for a given bloque (through junction table)
    static async getVariedadesByBloqueId(bloqueId: number) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select(`
                variedades (
                    id,
                    nombre
                )
            `)
            .eq('bloque_id', bloqueId)

        if (error) return { data: [], error }

        // Extract variedades from the nested result and flatten
        const variedades = data
            .map(item => item.variedades)
            .filter(Boolean)
            .flat() as Variedad[]

        return { data: variedades, error: null }
    }
}
