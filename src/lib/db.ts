import Dexie, { type EntityTable } from 'dexie'
import type {
    Finca,
    Bloque,
    Cama,
    Breeder,
    EstadoFenologicoTipo,
    EstadosFenologicos,
    GrupoCama,
    GrupoCamaEstado,
    GrupoCamaTipoPlanta,
    Observacion,
    Patron,
    Pinche,
    PincheTipo,
    Produccion,
    PuntosGPS,
    Seccion,
    Usuario,
    Variedad,
} from '@/types/tables'

// Offline-first Dexie database
export const db = new Dexie('CanavalleDB') as Dexie & {
    // Table name 'finca' matches remote table for easier sync mental model
    finca: EntityTable<
        Finca,
        'id_finca'
    >
    bloque: EntityTable<
        Bloque,
        'id_bloque'
    >
    cama: EntityTable<
        Cama,
        'id_cama'
    >
    breeder: EntityTable<
        Breeder,
        'id_breeder'
    >
    estado_fenologico_tipo: EntityTable<
        EstadoFenologicoTipo,
        'codigo'
    >
    estados_fenologicos: EntityTable<
        EstadosFenologicos,
        'id_estado_fenologico'
    >
    grupo_cama: EntityTable<
        GrupoCama,
        'id_grupo'
    >
    grupo_cama_estado: EntityTable<
        GrupoCamaEstado,
        'codigo'
    >
    grupo_cama_tipo_planta: EntityTable<
        GrupoCamaTipoPlanta,
        'codigo'
    >
    observacion: EntityTable<
        Observacion,
        'id_observacion'
    >
    patron: EntityTable<
        Patron,
        'codigo'
    >
    pinche: EntityTable<
        Pinche,
        'id'
    >
    pinche_tipo: EntityTable<
        PincheTipo,
        'codigo'
    >
    puntos_gps: EntityTable<
        PuntosGPS,
        'id'
    >
    usuario: EntityTable<
        Usuario,
        'id_usuario'
    >
    variedad: EntityTable<
        Variedad,
        'id_variedad'
    >
    produccion: EntityTable<
        Produccion & { id?: number },
        'id'
    >
    seccion: EntityTable<
        Seccion & { id?: number },
        'id'
    >
}

// Single latest schema version (no historical versions kept)
db.version(2).stores({
    finca: '++id_finca, nombre, creado_en, eliminado_en',
    bloque: '++id_bloque, id_finca, nombre, creado_en, eliminado_en, numero_camas, area_m2',
    cama: '++id_cama, nombre, creado_en, eliminado_en, largo_metros, plantas_totales, id_grupo, ancho_metros',
    breeder: '++id_breeder, nombre, creado_en, eliminado_en',
    estado_fenologico_tipo: 'codigo, creado_en, orden',
    estados_fenologicos: '++id_estado_fenologico, id_finca, id_bloque, id_variedad, creado_en, eliminado_en',
    grupo_cama: '++id_grupo, id_bloque, id_variedad, fecha_siembra, estado, patron, tipo_planta, creado_en, eliminado_en, numero_camas, total_plantas',
    grupo_cama_estado: 'codigo',
    grupo_cama_tipo_planta: 'codigo',
    observacion: '++id_observacion, id_cama, id_usuario, tipo_observacion, punto_gps, creado_en, eliminado_en',
    patron: 'codigo, proveedor',
    pinche: '++id, bloque, cama, variedad, cantidad, tipo, created_at',
    pinche_tipo: 'codigo',
    puntos_gps: 'id, latitud, longitud, precision, altitud, capturado_en, creado_en, observacion, usuario_id',
    usuario: '++id_usuario, creado_en, nombres, apellidos, rol, clave_pin, cedula',
    variedad: '++id_variedad',
    produccion: '++id, created_at, finca, bloque, variedad, cantidad',
    seccion: '++id, largo_m',
})

// Optionally map js class if needed in the future
// db.finca.mapToClass(FincaModel)

export type { Finca, Bloque, Cama }
