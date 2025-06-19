import { supabase } from '@/lib/supabase'

export interface Finca {
    id: number
    nombre: string
}

export interface CreateFincaData {
    nombre: string
}

export interface UpdateFincaData {
    nombre?: string
}

export class FincasService {
    // READ - Get all fincas
    static async getAllFincas() {
        const { data, error } = await supabase
            .from('fincas')
            .select('id, nombre')

        return { data, error }
    }

    // READ - Get single finca
    static async getFincaById(id: number) {
        const { data, error } = await supabase
            .from('fincas')
            .select('id, nombre')
            .eq('id', id)
            .single()

        return { data, error }
    }

    // CREATE - Add new finca
    static async createFinca(fincaData: CreateFincaData) {
        const { data, error } = await supabase
            .from('fincas')
            .insert([fincaData])
            .select('id, nombre')
            .single()

        return { data, error }
    }

    // UPDATE - Edit existing finca
    static async updateFinca(id: number, updates: UpdateFincaData) {
        const { data, error } = await supabase
            .from('fincas')
            .update(updates)
            .eq('id', id)
            .select('id, nombre')
            .single()

        return { data, error }
    }

    // DELETE - Remove finca
    static async deleteFinca(id: number) {
        const { data, error } = await supabase
            .from('fincas')
            .delete()
            .eq('id', id)

        return { data, error }
    }
}