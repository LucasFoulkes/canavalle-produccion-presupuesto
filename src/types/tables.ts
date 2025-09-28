// Shared database table types

export type Finca = {
    id_finca: number
    nombre: string
    creado_en: string | null
    eliminado_en: string | null
}

export type NewFinca = {
    nombre: string
}

export type Bloque = {
    id_bloque: number
    id_finca: number | null
    nombre: string
    creado_en: string | null
    eliminado_en: string | null
    numero_camas: number | null
    area_m2: number | null
}

export type Cama = {
    id_cama: number
    nombre: string
    creado_en: string | null
    eliminado_en: string | null
    // Supabase may serialize numeric as string; allow both
    largo_metros: number | string | null
    plantas_totales: number | null
    id_grupo: number
    ancho_metros: number | null
}

// Additional tables

export type Breeder = {
    id_breeder: number
    nombre: string
    creado_en: string | null
    eliminado_en: string | null
}

export type EstadoFenologicoTipo = {
    codigo: string
    creado_en: string | null
    orden: number | null
}

export type EstadosFenologicos = {
    id_estado_fenologico: number
    id_finca: number | null
    id_bloque: number | null
    id_variedad: number | null
    dias_brotacion: number | null
    dias_cincuenta_mm: number | null
    dias_quince_cm: number | null
    dias_veinte_cm: number | null
    dias_primera_hoja: number | null
    dias_espiga: number | null
    dias_arroz: number | null
    dias_arveja: number | null
    dias_garbanzo: number | null
    dias_uva: number | null
    dias_rayando_color: number | null
    dias_sepalos_abiertos: number | null
    dias_cosecha: number | null
    creado_en: string | null
    eliminado_en: string | null
}

export type GrupoCama = {
    id_grupo: number
    id_bloque: number
    id_variedad: number
    fecha_siembra: string | null // date
    estado: string | null
    patron: string | null
    tipo_planta: string | null
    creado_en: string | null
    eliminado_en: string | null
    numero_camas: number | null
    total_plantas: number | null
}

export type GrupoCamaEstado = {
    codigo: string
}

export type GrupoCamaTipoPlanta = {
    codigo: string
}

export type Observacion = {
    id_observacion: number
    id_cama: number
    ubicacion_seccion: string | null
    cantidad: number
    id_usuario: number | null
    creado_en: string | null
    eliminado_en: string | null
    tipo_observacion: string | null
    punto_gps: string | null // uuid
}

export type Patron = {
    codigo: string
    proveedor: string | null
}

export type Pinche = {
    id: number
    created_at: string
    bloque: number | null
    cama: number | null
    variedad: number | null
    cantidad: number | null
    tipo: string | null
}

export type PincheTipo = {
    codigo: string
}

export type Produccion = {
    created_at: string
    finca: number | null
    bloque: number | null
    variedad: number | null
    cantidad: number | null
}

export type PuntosGPS = {
    latitud: number
    longitud: number
    precision: number
    altitud: number | null
    capturado_en: string
    creado_en: string | null
    observacion: boolean | null
    usuario_id: number | null
    id: string // uuid
}

// New: sync table (logs of table syncs)
export type Sync = {
    id: number | string
    created_at: string
    tables: any | null
}

export type Seccion = {
    id: number
    largo_m: number
}

export type Usuario = {
    id_usuario: number
    creado_en: string
    nombres: string | null
    apellidos: string | null
    rol: string | null
    clave_pin: string | null
    cedula: string | null
}

export type Variedad = {
    id_variedad: number
    nombre: string
    color: string | null
    id_breeder: number | null
    creado_en: string | null
    eliminado_en: string | null
}
