import { supabase } from '@/lib/supabase'
import { EstadoFenologico } from '@/types/database'

export type { EstadoFenologico }

export interface EstadoFenologicoWithRelations {
    id: number
    finca_nombre?: string
    bloque_nombre?: string
    variedad_nombre?: string
    brotacion?: number
    '5_cm'?: number
    '15_cm'?: number
    '20_cm'?: number
    primera_hoja?: number
    espiga?: number
    arroz?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    rayando_color?: number
    sepalos_abiertos?: number
    cosecha?: number
}

export const estadosFenologicosService = {
    // Get all estados fenológicos with related finca, bloque, and variedad names
    async getAll(): Promise<EstadoFenologicoWithRelations[]> {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .select(`
                id,
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

        // Transform: Order fields as desired, keep id, exclude bloque_variedad
        return (data || []).map((estado: any) => {
            return {
                id: estado.id,  // Keep for keys/queries
                finca_nombre: estado.bloque_variedad?.bloque?.finca?.nombre || 'N/A',  // First
                bloque_nombre: estado.bloque_variedad?.bloque?.nombre || 'N/A',       // Second
                variedad_nombre: estado.bloque_variedad?.variedad?.nombre || 'N/A',   // Third
                brotacion: estado.brotacion,
                '5_cm': estado['5_cm'],
                '15_cm': estado['15_cm'],
                '20_cm': estado['20_cm'],
                primera_hoja: estado.primera_hoja,
                espiga: estado.espiga,
                arroz: estado.arroz,
                arveja: estado.arveja,
                garbanzo: estado.garbanzo,
                uva: estado.uva,
                rayando_color: estado.rayando_color,
                sepalos_abiertos: estado.sepalos_abiertos,
                cosecha: estado.cosecha,
            };
        })
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

    // Delete a estado fenológico
    async deleteEstadoFenologico(id: number): Promise<void> {
        const { error } = await supabase
            .from('estados_fenologicos')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}