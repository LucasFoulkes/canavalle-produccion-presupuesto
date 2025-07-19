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
    bloque_variedad_id: number
    created_at: string
}

export interface BloqueVariedad {
    id: number
    bloque_id: number
    variedad_id: number
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
