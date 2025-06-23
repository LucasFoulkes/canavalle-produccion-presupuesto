// Centralized API service for all resources
import { supabase } from '@/lib/supabase'

// --- ACCIONES ---
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
export interface UpdateAccionData extends CreateAccionData { }

export class AccionesService {
    static async getAllAcciones() {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .order('created_at', { ascending: false })
        return { data, error }
    }
    static async getAccionById(id: number) {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('id', id)
            .single()
        return { data, error }
    }
    static async createAccion(accionData: CreateAccionData) {
        const { data, error } = await supabase
            .from('acciones')
            .insert([accionData])
            .select('*')
            .single()
        return { data, error }
    }
    static async updateAccion(id: number, updates: UpdateAccionData) {
        const { data, error } = await supabase
            .from('acciones')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()
        return { data, error }
    }
    static async deleteAccion(id: number) {
        const { data, error } = await supabase
            .from('acciones')
            .delete()
            .eq('id', id)
        return { data, error }
    }
    static async getAccionesByBloqueVariedadId(bloqueVariedadId: number) {
        const { data, error } = await supabase
            .from('acciones')
            .select('*')
            .eq('bloque_variedad_id', bloqueVariedadId)
            .order('created_at', { ascending: false })
        return { data, error }
    }
    static async getColumns() {
        // This is a placeholder. Adjust as needed for your schema.
        // If you have a metadata table or want to return static columns:
        return {
            data: [
                'id', 'created_at', 'produccion_real', 'pinche_apertura', 'pinche_sanitario', 'pinche_tierno',
                'temperatura', 'humedad', 'arveja', 'garbanzo', 'uva', 'bloque_variedad_id'
            ], error: null
        }
    }
}

// --- AUTH ---
export interface Usuario {
    id: number
    pin: string
}
export class AuthService {
    static async authenticateWithPin(pin: string): Promise<{ data: Usuario | null; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('pin', pin)
                .single()
            if (error) {
                if (error.code === 'PGRST116') {
                    return { data: null, error: 'PIN no encontrado' }
                }
                return { data: null, error: error.message }
            }
            return { data, error: null }
        } catch (err) {
            return { data: null, error: 'Error de autenticación' }
        }
    }
}

// --- BLOQUE VARIEDAD ---
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
    static async getAllBloqueVariedades() {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select('*')
        return { data, error }
    }
    static async getBloqueVariedadByIds(bloqueId: number, variedadId: number) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select('*')
            .eq('bloque_id', bloqueId)
            .eq('variedad_id', variedadId)
            .single()
        return { data, error }
    }
    static async getOrCreateBloqueVariedad(bloqueId: number, variedadId: number) {
        const { data: existing, error: getError } = await this.getBloqueVariedadByIds(bloqueId, variedadId)
        if (!getError && existing) return { data: existing, error: null }
        const { data, error } = await supabase
            .from('bloque_variedad')
            .insert([{ bloque_id: bloqueId, variedad_id: variedadId }])
            .select('*')
            .single()
        return { data, error }
    }
    static async getBloqueVariedadById(id: number) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select('*')
            .eq('id', id)
            .single()
        return { data, error }
    }
    static async getAllBloqueVariedadesWithNames() {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select(`id, bloque_id, variedad_id, bloques!bloque_id (nombre, fincas!finca_id (nombre)), variedades!variedad_id (nombre)`)
        return { data, error }
    }
}

// --- BLOQUES ---
export interface Bloque {
    id: number
    nombre: string
    finca_id?: number
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
    static async getAllBloques() {
        const { data, error } = await supabase
            .from('bloques')
            .select('id, nombre, finca_id')
        return { data, error }
    }
    static async getBloqueById(id: number) {
        const { data, error } = await supabase
            .from('bloques')
            .select('id, nombre, finca_id')
            .eq('id', id)
            .single()
        return { data, error }
    }
    static async createBloque(bloqueData: CreateBloqueData) {
        const { data, error } = await supabase
            .from('bloques')
            .insert([bloqueData])
            .select('id, nombre')
            .single()
        return { data, error }
    }
    static async updateBloque(id: number, updates: UpdateBloqueData) {
        const { data, error } = await supabase
            .from('bloques')
            .update(updates)
            .eq('id', id)
            .select('id, nombre, finca_id')
            .single()
        return { data, error }
    }
    static async deleteBloque(id: number) {
        const { data, error } = await supabase
            .from('bloques')
            .delete()
            .eq('id', id)
        return { data, error }
    }
    static async getBloquesByFincaId(fincaId: number) {
        const { data, error } = await supabase
            .from('bloques')
            .select('id, nombre, finca_id')
            .eq('finca_id', fincaId)
        return { data, error }
    }
    static async getAllBloquesWithFincas() {
        const { data, error } = await supabase
            .from('bloques')
            .select(`id, nombre, finca_id, fincas!finca_id (nombre)`)
        return { data, error }
    }
}

// --- DATOS PRODUCTIVOS ---
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
    static async getAllDatosProductivos() {
        const { data, error } = await supabase
            .from('datos_productivos')
            .select('*')
            .order('id', { ascending: true })
        return { data, error }
    }
    static async getDatoProductivoById(id: number) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .select('*')
            .eq('id', id)
            .single()
        return { data, error }
    }
    static async createDatoProductivo(datoData: CreateDatoProductivoData) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .insert(datoData)
            .select('*')
            .single()
        return { data, error }
    }
    static async updateDatoProductivo(id: number, updates: UpdateDatoProductivoData) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()
        return { data, error }
    }
    static async deleteDatoProductivo(id: number) {
        const { data, error } = await supabase
            .from('datos_productivos')
            .delete()
            .eq('id', id)
        return { data, error }
    }
}

// --- ESTADOS FENOLOGICOS ---
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
export class EstadosFenologicosService {
    static async getAllEstadosFenologicos() {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .select('*')
            .order('id', { ascending: true })
        return { data, error }
    }
    static async getEstadoFenologicoById(id: number) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .select('*')
            .eq('id', id)
            .single()
        return { data, error }
    }
    static async createEstadoFenologico(estadoData: CreateEstadoFenologicoData) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .insert(estadoData)
            .select('*')
            .single()
        return { data, error }
    }
    static async updateEstadoFenologico(id: number, updates: UpdateEstadoFenologicoData) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single()
        return { data, error }
    }
    static async deleteEstadoFenologico(id: number) {
        const { data, error } = await supabase
            .from('estados_fenologicos')
            .delete()
            .eq('id', id)
        return { data, error }
    }
}

// --- FINCAS ---
export interface Finca {
    id: number
    nombre: string
}
export interface CreateFincaData {
    nombre: string
}
export interface UpdateFincaData {
    nombre?: string
}
export class FincasService {
    static async getAllFincas() {
        const { data, error } = await supabase
            .from('fincas')
            .select('id, nombre')
        return { data, error }
    }
    static async getFincaById(id: number) {
        const { data, error } = await supabase
            .from('fincas')
            .select('id, nombre')
            .eq('id', id)
            .single()
        return { data, error }
    }
    static async createFinca(fincaData: CreateFincaData) {
        const { data, error } = await supabase
            .from('fincas')
            .insert([fincaData])
            .select('id, nombre')
            .single()
        return { data, error }
    }
    static async updateFinca(id: number, updates: UpdateFincaData) {
        const { data, error } = await supabase
            .from('fincas')
            .update(updates)
            .eq('id', id)
            .select('id, nombre')
            .single()
        return { data, error }
    }
    static async deleteFinca(id: number) {
        const { data, error } = await supabase
            .from('fincas')
            .delete()
            .eq('id', id)
        return { data, error }
    }
}

// --- VARIEDADES ---
export interface Variedad {
    id: number
    nombre: string
}
export interface CreateVariedadData {
    nombre: string
}
export interface UpdateVariedadData {
    nombre?: string
}
export class VariedadesService {
    static async getAllVariedades() {
        const { data, error } = await supabase
            .from('variedades')
            .select('id, nombre')
        return { data, error }
    }
    static async getVariedadById(id: number) {
        const { data, error } = await supabase
            .from('variedades')
            .select('id, nombre')
            .eq('id', id)
            .single()
        return { data, error }
    }
    static async createVariedad(variedadData: CreateVariedadData) {
        const { data, error } = await supabase
            .from('variedades')
            .insert([variedadData])
            .select('id, nombre')
            .single()
        return { data, error }
    }
    static async updateVariedad(id: number, updates: UpdateVariedadData) {
        const { data, error } = await supabase
            .from('variedades')
            .update(updates)
            .eq('id', id)
            .select('id, nombre')
            .single()
        return { data, error }
    }
    static async deleteVariedad(id: number) {
        const { data, error } = await supabase
            .from('variedades')
            .delete()
            .eq('id', id)
        return { data, error }
    }
    static async getVariedadesByBloqueId(bloqueId: number) {
        const { data, error } = await supabase
            .from('bloque_variedad')
            .select(`variedades (id, nombre)`)
            .eq('bloque_id', bloqueId)
        if (error) return { data: [], error }
        const variedades = data
            .map(item => item.variedades)
            .filter(Boolean)
            .flat() as Variedad[]
        return { data: variedades, error: null }
    }
}
