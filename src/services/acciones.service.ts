import { supabase } from '@/lib/supabase'

export interface Acciones {
    id: number
}

export interface CreateAccionesData {
    nombre: string
}

export interface UpdateAccionesData {
    nombre?: string
}

export class AccionesService {    // GETCOLUMNS - Get column names for a table
    static async getColumns() {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .limit(1)

        if (error) return { data: [], error }

        console.log({ data, error })
        const columns = data.length ? Object.keys(data[0]) : []
        return { data: columns, error: null }
    }
}