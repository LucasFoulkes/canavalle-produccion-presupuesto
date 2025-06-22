import { supabase } from '@/lib/supabase'

export interface Accion {
    id: number
    created_at: string
    produccion_real?: number
    pinche_apertura?: number
    pinche_sanitario?: number
    pinche_tierno?: number
    temperatura?: number
    humedad?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    bloque_variedad_id?: number
}

export interface CreateAccionData {
    produccion_real?: number
    pinche_apertura?: number
    pinche_sanitario?: number
    pinche_tierno?: number
    temperatura?: number
    humedad?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    bloque_variedad_id?: number
}

export interface UpdateAccionData {
    produccion_real?: number
    pinche_apertura?: number
    pinche_sanitario?: number
    pinche_tierno?: number
    temperatura?: number
    humedad?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    bloque_variedad_id?: number
}

export class AccionesService {
    // READ - Get all acciones
    static async getAllAcciones() {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .order('created_at', { ascending: false })

        return { data, error }
    }

    // READ - Get single accion
    static async getAccionById(id: number) {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('id', id)
            .single()

        return { data, error }
    }

    // CREATE - Add new accion
    static async createAccion(accionData: CreateAccionData) {
        const { data, error } = await supabase
            .from('acciones')
            .insert([accionData])
            .select('*')
            .single()

        return { data, error }
    }

    // UPDATE - Edit existing accion
    static async updateAccion(id: number, updates: UpdateAccionData) {
        const { data, error } = await supabase
            .from('acciones')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()

        return { data, error }
    }

    // DELETE - Remove accion
    static async deleteAccion(id: number) {
        const { data, error } = await supabase
            .from('acciones')
            .delete()
            .eq('id', id)

        return { data, error }
    }

    // READ - Get acciones by bloque_variedad_id
    static async getAccionesByBloqueVariedadId(bloqueVariedadId: number) {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('bloque_variedad_id', bloqueVariedadId)
            .order('created_at', { ascending: false })

        return { data, error }
    }

    // READ - Get latest value for specific bloque_variedad and action column
    static async getLatestActionValue(bloqueVariedadId: number, actionColumn: string) {
        const { data, error } = await supabase
            .from('acciones')
            .select(`id, ${actionColumn}, created_at`)
            .eq('bloque_variedad_id', bloqueVariedadId)
            .not(actionColumn, 'is', null) // Only get records where this column has a value
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            // If no records found, return 0 as default
            if (error.code === 'PGRST116') {
                return { data: { value: 0 }, error: null }
            }
            return { data: null, error }
        }

        return {
            data: { value: (data as any)[actionColumn] || 0 },
            error: null
        }
    }

    // CREATE OR UPDATE - Create new entry or update today's entry if it exists
    static async createOrUpdateTodayAccion(
        bloqueVariedadId: number,
        actionColumn: string,
        value: number) {
        console.log('🔍 Looking for entry with bloque_variedad_id:', bloqueVariedadId, 'created today')

        // Get today's date (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0]
        console.log('📅 Today is:', today)

        // Check if there's an entry with this bloque_variedad_id created today
        const { data: todayEntries, error: checkError } = await supabase
            .from('acciones')
            .select('*')
            .eq('bloque_variedad_id', bloqueVariedadId)
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`)

        console.log('📋 Found entries for today:', todayEntries?.length || 0, 'entries')

        if (checkError) {
            console.error('❌ Error checking entries:', checkError)
            return { data: null, error: checkError }
        }

        if (todayEntries && todayEntries.length > 0) {
            // Update the first entry found
            const entryToUpdate = todayEntries[0]
            console.log('🔄 Updating existing entry ID:', entryToUpdate.id)

            const { data, error } = await supabase
                .from('acciones')
                .update({ [actionColumn]: value })
                .eq('id', entryToUpdate.id)
                .select('*')
                .single()

            console.log('✅ Update result:', data ? 'SUCCESS' : 'FAILED', error || '')
            return { data, error }
        } else {
            // Create new entry
            console.log('➕ Creating new entry')

            const { data, error } = await supabase
                .from('acciones')
                .insert([{
                    bloque_variedad_id: bloqueVariedadId,
                    [actionColumn]: value
                }])
                .select('*')
                .single()

            console.log('✅ Create result:', data ? 'SUCCESS' : 'FAILED', error || '')
            return { data, error }
        }
    }

    // GETCOLUMNS - Get column names for a table (keeping existing functionality)
    static async getColumns() {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .limit(1)

        if (error) return { data: [], error }

        const columns = data.length ? Object.keys(data[0]) : []
        return { data: columns, error: null }
    }
}