import { supabase } from '@/lib/supabase'
import { Finca, Bloque, Variedad, Usuario, Accion } from '@/types/database'

// Type definitions for nested Supabase queries
interface BloqueVariedadWithAcciones {
    id: number
    acciones?: Array<{ id: number; created_at: string }>
}

interface BloqueWithRelations extends Bloque {
    bloque_variedad?: BloqueVariedadWithAcciones[]
}

interface FincaWithRelations extends Finca {
    bloques?: BloqueWithRelations[]
}

interface BloqueVariedadWithVariedad {
    id: number
    variedad: { id: number; nombre: string }
    acciones?: Array<{ id: number; created_at: string }>
}

interface BloqueWithVariedades extends Bloque {
    bloque_variedad?: BloqueVariedadWithVariedad[]
}

// Export interfaces for components
export interface FincaWithStats extends Finca {
    blockCount: number
    hasTodayData: boolean
}

export interface BloqueWithStats extends Bloque {
    varietyCount: number
    hasTodayData: boolean
}

export interface VariedadWithStats extends Variedad {
    hasTodayData: boolean
}

// Custom error types for better error handling
export class DataServiceError extends Error {
    constructor(message: string, public code?: string, public originalError?: any) {
        super(message)
        this.name = 'DataServiceError'
    }
}

// Utility functions
const getTodayString = (): string => new Date().toISOString().split('T')[0]

const hasDataForDate = (
    acciones: Array<{ id: number; created_at: string }> | undefined,
    dateString: string
): boolean => {
    return acciones?.some(accion => accion.created_at.startsWith(dateString)) || false
}

// Helper function to get bloque_variedad relationship ID
const getBloqueVariedadId = async (bloqueId: number, variedadId: number): Promise<number> => {
    const { data: bloqueVariedad, error } = await supabase
        .from('bloque_variedad')
        .select('id')
        .eq('bloque_id', bloqueId)
        .eq('variedad_id', variedadId)
        .single()

    if (error || !bloqueVariedad) {
        throw new DataServiceError('Bloque-Variedad relationship not found', 'RELATION_NOT_FOUND', error)
    }

    return bloqueVariedad.id
}



export const dataService = {
    // Authentication
    async authenticateWithPin(pin: string): Promise<Usuario | null> {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('pin', pin)
                .single()

            if (error) {
                console.warn('Authentication failed:', error.message)
                return null
            }
            return data
        } catch (error) {
            console.error('Authentication error:', error)
            return null
        }
    },

    // Get all fincas with stats in one query
    async getFincasWithStats(): Promise<FincaWithStats[]> {
        const today = getTodayString()

        const { data: fincas, error } = await supabase
            .from('fincas')
            .select(`
        *,
        bloques:bloques(
          id,
          bloque_variedad:bloque_variedad(
            id,
            acciones:acciones(id, created_at)
          )
        )
      `)

        if (error) throw new DataServiceError('Failed to fetch fincas', 'FETCH_FINCAS_ERROR', error)

        return (fincas as FincaWithRelations[] || []).map((finca: FincaWithRelations) => {
            const blockCount = finca.bloques?.length || 0
            const hasTodayData = finca.bloques?.some((bloque: BloqueWithRelations) =>
                bloque.bloque_variedad?.some((bv: BloqueVariedadWithAcciones) =>
                    hasDataForDate(bv.acciones, today)
                )
            ) || false

            return {
                id: finca.id,
                nombre: finca.nombre,
                blockCount,
                hasTodayData
            }
        })
    },

    // Get bloques for a finca with stats
    async getBloquesWithStats(fincaId: number): Promise<BloqueWithStats[]> {
        const today = getTodayString()

        const { data: bloques, error } = await supabase
            .from('bloques')
            .select(`
        *,
        bloque_variedad:bloque_variedad(
          id,
          variedad:variedad_id(id, nombre),
          acciones:acciones(id, created_at)
        )
      `)
            .eq('finca_id', fincaId)

        if (error) throw new DataServiceError('Failed to fetch bloques', 'FETCH_BLOQUES_ERROR', error)

        return (bloques as BloqueWithVariedades[] || []).map((bloque: BloqueWithVariedades) => {
            const varietyCount = bloque.bloque_variedad?.length || 0
            const hasTodayData = bloque.bloque_variedad?.some((bv: BloqueVariedadWithVariedad) =>
                hasDataForDate(bv.acciones, today)
            ) || false

            return {
                id: bloque.id,
                finca_id: bloque.finca_id,
                nombre: bloque.nombre,
                varietyCount,
                hasTodayData
            }
        })
    },

    // Get varieties for a bloque with stats
    async getVariedadesWithStats(bloqueId: number): Promise<VariedadWithStats[]> {
        const today = getTodayString()

        const { data: bloqueVariedades, error } = await supabase
            .from('bloque_variedad')
            .select(`
        variedad:variedad_id(*),
        acciones:acciones(id, created_at)
      `)
            .eq('bloque_id', bloqueId)

        if (error) throw new DataServiceError('Failed to fetch varieties', 'FETCH_VARIETIES_ERROR', error)

        return (bloqueVariedades || []).map((bv: any) => {
            const hasTodayData = hasDataForDate(bv.acciones, today)

            return {
                id: bv.variedad.id,
                nombre: bv.variedad.nombre,
                hasTodayData
            }
        })
    },

    // Get actions for a specific bloque-variedad
    async getAcciones(bloqueId: number, variedadId: number): Promise<Accion[]> {
        try {
            const bloqueVariedadId = await getBloqueVariedadId(bloqueId, variedadId)

            const { data: acciones, error } = await supabase
                .from('acciones')
                .select('*')
                .eq('bloque_variedad_id', bloqueVariedadId)
                .order('created_at', { ascending: false })

            if (error) throw new DataServiceError('Failed to fetch acciones', 'FETCH_ACCIONES_ERROR', error)
            return acciones || []
        } catch (error) {
            if (error instanceof DataServiceError) throw error
            throw new DataServiceError('Unexpected error fetching acciones', 'UNKNOWN_ERROR', error)
        }
    },

    // Get action columns
    async getActionColumns(): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('acciones')
                .select('*')
                .limit(1)

            if (error) throw error

            if (data && data.length > 0) {
                return Object.keys(data[0]).filter(col =>
                    !['id', 'created_at', 'updated_at', 'bloque_variedad_id'].includes(col)
                )
            }

            // Default columns if table is empty
            return [
                'produccion_real', 'pinche_apertura', 'pinche_sanitario', 'pinche_tierno',
                'temperatura', 'humedad', 'arveja', 'garbanzo', 'uva', 'arroz',
                'rayando_color', 'sepalos_abiertos', 'cosecha'
            ]
        } catch (err) {
            console.error('Error getting action columns:', err)
            return [
                'produccion_real', 'pinche_apertura', 'pinche_sanitario', 'pinche_tierno',
                'temperatura', 'humedad', 'arveja', 'garbanzo', 'uva', 'arroz',
                'rayando_color', 'sepalos_abiertos', 'cosecha'
            ]
        }
    },

    // Get today's existing values for a variety
    async getTodaysValues(bloqueId: number, variedadId: number): Promise<Record<string, number>> {
        try {
            const bloqueVariedadId = await getBloqueVariedadId(bloqueId, variedadId)
            const today = getTodayString()

            const { data: existingEntry } = await supabase
                .from('acciones')
                .select('*')
                .eq('bloque_variedad_id', bloqueVariedadId)
                .gte('created_at', today)
                .lt('created_at', today + 'T23:59:59.999Z')
                .maybeSingle()

            if (!existingEntry) return {}

            const values: Record<string, number> = {}
            const columns = await this.getActionColumns()

            columns.forEach(col => {
                if (existingEntry[col] !== null && existingEntry[col] !== undefined) {
                    values[col] = existingEntry[col]
                }
            })

            return values
        } catch (error) {
            console.error('Error getting today\'s values:', error)
            return {}
        }
    },

    // Save action value
    async saveActionValue(bloqueId: number, variedadId: number, column: string, value: number): Promise<void> {
        try {
            const bloqueVariedadId = await getBloqueVariedadId(bloqueId, variedadId)
            const today = getTodayString()

            // Check if entry exists for today
            const { data: existingEntry } = await supabase
                .from('acciones')
                .select('*')
                .eq('bloque_variedad_id', bloqueVariedadId)
                .gte('created_at', today)
                .lt('created_at', today + 'T23:59:59.999Z')
                .maybeSingle()

            if (existingEntry) {
                // Update existing entry
                const { error } = await supabase
                    .from('acciones')
                    .update({ [column]: value })
                    .eq('id', existingEntry.id)

                if (error) throw new DataServiceError('Failed to update action value', 'UPDATE_ACTION_ERROR', error)
            } else {
                // Create new entry
                const { error } = await supabase
                    .from('acciones')
                    .insert({
                        [column]: value,
                        bloque_variedad_id: bloqueVariedadId
                    })

                if (error) throw new DataServiceError('Failed to create action value', 'CREATE_ACTION_ERROR', error)
            }
        } catch (error) {
            if (error instanceof DataServiceError) throw error
            throw new DataServiceError('Unexpected error saving action value', 'UNKNOWN_ERROR', error)
        }
    },

    // Create new action
    async createAccion(bloqueId: number, variedadId: number, accionData: Partial<Accion>): Promise<Accion> {
        try {
            const bloqueVariedadId = await getBloqueVariedadId(bloqueId, variedadId)

            const { data, error } = await supabase
                .from('acciones')
                .insert({
                    ...accionData,
                    bloque_variedad_id: bloqueVariedadId
                })
                .select()
                .single()

            if (error) throw new DataServiceError('Failed to create accion', 'CREATE_ACCION_ERROR', error)
            return data
        } catch (error) {
            if (error instanceof DataServiceError) throw error
            throw new DataServiceError('Unexpected error creating accion', 'UNKNOWN_ERROR', error)
        }
    }
}