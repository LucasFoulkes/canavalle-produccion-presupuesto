export interface Usuario {
    id: number
    nombres: string
    apellidos: string
    rol: string
    pin: string
}

export interface Finca {
    id: number
    nombre: string
}

export interface Bloque {
    id: number
    finca_id: number
    nombre: string
}

export interface Variedad {
    id: number
    nombre: string
}

export interface Cama {
    id: number
    bloque_id: number
    variedad_id: number
    nombre: string
}

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
    arroz?: number
    rayando_color?: number
    sepalos_abiertos?: number
    cosecha?: number
    cama_id?: number
}

export interface BloqueVariedad {
    id: number
    bloque_id: number
    variedad_id: number
}

export interface EstadoFenologico {
    id: number
    brotacion?: number
    '5CM'?: number
    '15 CM'?: number
    '20 CM'?: number
    'PRIMERA HOJA'?: number
    'ARVEJA'?: number
    'GARBANZO'?: number
    'UVA'?: number
    'RAYANDO COLOR'?: number
    'SEPALOS ABIERTOS'?: number
    'COSECHA'?: number
    bloque_variedad_id?: number
    'ESPIGA'?: number
    'ARROZ'?: number
}

// Supabase response types with relations
export interface FincaWithRelations {
    id: number
    nombre: string
}

export interface BloqueWithVariedades {
    id: number
    finca_id: number
    nombre: string
}
