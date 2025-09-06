import Dexie, { Table } from 'dexie'
import { Usuario, Finca, Bloque, Cama, Variedad, GrupoPlantacion, Breeder, GrupoCama, EstadoFenologicoNuevo, MedicionDiaria, Observacion, EstadoFenologicoTipo } from '@/types/database'

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
    breeder!: Table<Breeder>
    grupoCama!: Table<GrupoCama>
    grupoPlantacion!: Table<GrupoPlantacion>
    estadoFenologico!: Table<EstadoFenologicoNuevo>
    medicionDiaria!: Table<MedicionDiaria>
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
            [TABLES.breeder]: 'id, id_obtentor, breeder_id, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoCama]: 'grupo_id, id_grupo, bloque_id, id_bloque, variedad_id, id_variedad, fecha_siembra, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            [TABLES.estadoFenologico]: 'id, id_estado_fenologico, id_finca, id_bloque, id_variedad, id_usuario, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.medicionDiaria]: 'id, id_medicion, id_cama, id_usuario, fecha_medicion, created_at, creado_en, deleted_at, eliminado_en'
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
            [TABLES.breeder]: 'id, id_obtentor, breeder_id, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoCama]: 'grupo_id, id_grupo, bloque_id, id_bloque, variedad_id, id_variedad, fecha_siembra, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            [TABLES.estadoFenologico]: 'id, id_estado_fenologico, id_finca, id_bloque, id_variedad, id_usuario, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.medicionDiaria]: 'id, id_medicion, id_cama, id_usuario, fecha_medicion, created_at, creado_en, deleted_at, eliminado_en'
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
            [TABLES.breeder]: 'id, id_obtentor, breeder_id, nombre, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoCama]: 'grupo_id, id_grupo, bloque_id, id_bloque, variedad_id, id_variedad, fecha_siembra, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.grupoPlantacion]: 'grupo_id, bloque_id, variedad_id, fecha_siembra, deleted_at',
            [TABLES.estadoFenologico]: 'id, id_estado_fenologico, id_finca, id_bloque, id_variedad, id_usuario, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.medicionDiaria]: 'id, id_medicion, id_cama, id_usuario, fecha_medicion, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.observacion]: 'id, id_observacion, id_cama, estado_fenologico, cantidad, fecha_observacion, hora_observacion, ubicacion_seccion, id_usuario, created_at, creado_en, deleted_at, eliminado_en',
            [TABLES.estadoFenologicoTipo]: 'codigo, nombre, orden, activo, created_at'
        }).upgrade(() => {
            console.log('[Dexie] Upgraded schema to v9 (observacion & estado_fenologico_tipo).')
        })

        // Because the class property name (grupoPlantacion) does not exactly match the store name (grupo_plantacion),
        // manually bind it so db.grupoPlantacion is defined.
        this.grupoCama = this.table(TABLES.grupoCama)
        this.grupoPlantacion = this.table(TABLES.grupoPlantacion) // legacy binding
        this.estadoFenologico = this.table(TABLES.estadoFenologico)
        this.medicionDiaria = this.table(TABLES.medicionDiaria)
        this.observacion = this.table(TABLES.observacion)
        this.estadoFenologicoTipo = this.table(TABLES.estadoFenologicoTipo)
    }
}

export const db = new AppDatabase()
