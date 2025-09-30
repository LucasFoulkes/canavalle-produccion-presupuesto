import type { LucideIcon } from 'lucide-react'
import {
    Command,
    SquareTerminal,
    Frame,
    PieChart,
    Database,
    Map,
    Users,
} from 'lucide-react'

export type NavLeaf = {
    title: string
    url: string
}

export type NavGroup = {
    title: string
    url: string
    icon: LucideIcon
    items?: NavLeaf[]
}

export const navSummaryGroups: NavGroup[] = [
    {
        title: 'Área productiva (FBV)',
        url: '/area_productiva',
        icon: PieChart,
    },
    {
        title: 'Observacion por cama',
        url: '/observaciones_por_cama',
        icon: PieChart,
    },
    {
        title: 'Resumen Fenológico',
        url: '/resumen_fenologico',
        icon: PieChart,
    },
    {
        title: 'Cosecha',
        url: '/cosecha',
        icon: PieChart,
    },
]

export const navBaseGroups: NavGroup[] = [
    {
        title: 'Infraestructura',
        url: '/finca',
        icon: SquareTerminal,
        items: [
            { title: 'Fincas', url: '/finca' },
            { title: 'Bloques', url: '/bloque' },
            { title: 'Camas', url: '/cama' },
            { title: 'Grupos de Cama', url: '/grupo_cama' },
            { title: 'Secciones', url: '/seccion' },
        ],
    },
    {
        title: 'Material Vegetal',
        url: '/variedad',
        icon: Frame,
        items: [
            { title: 'Variedades', url: '/variedad' },
            { title: 'Breeders', url: '/breeder' },
            { title: 'Patrones', url: '/patron' },
            { title: 'Estados Gr. Cama', url: '/grupo_cama_estado' },
            { title: 'Tipos de Planta', url: '/grupo_cama_tipo_planta' },
        ],
    },
    {
        title: 'Fenología',
        url: '/estados_fenologicos',
        icon: PieChart,
        items: [
            { title: 'Estados Fenológicos', url: '/estados_fenologicos' },
            { title: 'Tipos de Estado', url: '/estado_fenologico_tipo' },
        ],
    },
    {
        title: 'Operaciones',
        url: '/pinche',
        icon: Database,
        items: [
            { title: 'Pinches', url: '/pinche' },
            { title: 'Tipos de Pinche', url: '/pinche_tipo' },
            { title: 'Producción', url: '/produccion' },
        ],
    },
    {
        title: 'Observaciones',
        url: '/observacion',
        icon: Map,
        items: [
            { title: 'Observaciones', url: '/observacion' },
            { title: 'Puntos GPS', url: '/puntos_gps' },
        ],
    },
    {
        title: 'Administración',
        url: '/usuario',
        icon: Users,
        items: [
            { title: 'Usuarios', url: '/usuario' },
            { title: 'Sync', url: '/sync' },
        ],
    },
]

export const navSearchGroups: NavGroup[] = [...navSummaryGroups, ...navBaseGroups]

function normalizePath(path: string): string {
    return path.replace(/^\//, '').split('?')[0]
}

function prettifySlug(slug: string): string {
    return slug
        .split('/')
        .filter(Boolean)
        .map((part) => part.replace(/_/g, ' '))
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' / ')
}

export function resolveTitleFromPath(path: string): string {
    const normalized = normalizePath(path)
    if (!normalized) return 'Inicio'
    const matcher = `/${normalized}`
    for (const group of navSearchGroups) {
        if (group.url === matcher) return group.title
        if (group.items) {
            for (const leaf of group.items) {
                if (leaf.url === matcher) return leaf.title
            }
        }
    }
    return prettifySlug(normalized)
}

export const brandInfo = {
    name: 'Cananvalle',
    owner: 'Lucas Foulkes',
    email: 'lukas@cananvalle.com',
    logoIcon: Command,
}
