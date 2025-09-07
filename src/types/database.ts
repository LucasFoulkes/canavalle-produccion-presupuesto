export interface Usuario {
    id_usuario: number
    creado_en: string
    nombres: string | null
    apellidos: string | null
    rol: string | null
    clave_pin?: string | null
    eliminado_en?: string | null
}

export interface Finca {
    id_finca: number
    nombre: string
    creado_en?: string
    eliminado_en?: string | null
}

export interface Bloque {
    id_bloque: number
    id_finca: number
    nombre?: string | number
    numero_camas?: number | null
    creado_en?: string
    eliminado_en?: string | null
}

export interface Variedad {
    id_variedad: number
    nombre: string
    id_breeder?: number | null
    color?: string | null
    clase_longitud_tallo?: string | null
    cantidad_petalos?: number | null
    nivel_fragancia?: string | null
    resistencia_enfermedades?: string | null
    dias_vida_florero?: number | null
    productividad_anual?: number | null
    grado_calidad?: string | null
    notas?: string | null
    creado_en?: string
    eliminado_en?: string | null
}

export interface Cama {
    id_cama: number
    id_grupo?: number | null
    nombre?: string | null
    largo_metros?: number | null
    ancho_metros?: number | null
    plantas_totales?: number | null
    creado_en?: string
    eliminado_en?: string | null
}

// Breeder removed

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
    _pendingSync?: boolean;
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

export interface FincaWithRelations {
    id_finca: number
    nombre: string
}

export interface BloqueWithVariedades {
    id_bloque: number
    id_finca: number
    nombre: string
}

// New entity: grupo_plantacion groups camas within a bloque
// Deprecated: replaced by GrupoCama naming in backend
export interface GrupoPlantacion {
    // deprecated
    grupo_id: number
    bloque_id?: number
    variedad_id?: number
    fecha_siembra: string
    created_at?: string
    deleted_at?: string | null
    patron?: string | null
    tipo_planta?: string | null
    densidad_plantas_m2?: number | null
}

export interface GrupoCama {
    id_grupo: number
    id_bloque: number
    id_variedad: number
    fecha_siembra: string
    estado?: string | null
    patron?: string | null
    tipo_planta?: string | null
    creado_en?: string
    eliminado_en?: string | null
    numero_camas?: number | null
    total_plantas?: number | null
}

// New tables
// EstadoFenologicoNuevo removed

// MedicionDiaria removed

// New: Observacion (public.observacion)
export interface Observacion {
    // Local PK for offline; server id is id_observacion
    id: number
    id_observacion?: number
    id_cama: number
    ubicacion_seccion?: string | null
    tipo_observacion: string
    cantidad: number
    id_usuario?: number | null
    creado_en?: string
    eliminado_en?: string | null
}

// New: Estado Fenológico Tipo
export interface EstadoFenologicoTipo {
    codigo: string // primary key
    nombre: string
    orden: number
    descripcion?: string | null
    activo?: boolean | null
    created_at?: string
}
