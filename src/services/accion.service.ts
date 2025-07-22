import { supabase } from '@/lib/supabase'
import { Accion } from '@/types/database'

export interface AccionWithRelations extends Accion {
    finca_nombre?: string
    bloque_nombre?: string
    variedad_nombre?: string
    cama_nombre?: string
}

export const accionService = {
    // Get all acciones with related finca, bloque, variedad, and cama names
    async getAll(): Promise<AccionWithRelations[]> {
        const { data, error } = await supabase
            .from('acciones')
            .select(`
                *,
                cama:cama_id (
                    id,
                    nombre,
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
            .order('created_at', { ascending: false })

        if (error) throw error

        // Transform the data to flatten the relations
        return (data || []).map((accion: any) => ({
            id: accion.id,
            created_at: accion.created_at,
            finca_nombre: accion.cama?.bloque?.finca?.nombre || 'N/A',
            bloque_nombre: accion.cama?.bloque?.nombre || 'N/A',
            variedad_nombre: accion.cama?.variedad?.nombre || 'N/A',
            cama_nombre: accion.cama?.nombre || 'N/A',
            produccion_real: accion.produccion_real,
            pinche_apertura: accion.pinche_apertura,
            pinche_sanitario: accion.pinche_sanitario,
            pinche_tierno: accion.pinche_tierno,
            temperatura: accion.temperatura,
            humedad: accion.humedad,
            arveja: accion.arveja,
            garbanzo: accion.garbanzo,
            uva: accion.uva,
            arroz: accion.arroz,
            rayando_color: accion.rayando_color,
            sepalos_abiertos: accion.sepalos_abiertos,
            cosecha: accion.cosecha,
            cama_id: accion.cama_id,
        }))
    },

    // Get a specific accion by ID
    async getAccionById(accionId: number): Promise<Accion | null> {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('id', accionId)
            .single()

        if (error) throw error
        return data
    },

    // Create a new accion for a specific cama
    async createAccionForCama(camaId: number, actionType: string, value: number): Promise<Accion> {
        try {
            // First, get the local cama details
            const { db } = await import('@/lib/dexie')
            const localCama = await db.camas.get(camaId)

            if (!localCama) {
                throw new Error('Cama not found in local database')
            }

            // Find the corresponding cama on the server by bloque_id and nombre
            const { data: serverCama, error: findError } = await supabase
                .from('camas')
                .select('id')
                .eq('bloque_id', localCama.bloque_id)
                .eq('nombre', localCama.nombre)
                .single()

            let serverCamaId: number

            if (findError || !serverCama) {
                // Cama doesn't exist on server, create it
                console.log('Cama not found on server, creating it...')

                const { data: newCama, error: createError } = await supabase
                    .from('camas')
                    .insert({
                        bloque_id: localCama.bloque_id,
                        variedad_id: localCama.variedad_id,
                        nombre: localCama.nombre
                    })
                    .select('id')
                    .single()

                if (createError) throw createError
                serverCamaId = newCama.id
            } else {
                serverCamaId = serverCama.id
            }

            // Check if there's already an entry for today for this cama
            const today = new Date().toISOString().split('T')[0]

            const { data: existingAccion, error: findAccionError } = await supabase
                .from('acciones')
                .select('*')
                .eq('cama_id', serverCamaId)
                .gte('created_at', today)
                .lt('created_at', today + 'T23:59:59.999Z')
                .maybeSingle()

            if (findAccionError && findAccionError.code !== 'PGRST116') {
                // PGRST116 is "not found" which is expected, other errors are real problems
                throw findAccionError
            }

            if (existingAccion) {
                // Update existing entry for today
                console.log(`Updating existing accion for cama ${serverCamaId} with ${actionType}: ${value}`)

                const { data, error } = await supabase
                    .from('acciones')
                    .update({ [actionType]: value })
                    .eq('id', existingAccion.id)
                    .select()
                    .single()

                if (error) throw error
                return data
            } else {
                // Create new entry for today
                console.log(`Creating new accion for cama ${serverCamaId} with ${actionType}: ${value}`)

                const accionData: Partial<Accion> = {
                    cama_id: serverCamaId,
                    [actionType]: value
                }

                const { data, error } = await supabase
                    .from('acciones')
                    .insert(accionData)
                    .select()
                    .single()

                if (error) throw error
                return data
            }

        } catch (error) {
            console.error('Error creating accion:', error)
            throw error
        }
    },

    // Get acciones for a specific cama
    async getAccionesByCama(camaId: number): Promise<Accion[]> {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('cama_id', camaId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    // Get all acciones with related finca, bloque, variedad, and cama names
    async getAllAccionesWithRelations(): Promise<any[]> {
        const { data, error } = await supabase
            .from('acciones')
            .select(`
                *,
                cama:cama_id (
                    id,
                    nombre,
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
            .order('created_at', { ascending: false })

        if (error) throw error

        // Transform the data to flatten the relations
        const transformedData = (data || []).map((accion: any) => ({
            ...accion,
            finca_nombre: accion.cama?.bloque?.finca?.nombre || 'N/A',
            bloque_nombre: accion.cama?.bloque?.nombre || 'N/A',
            variedad_nombre: accion.cama?.variedad?.nombre || 'N/A',
            cama_nombre: accion.cama?.nombre || 'N/A'
        }))

        return transformedData
    },

    // Get today's values for a specific cama
    async getTodaysValuesByCama(camaId: number): Promise<Record<string, number>> {
        try {
            // First, get the local cama details to find the server cama
            const { db } = await import('@/lib/dexie')
            const localCama = await db.camas.get(camaId)

            if (!localCama) {
                return {}
            }

            // Find the corresponding cama on the server by bloque_id and nombre
            const { data: serverCama, error: findError } = await supabase
                .from('camas')
                .select('id')
                .eq('bloque_id', localCama.bloque_id)
                .eq('nombre', localCama.nombre)
                .single()

            if (findError || !serverCama) {
                return {} // No server cama, no values
            }

            const today = new Date().toISOString().split('T')[0]

            const { data: todayAccion, error } = await supabase
                .from('acciones')
                .select('*')
                .eq('cama_id', serverCama.id)
                .gte('created_at', today)
                .lt('created_at', today + 'T23:59:59.999Z')
                .maybeSingle()

            if (error || !todayAccion) {
                return {}
            }

            // Extract non-null values
            const values: Record<string, number> = {}
            const actionColumns = [
                'produccion_real', 'pinche_apertura', 'pinche_sanitario', 'pinche_tierno',
                'temperatura', 'humedad', 'arveja', 'garbanzo', 'uva', 'arroz',
                'rayando_color', 'sepalos_abiertos', 'cosecha'
            ]

            actionColumns.forEach(col => {
                if (todayAccion[col] !== null && todayAccion[col] !== undefined) {
                    values[col] = todayAccion[col]
                }
            })

            return values
        } catch (error) {
            console.error('Error getting today\'s values:', error)
            return {}
        }
    },

    // Get column names for the acciones table
    async getAccionesColumns(): Promise<string[]> {
        try {
            // First get at least one row to examine its structure
            const { data, error } = await supabase
                .from('acciones')
                .select('*')
                .limit(1)

            if (error) throw error

            // If we have data, return the column names
            if (data && data.length > 0) {
                return Object.keys(data[0])
            }

            // If the table is empty, return default column names
            // These match your actual table structure
            return [
                'id',
                'created_at',
                'produccion_real',
                'pinche_apertura',
                'pinche_sanitario',
                'pinche_tierno',
                'temperatura',
                'humedad',
                'arveja',
                'garbanzo',
                'uva',
                'rayando_color',
                'sepalos_abiertos',
                'cosecha',
                'bloque_variedad_id'
            ]
        } catch (err) {
            console.error('Error getting acciones columns:', err)
            // Return default column names as fallback
            return [
                'id',
                'created_at',
                'produccion_real',
                'pinche_apertura',
                'pinche_sanitario',
                'pinche_tierno',
                'temperatura',
                'humedad',
                'arveja',
                'garbanzo',
                'uva',
                'rayando_color',
                'sepalos_abiertos',
                'cosecha',
                'bloque_variedad_id'
            ]
        }
    }
}