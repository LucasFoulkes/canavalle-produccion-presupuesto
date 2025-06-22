import { supabase } from '@/lib/supabase'

export interface EstadoFenologico {
    id: number
    brotacion?: number
    "5CM"?: number
    "15 CM"?: number
    "20 CM"?: number
    "PRIMERA HOJA"?: number
    "ARVEJA"?: number
    "GARBANZO"?: number
    "UVA"?: number
    "RAYANDO COLOR"?: number
    "SEPALOS ABIERTOS"?: number
    "COSECHA"?: number
    "TOTAL DIAS CICLO"?: number
    bloque_variedad_id?: number
    "ESPIGA"?: number
    "ARROZ"?: number
}

export interface CreateEstadoFenologicoData {
    brotacion?: number
    "5CM"?: number
    "15 CM"?: number
    "20 CM"?: number
    "PRIMERA HOJA"?: number
    "ARVEJA"?: number
    "GARBANZO"?: number
    "UVA"?: number
    "RAYANDO COLOR"?: number
    "SEPALOS ABIERTOS"?: number
    "COSECHA"?: number
    "TOTAL DIAS CICLO"?: number
    bloque_variedad_id?: number
    "ESPIGA"?: number
    "ARROZ"?: number
}

export interface UpdateEstadoFenologicoData {
    brotacion?: number
    "5CM"?: number
    "15 CM"?: number
    "20 CM"?: number
    "PRIMERA HOJA"?: number
    "ARVEJA"?: number
    "GARBANZO"?: number
    "UVA"?: number
    "RAYANDO COLOR"?: number
    "SEPALOS ABIERTOS"?: number
    "COSECHA"?: number
    "TOTAL DIAS CICLO"?: number
    bloque_variedad_id?: number
    "ESPIGA"?: number
    "ARROZ"?: number
}

export class EstadosFenologicosService {    // READ - Get all estados fenologicos
    static async getAllEstadosFenologicos() {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .select('*')
            .order('id', { ascending: true })

        return { data, error }
    }

    // READ - Get estado fenologico by ID
    static async getEstadoFenologicoById(id: number) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .select('*')
            .eq('id', id)
            .single()

        return { data, error }
    }    // CREATE - Add new estado fenologico
    static async createEstadoFenologico(estadoData: CreateEstadoFenologicoData) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .insert(estadoData)
            .select('*')
            .single()

        return { data, error }
    }

    // UPDATE - Edit existing estado fenologico
    static async updateEstadoFenologico(id: number, updates: UpdateEstadoFenologicoData) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()

        return { data, error }
    }

    // DELETE - Remove estado fenologico
    static async deleteEstadoFenologico(id: number) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .delete()
            .eq('id', id)

        return { data, error }
    }
}
