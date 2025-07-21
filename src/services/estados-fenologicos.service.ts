import { supabase } from '@/lib/supabase'
import { EstadoFenologico } from '@/types/database'

export type { EstadoFenologico }

// Extended interface for display with related data
export interface EstadoFenologicoWithRelations extends EstadoFenologico {
    finca_nombre?: string
    bloque_nombre?: string
    variedad_nombre?: string
}

export const estadosFenologicosService = {
    // Get all estados fenológicos with related finca, bloque, and variedad names
    async getAllEstadosFenologicos(): Promise<EstadoFenologicoWithRelations[]> {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .select(`
                *,
                bloque_variedad:bloque_variedad_id (
                    bloque:bloque_id (
                        id,
                        nombre,
                        finca:finca_id (
                            id,
                            nombre
                        )
                    ),
                    variedad:variedad_id (
                        id,
                        nombre
                    )
                )
            `)
            .order('id', { ascending: true })

        if (error) throw error

        // Transform the data to flatten the relations
        const transformedData = (data || []).map((estado: any) => ({
            ...estado,
            finca_nombre: estado.bloque_variedad?.bloque?.finca?.nombre || 'N/A',
            bloque_nombre: estado.bloque_variedad?.bloque?.nombre || 'N/A',
            variedad_nombre: estado.bloque_variedad?.variedad?.nombre || 'N/A'
        }))

        return transformedData
    },

    // Get a specific estado fenológico by ID
    async getEstadoFenologicoById(id: number): Promise<EstadoFenologico | null> {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    // Update a specific estado fenológico
    async updateEstadoFenologico(id: number, updates: Partial<EstadoFenologico>): Promise<EstadoFenologico> {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    // Create a new estado fenológico
    async createEstadoFenologico(estado: Omit<EstadoFenologico, 'id'>): Promise<EstadoFenologico> {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .insert(estado)
            .select()
            .single()

        if (error) throw error
        return data
    },

    // Delete a estado fenológico
    async deleteEstadoFenologico(id: number): Promise<void> {
        const { error } = await supabase
            .from('estados_fenologicos')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}