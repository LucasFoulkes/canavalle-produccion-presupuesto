import { supabase } from '@/lib/supabase'

// Generic factory for per-table services
// Provide Row, Insert, Update types optionally for stronger typing.
export function makeTableService<Row = any, Insert = Partial<Row>, Update = Partial<Row>>(table: string) {
    return {
        // Basic reads
        selectAll: (columns: string = '*') => supabase.from(table).select(columns),
        selectById: (id: string | number, idColumn: string = 'id', columns: string = '*') =>
            supabase.from(table).select(columns).eq(idColumn, id).single(),

        // Inserts and updates
        insert: (values: Insert) => supabase.from(table).insert(values as any).select().single(),
        upsert: (values: Insert | Insert[]) => supabase.from(table).upsert(values as any).select(),
        updateById: (id: string | number, patch: Update, idColumn: string = 'id') =>
            supabase.from(table).update(patch as any).eq(idColumn, id).select().single(),

        // Deletes
        deleteById: (id: string | number, idColumn: string = 'id') =>
            supabase.from(table).delete().eq(idColumn, id).select().maybeSingle(),
    }
}

// Generic accessor to avoid per-table service files when only basic CRUD is needed
export function getTableService(table: string) {
    return makeTableService(table)
}

// --- Config registry for generic DB browsing ---
export type TableColumn = {
    key: string
    header?: string
}

export type TableConfig = {
    id: string
    title: string
    columns: TableColumn[]
}

// Small helper to declare columns without repeating `{ key: '...' }`
const cols = (...keys: string[]): TableColumn[] => keys.map((key) => ({ key }))

export const TABLES: Record<string, TableConfig> = {
    finca: {
        id: 'finca',
        title: 'Finca',
        columns: cols('id_finca', 'nombre',
            // 'creado_en', 'eliminado_en'
        ),
    },
    bloque: {
        id: 'bloque',
        title: 'Bloque',
        columns: cols('id_bloque', 'finca.nombre', 'nombre', 'numero_camas',
            // 'area_m2',
            // 'creado_en', 'eliminado_en'
        ),
    },
    grupo_cama: {
        id: 'grupo_cama',
        title: 'Grupo cama',
        columns: cols(
            'id_grupo',
            'bloque.nombre',
            'variedad.nombre',
            'fecha_siembra',
            'patron',
            'estado',
            'tipo_planta',
            'numero_camas',
            'total_plantas',
            // 'creado_en',
            // 'eliminado_en',
        ),
    },
    cama: {
        id: 'cama',
        title: 'Cama',
        columns: cols(
            'id_cama',
            // 'id_grupo',
            'finca.nombre',
            'bloque.nombre',
            'variedad.nombre',
            'nombre',
            'largo_metros',
            'ancho_metros',
            // 'plantas_totales',
            // 'creado_en',
            // 'eliminado_en',
        ),
    },
    breeder: {
        id: 'breeder',
        title: 'Breeder',
        columns: cols('id_breeder', 'nombre',
            // 'creado_en', 'eliminado_en'
        ),
    },
    estado_fenologico_tipo: {
        id: 'estado_fenologico_tipo',
        title: 'Estado fenológico tipo',
        columns: cols('codigo',
            // 'creado_en',
            'orden'),
    },
    estados_fenologicos: {
        id: 'estados_fenologicos',
        title: 'Estados fenológicos',
        columns: cols(
            'id_estado_fenologico',
            'id_finca',
            'id_bloque',
            'id_variedad',
            'dias_brotacion',
            'dias_cincuenta_mm',
            'dias_quince_cm',
            'dias_veinte_cm',
            'dias_primera_hoja',
            'dias_espiga',
            'dias_arroz',
            'dias_arveja',
            'dias_garbanzo',
            'dias_uva',
            'dias_rayando_color',
            'dias_sepalos_abiertos',
            'dias_cosecha',
            // 'creado_en',
            // 'eliminado_en',
        ),
    },
    grupo_cama_estado: {
        id: 'grupo_cama_estado',
        title: 'Grupo cama estado',
        columns: cols('codigo'),
    },
    grupo_cama_tipo_planta: {
        id: 'grupo_cama_tipo_planta',
        title: 'Grupo cama tipo planta',
        columns: cols('codigo'),
    },
    observacion: {
        id: 'observacion',
        title: 'Observación',
        columns: cols(
            // 'id_observacion',
            'creado_en',
            'finca.nombre',
            'bloque.nombre',
            'variedad.nombre',
            'cama.nombre',
            'ubicacion_seccion',
            'tipo_observacion',
            'cantidad',
            'id_usuario',
            // 'eliminado_en',
        ),
    },
    patron: {
        id: 'patron',
        title: 'Patrón',
        columns: cols('codigo',
            // 'proveedor'
        ),
    },
    variedad: {
        id: 'variedad',
        title: 'Variedad',
        columns: cols('id_variedad', 'breeder.nombre', 'nombre',
            // 'creado_en', 'eliminado_en', 
            'color'),
    },
    usuario: {
        id: 'usuario',
        title: 'Usuario',
        columns: cols('id_usuario', 'creado_en', 'nombres', 'apellidos', 'rol', 'clave_pin'),
    },
    seccion: {
        id: 'seccion',
        title: 'Sección',
        columns: cols('largo_m'),
    },
}

export function getTableConfig(id: string): TableConfig | undefined {
    return TABLES[id]
}

// Sidebar/Navigation grouping with display order
// (UI-only) TABLE_GROUPS moved to '@/config/tables' to keep services free of presentation concerns.

// Small helper to add standard PK-based convenience methods to a base service
function withIdConvenience<TBase extends {
    selectById: (id: any, idColumn?: string, columns?: string) => any
    updateById: (id: any, patch: any, idColumn?: string) => any
    deleteById: (id: any, idColumn?: string) => any
}>(base: TBase, idColumn: string) {
    return {
        ...base,
        getById: (id: string | number, columns: string = '*') => base.selectById(id, idColumn, columns),
        updateById: (id: string | number, patch: any) => base.updateById(id, patch, idColumn),
        deleteById: (id: string | number) => base.deleteById(id, idColumn),
    }
}

// Consolidated per-table services generated from a single config
export const SERVICE_PK: Record<string, string> = {
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
}

const SERVICES = Object.fromEntries(
    Object.entries(SERVICE_PK).map(([name, pk]) => [name, withIdConvenience(makeTableService(name), pk)])
) as any

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
