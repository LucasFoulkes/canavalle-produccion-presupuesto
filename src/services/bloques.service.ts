import { supabase } from '@/lib/supabase'

export interface Bloque {
    id: number
    nombre: string
    finca_id?: number // Optional for nested blocks
}

export interface CreateBloqueData {
    nombre: string
}

export interface UpdateBloqueData {
    nombre?: string
}

export interface BloqueWithFinca {
    id: number
    nombre: string
    finca_id: number
    finca_nombre: string
}

export class BloquesService {
    // READ - Get all fincas
    static async getAllBloques() {
        const { data, error } = await supabase
            .from('bloques')
            .select('id, nombre, finca_id')

        return { data, error }
    }

    // READ - Get single finca
    static async getBloqueById(id: number) {
        const { data, error } = await supabase
            .from('bloques')
            .select('id, nombre, finca_id')
            .eq('id', id)
            .single()

        return { data, error }
    }

    // CREATE - Add new finca
    static async createBloque(bloqueData: CreateBloqueData) {
        const { data, error } = await supabase
            .from('bloques')
            .insert([bloqueData])
            .select('id, nombre')
            .single()

        return { data, error }
    }

    // UPDATE - Edit existing finca
    static async updateBloque(id: number, updates: UpdateBloqueData) {
        const { data, error } = await supabase
            .from('bloques')
            .update(updates)
            .eq('id', id)
            .select('id, nombre, finca_id')
            .single()

        return { data, error }
    }

    // DELETE - Remove finca
    static async deleteBloque(id: number) {
        const { data, error } = await supabase
            .from('bloques')
            .delete()
            .eq('id', id)

        return { data, error }
    }

    // READ - Get all bloques for a finca
    static async getBloquesByFincaId(fincaId: number) {
        const { data, error } = await supabase
            .from('bloques')
            .select('id, nombre, finca_id')
            .eq('finca_id', fincaId)

        return { data, error }
    }

    // READ - Get all bloques with finca names
    static async getAllBloquesWithFincas() {
        const { data, error } = await supabase
            .from('bloques')
            .select(`
                id, 
                nombre, 
                finca_id,
                fincas!finca_id (
                    nombre
                )
            `)

        if (error) return { data: null, error }

        // Transform the data to flatten the finca name
        const transformedData = data?.map(bloque => ({
            id: bloque.id,
            nombre: bloque.nombre,
            finca_id: bloque.finca_id,
            finca_nombre: (bloque.fincas as any)?.nombre || 'Sin finca'
        })) || []

        return { data: transformedData, error: null }
    }
}