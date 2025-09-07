import Dexie, { Table } from 'dexie'
import { Usuario, Finca, Bloque, Cama, Variedad, GrupoPlantacion, GrupoCama, Observacion, EstadoFenologicoTipo } from '@/types/database'

// Centralized table name constants (helps avoid hard‑coding strings in services)
export const TABLES = {
    usuario: 'usuario',
    finca: 'finca',
    bloque: 'bloque',
    cama: 'cama',
    variedad: 'variedad',
    breeder: 'breeder',
    grupoCama: 'grupo_cama',
    // deprecated alias to avoid runtime errors if referenced somewhere
    grupoPlantacion: 'grupo_plantacion',
    estadoFenologico: 'estado_fenologico',
    medicionDiaria: 'medicion_diaria',
    observacion: 'observacion',
    estadoFenologicoTipo: 'estado_fenologico_tipo'
} as const
export type TableKey = keyof typeof TABLES

export class AppDatabase extends Dexie {
    usuario!: Table<Usuario>
    finca!: Table<Finca>
    bloque!: Table<Bloque>
    cama!: Table<Cama>
    variedad!: Table<Variedad>
    grupoCama!: Table<GrupoCama>
    grupoPlantacion!: Table<GrupoPlantacion>
    observacion!: Table<Observacion>
    estadoFenologicoTipo!: Table<EstadoFenologicoTipo>

    constructor() {
        super('AppDatabase')

        // Bump schema version to 3 with only singular tables (old plural migration removed)
        // Version 3 used auto-increment ("++id"). Version 4 switches to server-assigned ids ("id").
        this.version(7).stores({
            [TABLES.usuario]: 'id, id_usuario, nombres, apellidos, rol, clave_pin, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.finca]: 'id, id_finca, finca_id, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.bloque]: 'id, id_bloque, bloque_id, finca_id, id_finca, nombre, codigo, numero_camas, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.cama]: 'id, id_cama, cama_id, bloque_id, id_bloque, grupo_id, id_grupo, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.variedad]: 'id, id_variedad, variedad_id, breeder_id, id_obtentor, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoCama]: 'grupo_id, id_grupo, bloque_id, id_bloque, variedad_id, id_variedad, fecha_siembra, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            // dropped tables in later versions kept here for migration history
        }).upgrade(async () => {
            console.log('[Dexie] Upgraded schema to v7 (Spanish column aliases, new tables estado_fenologico, medicion_diaria).')
        })

        // Version 8: add explicit indexes for pin & clave_pin on usuario to support authentication lookup
        this.version(8).stores({
            [TABLES.usuario]: 'id, pin, clave_pin, id_usuario, nombres, apellidos, rol, created_at, creado_en, deleted_at, eliminado_en',
            // other tables unchanged – declaring them here maintains schema; Dexie merges definitions
            [TABLES.finca]: 'id, id_finca, finca_id, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.bloque]: 'id, id_bloque, bloque_id, finca_id, id_finca, nombre, codigo, numero_camas, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.cama]: 'id, id_cama, cama_id, bloque_id, id_bloque, grupo_id, id_grupo, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.variedad]: 'id, id_variedad, variedad_id, breeder_id, id_obtentor, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoCama]: 'grupo_id, id_grupo, bloque_id, id_bloque, variedad_id, id_variedad, fecha_siembra, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            // dropped tables in later versions kept here for migration history
        }).upgrade(async (trans) => {
            console.log('[Dexie] Upgraded schema to v8 (usuario.pin & usuario.clave_pin indexes).')
            // Backfill: for existing usuario records that only have clave_pin, duplicate to pin for easier lookup
            try {
                const usuarios = await trans.table(TABLES.usuario).toArray()
                for (const u of usuarios) {
                    if (u.clave_pin && !u.pin) {
                        (u as any).pin = u.clave_pin
                        await trans.table(TABLES.usuario).put(u)
                    }
                }
            } catch (e) {
                console.warn('[Dexie] v8 backfill failed:', e)
            }
        })

        this.version(9).stores({
            [TABLES.usuario]: 'id, pin, clave_pin, id_usuario, nombres, apellidos, rol, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.finca]: 'id, id_finca, finca_id, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.bloque]: 'id, id_bloque, bloque_id, finca_id, id_finca, nombre, codigo, numero_camas, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.cama]: 'id, id_cama, cama_id, bloque_id, id_bloque, grupo_id, id_grupo, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.variedad]: 'id, id_variedad, variedad_id, breeder_id, id_obtentor, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoCama]: 'grupo_id, id_grupo, bloque_id, id_bloque, variedad_id, id_variedad, fecha_siembra, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            [TABLES.observacion]: 'id, id_observacion, id_cama, estado_fenologico, cantidad, ubicacion_seccion, id_usuario, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.estadoFenologicoTipo]: 'codigo, nombre, orden, activo, created_at'
        }).upgrade(() => {
            console.log('[Dexie] Upgraded schema to v9 (observacion & estado_fenologico_tipo).')
        })

        // v10: drop unused tables (breeder, estado_fenologico, medicion_diaria) and align observacion schema
        this.version(10).stores({
            [TABLES.usuario]: 'id, pin, clave_pin, id_usuario, nombres, apellidos, rol, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.finca]: 'id, id_finca, finca_id, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.bloque]: 'id, id_bloque, bloque_id, finca_id, id_finca, nombre, codigo, numero_camas, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.cama]: 'id, id_cama, cama_id, bloque_id, id_bloque, grupo_id, id_grupo, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.variedad]: 'id, id_variedad, variedad_id, breeder_id, id_obtentor, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoCama]: 'grupo_id, id_grupo, bloque_id, id_bloque, variedad_id, id_variedad, fecha_siembra, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            [TABLES.observacion]: 'id, id_observacion, id_cama, estado_fenologico, cantidad, ubicacion_seccion, id_usuario, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.estadoFenologicoTipo]: 'codigo, nombre, orden, activo, created_at'
        }).upgrade(async (trans) => {
            // Explicitly delete unused tables if they still exist
            try { await (trans as any).db.table('breeder').clear(); } catch { }
            try { await (trans as any).db.table('estado_fenologico').clear(); } catch { }
            try { await (trans as any).db.table('medicion_diaria').clear(); } catch { }
            console.log('[Dexie] Upgraded schema to v10 (dropped unused tables and updated observacion schema).')
        })

        // v11: align stored column names to Supabase (drop legacy aliases over time)
        this.version(11).stores({
            // Use Supabase names as indexed fields; keep some legacy fields for query compatibility during transition
            [TABLES.usuario]: 'id_usuario, nombres, apellidos, rol, clave_pin, creado_en, eliminado_en',
            [TABLES.finca]: 'id_finca, nombre, creado_en, eliminado_en',
            [TABLES.bloque]: 'id_bloque, id_finca, nombre, numero_camas, creado_en, eliminado_en',
            [TABLES.cama]: 'id_cama, id_grupo, nombre, largo_metros, ancho_metros, plantas_totales, creado_en, eliminado_en',
            [TABLES.variedad]: 'id_variedad, id_breeder, nombre, creado_en, eliminado_en',
            [TABLES.grupoCama]: 'id_grupo, id_bloque, id_variedad, fecha_siembra, estado, patron, tipo_planta, numero_camas, total_plantas, creado_en, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            [TABLES.observacion]: 'id, id_observacion, id_cama, tipo_observacion, cantidad, ubicacion_seccion, id_usuario, creado_en, eliminado_en',
            [TABLES.estadoFenologicoTipo]: 'codigo, nombre, orden, activo, created_at'
        }).upgrade(async (trans) => {
            console.log('[Dexie] Upgraded schema to v11 (aligned fields to Supabase names).')
            // Best-effort migration: copy id->id_usuario, etc., where missing
            try {
                const t = trans.table(TABLES.usuario)
                const rows = await t.toArray()
                for (const u of rows as any[]) {
                    if (u.id_usuario == null && u.id != null) { u.id_usuario = u.id; await t.put(u) }
                }
            } catch { }
            try {
                const t = trans.table(TABLES.finca)
                const rows = await t.toArray()
                for (const r of rows as any[]) {
                    if (r.id_finca == null && r.id != null) { r.id_finca = r.id; await t.put(r) }
                }
            } catch { }
            try {
                const t = trans.table(TABLES.bloque)
                const rows = await t.toArray()
                for (const r of rows as any[]) {
                    if (r.id_bloque == null && r.id != null) { r.id_bloque = r.id; await t.put(r) }
                    if (r.id_finca == null && r.finca_id != null) { r.id_finca = r.finca_id; await t.put(r) }
                }
            } catch { }
            try {
                const t = trans.table(TABLES.cama)
                const rows = await t.toArray()
                for (const r of rows as any[]) {
                    if (r.id_cama == null && r.id != null) { r.id_cama = r.id; await t.put(r) }
                    if (r.id_grupo == null && r.grupo_id != null) { r.id_grupo = r.grupo_id; await t.put(r) }
                }
            } catch { }
            try {
                const t = trans.table(TABLES.variedad)
                const rows = await t.toArray()
                for (const r of rows as any[]) {
                    if (r.id_variedad == null && r.id != null) { r.id_variedad = r.id; await t.put(r) }
                    if (r.id_breeder == null && r.breeder_id != null) { r.id_breeder = r.breeder_id; await t.put(r) }
                }
            } catch { }
            try {
                const t = trans.table(TABLES.grupoCama)
                const rows = await t.toArray()
                for (const r of rows as any[]) {
                    if (r.id_grupo == null && r.grupo_id != null) { r.id_grupo = r.grupo_id; await t.put(r) }
                    if (r.id_bloque == null && r.bloque_id != null) { r.id_bloque = r.bloque_id; await t.put(r) }
                    if (r.id_variedad == null && r.variedad_id != null) { r.id_variedad = r.variedad_id; await t.put(r) }
                    if (r.numero_camas == null && r.num_camas != null) { r.numero_camas = r.num_camas; await t.put(r) }
                }
            } catch { }
            try {
                const t = trans.table(TABLES.observacion)
                const rows = await t.toArray()
                for (const r of rows as any[]) {
                    if (r.tipo_observacion == null && r.estado_fenologico != null) { r.tipo_observacion = r.estado_fenologico; await t.put(r) }
                }
            } catch { }
        })

        // Because the class property name (grupoPlantacion) does not exactly match the store name (grupo_plantacion),
        // manually bind it so db.grupoPlantacion is defined.
        this.grupoCama = this.table(TABLES.grupoCama)
        this.grupoPlantacion = this.table(TABLES.grupoPlantacion) // legacy binding
        this.observacion = this.table(TABLES.observacion)
        this.estadoFenologicoTipo = this.table(TABLES.estadoFenologicoTipo)
    }
}

export const db = new AppDatabase()
