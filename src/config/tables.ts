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
    columns: cols(
      'id_finca',
      'nombre',
      // 'creado_en',
      // 'eliminado_en'
    ),
  },
  bloque: {
    id: 'bloque',
    title: 'Bloque',
    columns: cols(
      'id_bloque',
      'finca.nombre',
      'nombre',
      'numero_camas',
      // 'area_m2',
      // 'creado_en',
      // 'eliminado_en'
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
    columns: cols(
      'id_breeder',
      'nombre',
      // 'creado_en',
      // 'eliminado_en'
    ),
  },
  estado_fenologico_tipo: {
    id: 'estado_fenologico_tipo',
    title: 'Estado fenológico tipo',
    columns: cols(
      'codigo',
      // 'creado_en',
      'orden'
    ),
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
    columns: cols(
      'codigo',
      // 'proveedor'
    ),
  },
  variedad: {
    id: 'variedad',
    title: 'Variedad',
    columns: cols(
      'id_variedad',
      'breeder.nombre',
      'nombre',
      // 'creado_en',
      // 'eliminado_en',
      'color'
    ),
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

export const TABLE_GROUPS: ReadonlyArray<{ label: string; items: string[] }> = [
  { label: 'Estructura de Finca', items: ['finca', 'bloque', 'cama', 'grupo_cama', 'seccion'] },
  { label: 'Variedades', items: ['variedad', 'breeder', 'patron'] },
  { label: 'Fenología', items: ['estados_fenologicos', 'estado_fenologico_tipo'] },
  { label: 'Observaciones', items: ['observacion'] },
  { label: 'Catálogos', items: ['grupo_cama_estado', 'grupo_cama_tipo_planta'] },
  { label: 'Sistema', items: ['usuario'] },
]
