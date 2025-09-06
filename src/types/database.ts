export interface Usuario {
    id: number
    // New backend primary key alias
    id_usuario?: number
    created_at: string
    creado_en?: string // new backend timestamp name
    nombres: string | null
    apellidos: string | null
    rol: string | null
    pin?: string | null // legacy
    clave_pin?: string | null // new backend field
    deleted_at?: string | null
    eliminado_en?: string | null
}

export interface Finca {
    id: number
    id_finca?: number
    nombre: string
    finca_id?: number // legacy alias
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
}

export interface Bloque {
    id: number
    id_bloque?: number
    finca_id: number
    id_finca?: number // alt from backend if joined
    // Backend may now provide either 'codigo' (legacy) or 'nombre'.
    codigo?: string
    nombre?: string | number
    bloque_id?: number // legacy alt key
    numero_camas?: number | null
    altitud_msnm?: number | null
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
}

export interface Variedad {
    id: number
    id_variedad?: number
    nombre: string
    variedad_id?: number // legacy
    id_obtentor?: number | null
    breeder_id?: number | null // legacy
    color?: string | null
    clase_longitud_tallo?: string | null
    stem_length_class?: string | null // legacy english mapping
    cantidad_petalos?: number | null
    petal_count?: number | null
    nivel_fragancia?: string | null
    fragrance_level?: string | null
    resistencia_enfermedades?: string | null
    disease_resistance?: string | null
    dias_vida_florero?: number | null
    vase_life_days?: number | null
    productividad_anual?: number | null
    annual_productivity?: number | null
    grado_calidad?: string | null
    quality_grade?: string | null
    notas?: string | null
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
}

export interface Cama {
    id: number
    id_cama?: number
    bloque_id: number
    id_bloque?: number
    variedad_id?: number | null // legacy direct variety link if any
    nombre?: string | null
    area?: number | null
    area_m2?: number | null
    cama_id?: number // legacy alt key
    largo_metros?: number | null
    plantas_totales?: number | null
    grupo_id?: number | null
    id_grupo?: number | null
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
}

export interface Breeder {
    id: number
    id_obtentor?: number
    breeder_id?: number // legacy
    nombre: string
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
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
    id: number
    nombre: string
}

export interface BloqueWithVariedades {
    id: number
    finca_id: number
    nombre: string
}

// New entity: grupo_plantacion groups camas within a bloque
// Deprecated: replaced by GrupoCama naming in backend
export interface GrupoPlantacion {
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
    grupo_id: number
    id_grupo?: number
    bloque_id?: number
    id_bloque?: number
    variedad_id?: number
    id_variedad?: number
    fecha_siembra: string
    estado?: string | null
    patron?: string | null
    tipo_planta?: string | null
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
    num_camas?: number | null
    numero_camas?: number | null
    total_plantas?: number | null
    total_area?: number | null
    area_total?: number | null
}

// New tables
export interface EstadoFenologicoNuevo {
    id: number
    id_estado_fenologico?: number
    id_finca?: number | null
    id_bloque?: number | null
    id_variedad?: number | null
    id_usuario?: number | null
    // Day count fields (dynamic, keep index signature optional)
    [key: string]: any
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
}

export interface MedicionDiaria {
    id: number
    id_medicion?: number
    id_cama: number
    ubicacion_seccion?: string | null
    posicion_metros?: number | null
    fecha_medicion?: string | null
    hora_medicion?: string | null
    estado_fenologico?: string | null
    cantidad?: number | null
    id_usuario?: number | null
    observaciones?: string | null
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
    eliminado_en?: string | null
}

// New: Observacion (public.observacion)
export interface Observacion {
    id: number // backend id_observacion copied to id
    id_observacion?: number
    id_cama: number
    ubicacion_seccion?: string | null
    fecha_observacion?: string | null
    hora_observacion?: string | null
    estado_fenologico: string
    cantidad: number
    id_usuario?: number | null
    created_at?: string
    creado_en?: string
    deleted_at?: string | null
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