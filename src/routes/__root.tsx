import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'

const titles: Record<string, string> = {
  // Base
  finca: 'Fincas',
  bloque: 'Bloques',
  cama: 'Camas',
  grupo_cama: 'Grupos de Cama',
  seccion: 'Secciones',
  // Material vegetal
  variedad: 'Variedades',
  breeder: 'Breeders',
  patron: 'Patrones',
  grupo_cama_estado: 'Estados Gr. Cama',
  grupo_cama_tipo_planta: 'Tipos de Planta',
  // Fenología
  estados_fenologicos: 'Estados Fenológicos',
  estado_fenologico_tipo: 'Tipos de Estado',
  resumen_fenologico: 'Resumen Fenológico',
  // Operaciones
  pinche: 'Pinches',
  pinche_tipo: 'Tipos de Pinche',
  produccion: 'Producción',
  // Observaciones
  observacion: 'Observaciones',
  puntos_gps: 'Puntos GPS',
  // Administración
  usuario: 'Usuarios',
  // Resúmenes
  area_productiva: 'Área productiva (FBV)',
  observaciones_por_cama: 'Observacion por cama',
  cosecha: 'Cosecha',
}

function slugToTitle(slug: string | undefined): string {
  if (!slug) return 'Inicio'
  if (titles[slug]) return titles[slug]
  // Fallback: prettify slug
  return slug
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ')
}

const RootLayout = () => {
  const state = useRouterState()
  const pathname = state.location?.pathname ?? '/'
  const slug = pathname.startsWith('/') ? pathname.slice(1) : pathname
  const display = slugToTitle(slug)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex py-2 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger />
            <div className="text-xl font-medium truncate max-w-[70vw] sm:max-w-none">{display}</div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
export const Route = createRootRoute({ component: RootLayout })
