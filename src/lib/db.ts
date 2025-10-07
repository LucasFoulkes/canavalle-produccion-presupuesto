import Dexie from 'dexie'

export const db = new Dexie('CanavalleDB') as Dexie & Record<string, any>

db.version(4).stores({
    finca: '++id_finca, nombre, creado_en, eliminado_en',
    bloque: '++id_bloque, id_finca, nombre, creado_en, eliminado_en, numero_camas, area_m2',
    cama: '++id_cama, nombre, creado_en, eliminado_en, largo_metros, plantas_totales, id_grupo, ancho_metros',
    breeder: '++id_breeder, nombre, creado_en, eliminado_en',
    observaciones_tipo: 'codigo',
    estado_fenologico_orden: 'codigo_observacion, orden',
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
    variedad: '++id_variedad, nombre, color, id_breeder, creado_en, eliminado_en',
    produccion: '++id, created_at, finca, bloque, variedad, cantidad',
    seccion: '++id, largo_m',
    sync: 'id, created_at, tables',
})

