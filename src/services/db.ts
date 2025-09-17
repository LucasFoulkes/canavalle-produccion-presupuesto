import { supabase } from '@/lib/supabase'

type TableRow = Record<string, unknown>

// Generic factory for per-table services
// Provide Row, Insert, Update types optionally for stronger typing.
export function makeTableService<Row extends TableRow = TableRow, Insert = Partial<Row>, Update = Partial<Row>>(table: string) {
    return {
        // Basic reads
        selectAll: (columns: string = '*') => supabase.from(table).select(columns),
        selectById: (id: string | number, idColumn: string = 'id', columns: string = '*') =>
            supabase.from(table).select(columns).eq(idColumn, id).single(),

        // Inserts and updates
        insert: (values: Insert) => supabase.from(table).insert(values).select().single(),
        upsert: (values: Insert | Insert[]) => supabase.from(table).upsert(values).select(),
        updateById: (id: string | number, patch: Update, idColumn: string = 'id') =>
            supabase.from(table).update(patch).eq(idColumn, id).select().single(),

        // Deletes
        deleteById: (id: string | number, idColumn: string = 'id') =>
            supabase.from(table).delete().eq(idColumn, id).select().maybeSingle(),
    }
}

// Generic accessor to avoid per-table service files when only basic CRUD is needed
export function getTableService(table: string) {
    return makeTableService(table)
}

// Small helper to add standard PK-based convenience methods to a base service
function withIdConvenience<TBase extends {
    selectById: (id: string | number, idColumn?: string, columns?: string) => unknown
    updateById: (id: string | number, patch: unknown, idColumn?: string) => unknown
    deleteById: (id: string | number, idColumn?: string) => unknown
}>(base: TBase, idColumn: string) {
    type Patch = Parameters<TBase['updateById']>[1]
    type SelectReturn = ReturnType<TBase['selectById']>
    type UpdateReturn = ReturnType<TBase['updateById']>
    type DeleteReturn = ReturnType<TBase['deleteById']>

    return {
        ...base,
        getById: (id: string | number, columns: string = '*'): SelectReturn => base.selectById(id, idColumn, columns),
        updateById: (id: string | number, patch: Patch): UpdateReturn => base.updateById(id, patch, idColumn),
        deleteById: (id: string | number): DeleteReturn => base.deleteById(id, idColumn),
    }
}

// Consolidated per-table services generated from a single config
export const SERVICE_PK = {
    bloque: 'id_bloque',
    breeder: 'id_breeder',
    cama: 'id_cama',
    estado_fenologico_tipo: 'codigo',
    estados_fenologicos: 'id_estado_fenologico',
    finca: 'id_finca',
    grupo_cama: 'id_grupo',
    grupo_cama_estado: 'codigo',
    grupo_cama_tipo_planta: 'codigo',
    observacion: 'id_observacion',
    patron: 'codigo',
    variedad: 'id_variedad',
    usuario: 'id_usuario',
} as const satisfies Record<string, string>

type ServiceName = keyof typeof SERVICE_PK
type BaseService = ReturnType<typeof makeTableService>
type ServiceWithConvenience = BaseService & {
    getById: (id: string | number, columns?: string) => ReturnType<BaseService['selectById']>
    updateById: (id: string | number, patch: Parameters<BaseService['updateById']>[1]) => ReturnType<BaseService['updateById']>
    deleteById: (id: string | number) => ReturnType<BaseService['deleteById']>
}

const SERVICES: Record<ServiceName, ServiceWithConvenience> = (Object.keys(SERVICE_PK) as ServiceName[]).reduce(
    (acc, name) => {
        acc[name] = withIdConvenience(makeTableService(name), SERVICE_PK[name])
        return acc
    },
    {} as Record<ServiceName, ServiceWithConvenience>
)

export const {
    bloque: bloqueService,
    breeder: breederService,
    cama: camaService,
    estado_fenologico_tipo: estadoFenologicoTipoService,
    estados_fenologicos: estadosFenologicosService,
    finca: fincaService,
    grupo_cama: grupoCamaService,
    grupo_cama_estado: grupoCamaEstadoService,
    grupo_cama_tipo_planta: grupoCamaTipoPlantaService,
    observacion: observacionService,
    patron: patronService,
    variedad: variedadService,
} = SERVICES

// Special cases
export const seccionService = makeTableService('seccion') // PK unknown; use base methods

// usuarios: keeps a custom finder by PIN, plus standard PK convenience
const usuariosBase = makeTableService('usuario')
export const usuariosService = {
    ...withIdConvenience(usuariosBase, 'id_usuario'),
    findByClavePin: (clave_pin: string, columns: string = '*') =>
        supabase.from('usuario').select(columns).eq('clave_pin', clave_pin).limit(1).maybeSingle(),
}
