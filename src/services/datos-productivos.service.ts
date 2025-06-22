import { supabase } from '@/lib/supabase'

export interface DatoProductivo {
    id: number
    bloque_variedad_id?: number
    estado?: string
    numero_de_plantas?: number
    numero_de_camas?: number
    area?: number
    pdn_ideal_m2_ano?: number
    pdn_ideal_semana?: number
    ciclo?: number
    ciclo_sema?: number
    densidad?: number
    porcentaje_deciegos?: number
}

export interface CreateDatoProductivoData {
    bloque_variedad_id?: number
    estado?: string
    numero_de_plantas?: number
    numero_de_camas?: number
    area?: number
    pdn_ideal_m2_ano?: number
    pdn_ideal_semana?: number
    ciclo?: number
    ciclo_sema?: number
    densidad?: number
    porcentaje_deciegos?: number
}

export interface UpdateDatoProductivoData {
    bloque_variedad_id?: number
    estado?: string
    numero_de_plantas?: number
    numero_de_camas?: number
    area?: number
    pdn_ideal_m2_ano?: number
    pdn_ideal_semana?: number
    ciclo?: number
    ciclo_sema?: number
    densidad?: number
    porcentaje_deciegos?: number
}

export class DatosProductivosService {
    // READ - Get all datos productivos
    static async getAllDatosProductivos() {
        const { data, error } = await supabase
            .from('datos_productivos')
            .select('*')
            .order('id', { ascending: true })

        return { data, error }
    }

    // READ - Get dato productivo by ID
    static async getDatoProductivoById(id: number) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .select('*')
            .eq('id', id)
            .single()

        return { data, error }
    }

    // CREATE - Add new dato productivo
    static async createDatoProductivo(datoData: CreateDatoProductivoData) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .insert(datoData)
            .select('*')
            .single()

        return { data, error }
    }

    // UPDATE - Edit existing dato productivo
    static async updateDatoProductivo(id: number, updates: UpdateDatoProductivoData) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()

        return { data, error }
    }

    // DELETE - Remove dato productivo
    static async deleteDatoProductivo(id: number) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .delete()
            .eq('id', id)

        return { data, error }
    }
}
