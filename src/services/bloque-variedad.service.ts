import { supabase } from '@/lib/supabase'

export interface BloqueVariedad {
    id: number
    bloque_id: number
    variedad_id: number
}

export interface CreateBloqueVariedadData {
    bloque_id: number
    variedad_id: number
}

export interface UpdateBloqueVariedadData {
    bloque_id?: number
    variedad_id?: number
}

export interface BloqueVariedadWithNames {
    id: number
    bloque_id: number
    variedad_id: number
    bloque_nombre: string
    variedad_nombre: string
    finca_nombre: string
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

    // READ - Get all bloque_variedad relationships with names
    static async getAllBloqueVariedadesWithNames() {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select(`
                id,
                bloque_id,
                variedad_id,
                bloques!bloque_id (
                    nombre,
                    fincas!finca_id (
                        nombre
                    )
                ),
                variedades!variedad_id (
                    nombre
                )
            `)

        if (error) return { data: null, error }

        // Transform the data to flatten the joined names
        const transformedData = data?.map(item => ({
            id: item.id,
            bloque_id: item.bloque_id,
            variedad_id: item.variedad_id,
            bloque_nombre: (item.bloques as any)?.nombre || 'Sin bloque',
            variedad_nombre: (item.variedades as any)?.nombre || 'Sin variedad',
            finca_nombre: (item.bloques as any)?.fincas?.nombre || 'Sin finca',
        })) || []

        return { data: transformedData, error: null }
    }

    // CREATE - Create new bloque_variedad relationship
    static async createBloqueVariedad(data: CreateBloqueVariedadData) {
        const { data: result, error } = await supabase
            .from('bloque_variedad')
            .insert([data])
            .select('*')
            .single()

        return { data: result, error }
    }

    // UPDATE - Edit existing bloque_variedad relationship
    static async updateBloqueVariedad(id: number, updates: UpdateBloqueVariedadData) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()

        return { data, error }
    }

    // DELETE - Remove bloque_variedad relationship
    static async deleteBloqueVariedad(id: number) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .delete()
            .eq('id', id)

        return { data, error }
    }
}
