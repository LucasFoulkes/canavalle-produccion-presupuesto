import type { Usuario, Finca, Bloque, Variedad, GrupoCama, Cama, Observacion } from '@/types/database'

// Per-table server column lists. Kept next to types for compile-time validation.
// Changing names here updates Supabase selects and normalization in one place.

export const usuarioColumns = [
    // Supabase: id_usuario, creado_en, nombres, apellidos, rol, clave_pin
    'id_usuario', 'creado_en', 'nombres', 'apellidos', 'rol', 'clave_pin'
] as const

export const fincaColumns = [
    // Supabase: id_finca, nombre, creado_en, eliminado_en
    'id_finca', 'nombre', 'creado_en', 'eliminado_en'
] as const

export const bloqueColumns = [
    // Supabase: id_bloque, id_finca, nombre, creado_en, eliminado_en, numero_camas
    'id_bloque', 'id_finca', 'nombre', 'creado_en', 'eliminado_en', 'numero_camas'
] as const

export const variedadColumns = [
    // Supabase: id_variedad, id_breeder, nombre, creado_en, eliminado_en
    'id_variedad', 'id_breeder', 'nombre', 'creado_en', 'eliminado_en'
] as const

export const grupoCamaColumns = [
    // Supabase: id_grupo, id_bloque, id_variedad, fecha_siembra, estado, patron, tipo_planta,
    // creado_en, eliminado_en, numero_camas, total_plantas
    'id_grupo', 'id_bloque', 'id_variedad', 'fecha_siembra', 'estado', 'patron', 'tipo_planta',
    'creado_en', 'eliminado_en', 'numero_camas', 'total_plantas'
] as const

export const camaColumns = [
    // Supabase: id_cama, nombre, creado_en, eliminado_en, largo_metros, plantas_totales, id_grupo, ancho_metros
    'id_cama', 'nombre', 'creado_en', 'eliminado_en', 'largo_metros', 'plantas_totales', 'id_grupo', 'ancho_metros'
] as const

export const observacionColumns = [
    // Supabase: id_observacion, id_cama, ubicacion_seccion, fecha_observacion, cantidad, id_usuario,
    // creado_en, eliminado_en, tipo_observacion
    'id_observacion', 'id_cama', 'ubicacion_seccion', 'fecha_observacion', 'cantidad', 'id_usuario',
    'creado_en', 'eliminado_en', 'tipo_observacion'
] as const

// Normalizers: small, explicit shims to align any backend alias fields.

export function normalizeUsuario(u: any): Usuario {
    // Map backend id_usuario -> app id
    const id = u.id ?? u.id_usuario
    const created_at = u.created_at ?? u.creado_en
    const deleted_at = u.deleted_at ?? u.eliminado_en ?? null
    return { ...u, id, created_at, deleted_at }
}

export function normalizeFinca(f: any): Finca {
    const id = f.id ?? f.id_finca
    const created_at = f.created_at ?? f.creado_en
    const deleted_at = f.deleted_at ?? f.eliminado_en ?? null
    return { ...f, id, created_at, deleted_at }
}

export function normalizeBloque(b: any): Bloque {
    const id = b.id ?? b.id_bloque
    const finca_id = b.finca_id ?? b.id_finca
    const created_at = b.created_at ?? b.creado_en
    const deleted_at = b.deleted_at ?? b.eliminado_en ?? null
    const codigo = b.codigo ?? (b.nombre != null ? String(b.nombre) : undefined)
    return { ...b, id, finca_id, created_at, deleted_at, codigo }
}

export function normalizeVariedad(v: any): Variedad {
    const id = v.id ?? v.id_variedad
    const breeder_id = v.breeder_id ?? v.id_breeder
    const created_at = v.created_at ?? v.creado_en
    const deleted_at = v.deleted_at ?? v.eliminado_en ?? null
    return { ...v, id, breeder_id, created_at, deleted_at }
}

export function normalizeGrupoCama(g: any): GrupoCama {
    const created_at = g.created_at ?? g.creado_en
    const deleted_at = g.deleted_at ?? g.eliminado_en ?? null
    const grupo_id = g.grupo_id ?? g.id_grupo
    const bloque_id = g.bloque_id ?? g.id_bloque
    const variedad_id = g.variedad_id ?? g.id_variedad
    const num_camas = g.num_camas ?? g.numero_camas
    // total_area not present in backend; keep whatever local has
    return { ...g, created_at, deleted_at, grupo_id, bloque_id, variedad_id, num_camas }
}

export function normalizeCama(c: any): Cama {
    const id = c.id ?? c.id_cama
    const created_at = c.created_at ?? c.creado_en
    const deleted_at = c.deleted_at ?? c.eliminado_en ?? null
    const grupo_id = c.grupo_id ?? c.id_grupo
    // area is not a backend column; we can approximate if sizes exist
    const area = c.area ?? (c.largo_metros != null && c.ancho_metros != null
        ? Number(c.largo_metros) * Number(c.ancho_metros)
        : undefined)
    return { ...c, id, created_at, deleted_at, grupo_id, area }
}

export function normalizeObservacion(o: any): Observacion {
    const id = o.id ?? o.id_observacion
    const created_at = o.created_at ?? o.creado_en
    const deleted_at = o.deleted_at ?? o.eliminado_en ?? null
    // Map backend tipo_observacion to our estado_fenologico field
    const estado_fenologico = o.estado_fenologico ?? o.tipo_observacion
    return { ...o, id, created_at, deleted_at, estado_fenologico }
}
