export type TableNavigationGroup = { label: string; items: string[] }

export const TABLE_GROUPS: ReadonlyArray<TableNavigationGroup> = [
    { label: 'Estructura de Finca', items: ['finca', 'bloque', 'cama', 'grupo_cama', 'seccion'] },
    { label: 'Variedades', items: ['variedad', 'breeder', 'patron'] },
    { label: 'Fenología', items: ['estados_fenologicos', 'estado_fenologico_tipo'] },
    { label: 'Observaciones', items: ['observacion'] },
    { label: 'Catálogos', items: ['grupo_cama_estado', 'grupo_cama_tipo_planta'] },
    { label: 'Sistema', items: ['usuario'] },
] as const

export type SummaryRoute =
    | '/estimados/area'
    | '/estimados/observaciones-area'
    | '/estimados/observaciones-resumen'
    | '/estimados/estimados'
    | '/estimados/estimados-resumen'

export type SummaryNavigationGroup = {
    label: string
    items: Array<{ to: SummaryRoute; label: string }>
}

export const SUMMARY_GROUPS: ReadonlyArray<SummaryNavigationGroup> = [
    {
        label: 'Resumenes',
        items: [
            { to: '/estimados/area', label: 'Área productiva por variedad' },
            { to: '/estimados/observaciones-area', label: 'Observaciones + área productiva' },
            { to: '/estimados/observaciones-resumen', label: 'Resumen observaciones por cama' },
            { to: '/estimados/estimados', label: 'Estimados' },
            { to: '/estimados/estimados-resumen', label: 'Resumen fenológico (b)' },
        ],
    },
] as const

