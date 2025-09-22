import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight, ClipboardList, Home } from 'lucide-react'
import { FilterToolbar } from '@/components/filter-toolbar'
import { Badge } from '@/components/ui/badge'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TABLES } from '@/services/db'
import { TableFilterProvider } from '@/hooks/use-table-filter'
import { useIsMobile } from '@/hooks/use-mobile'
import { useGpsTracker } from '@/hooks/use-gps-tracker'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

const TABLE_GROUPS: ReadonlyArray<{ label: string; items: string[] }> = [
  { label: 'Estructura de Finca', items: ['finca', 'bloque', 'cama', 'grupo_cama', 'seccion'] },
  { label: 'Variedades', items: ['variedad', 'breeder', 'patron'] },
  { label: 'Fenología', items: ['estados_fenologicos', 'estado_fenologico_tipo'] },
  { label: 'Observaciones', items: ['observacion', 'pinche', 'produccion'] },
  { label: 'Catálogos', items: ['grupo_cama_estado', 'grupo_cama_tipo_planta', 'pinche_tipo'] },
  { label: 'Geolocalización', items: ['puntos_gps'] },
  { label: 'Sistema', items: ['usuario'] },
]

const SUMMARY_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/estimados/area', label: 'Área productiva por variedad' },
  { to: '/estimados/observaciones-area', label: 'Observaciones + Área productiva' },
  { to: '/estimados/observaciones-resumen', label: 'Resumen observaciones por cama' },
  { to: '/estimados/estimados', label: 'Estimados' },
  { to: '/estimados/estimados-resumen', label: 'Resumen fenológico' },
]

const PREDICTION_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/predicciones', label: 'Predicciones' },
  { to: '/predicciones/totales', label: 'Predicciones totales' },
  { to: '/predicciones/cosecha', label: 'Cosecha' },
]

const MOBILE_NAV_ITEMS: ReadonlyArray<{ to: string; label: string; icon: LucideIcon; params?: Record<string, string> }> = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/observaciones/mobile-input', label: 'Observaciones', icon: ClipboardList },
]

const RootLayout = () => {
  const online = useOnlineStatus()
  const isMobile = useIsMobile()
  const { user, logout } = useAuth()
  // Always declare GPS tracker hooks at the top level to keep hooks order stable
  const { start: startGps, stop: stopGps } = useGpsTracker({ minDistanceMeters: 1, usuarioId: user?.id_usuario ?? null })
  // Desktop-only: control which sidebar groups are open (accordion behavior)
  const [openTop, setOpenTop] = React.useState<"tablas" | "resumenes" | "predicciones" | null>("tablas")
  const [openTableGroup, setOpenTableGroup] = React.useState<string | null>(TABLE_GROUPS[0]?.label ?? null)
  React.useEffect(() => {
    // Always-on GPS on mobile: start watcher on mount, stop on unmount
    if (isMobile) {
      startGps()
      return () => stopGps()
    }
    return undefined
  }, [isMobile, startGps, stopGps, user?.id_usuario])
  const currentTitle = useRouterState({
    select: (state) => {
      const dbMatch = state.matches.find((match) => match.routeId === '/db/$table') as
        | { params?: Record<string, unknown> }
        | undefined
      const tableId = (dbMatch?.params?.table as string | undefined) ?? undefined
      return tableId ? TABLES[tableId]?.title ?? tableId : null
    },
  })

  if (isMobile) {
    // Mobile layout: show a top header always, with login/logout and GPS toggle
    return (
      <TableFilterProvider>
        <SidebarProvider>
          <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
            <header className="border-b px-3 py-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="truncate font-medium">{currentTitle ?? 'Canavalle'}</div>
                <div className="flex justify-center">
                  {user ? (
                    <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">Conectado</Button>
                  ) : (
                    <Link to={"/signup" as any}>
                      <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600">Registrarse</Button>
                    </Link>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  {!online && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      Sin conexión
                    </Badge>
                  )}
                  {user && (
                    <Button size="sm" variant="outline" onClick={logout}>Salir</Button>
                  )}
                </div>
              </div>
            </header>
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden px-3 pb-24">
              <Outlet />
            </div>
            <MobileBottomNav />
          </div>
        </SidebarProvider>
      </TableFilterProvider>
    )
  }

  return (
    <TableFilterProvider>
      <SidebarProvider>
        <div className="flex h-svh w-full overflow-hidden">
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center justify-between px-2 py-1.5">
                <Link to="/" preload="intent" className="font-semibold rounded-sm outline-none focus-visible:ring-2 ring-ring">
                  Canavalle
                </Link>
              </div>
            </SidebarHeader>
            <SidebarContent className="gap-0">
              <SidebarMenu>
                <Collapsible
                  open={openTop === 'tablas'}
                  onOpenChange={(o) => setOpenTop(o ? 'tablas' : (openTop === 'tablas' ? null : openTop))}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <span>Tablas</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {TABLE_GROUPS.map((group) => (
                          <Collapsible
                            key={group.label}
                            open={openTableGroup === group.label}
                            onOpenChange={(o) => setOpenTableGroup(o ? group.label : (openTableGroup === group.label ? null : openTableGroup))}
                            className="group/collapsible"
                          >
                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuSubButton size="sm">
                                  <span>{group.label}</span>
                                  <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuSubButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {group.items
                                    .map((tableId) => ({ id: tableId, config: TABLES[tableId] }))
                                    .filter((entry) => Boolean(entry.config))
                                    .map((entry) => (
                                      <SidebarMenuSubItem key={entry.id}>
                                        <SidebarMenuSubButton asChild size="sm">
                                          <Link to="/db/$table" params={{ table: entry.id }} activeProps={{ 'data-active': 'true' }}>
                                            <span>{entry.config?.title ?? entry.id}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                <Collapsible
                  open={openTop === 'resumenes'}
                  onOpenChange={(o) => setOpenTop(o ? 'resumenes' : (openTop === 'resumenes' ? null : openTop))}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <span>Resumenes</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {SUMMARY_LINKS.map((link) => (
                          <SidebarMenuSubItem key={link.to}>
                            <SidebarMenuSubButton asChild size="sm">
                              <Link to={link.to} activeProps={{ 'data-active': 'true' }}>
                                <span>{link.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                <Collapsible
                  open={openTop === 'predicciones'}
                  onOpenChange={(o) => setOpenTop(o ? 'predicciones' : (openTop === 'predicciones' ? null : openTop))}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <span>Predicciones</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {PREDICTION_LINKS.map((link) => (
                          <SidebarMenuSubItem key={link.to}>
                            <SidebarMenuSubButton asChild size="sm">
                              <Link to={link.to} activeProps={{ 'data-active': 'true' }}>
                                <span>{link.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarContent>
            <SidebarRail />
          </Sidebar>
          <SidebarInset>
            <div className="flex h-12 items-center gap-2 border-b px-2">
              <SidebarTrigger />
              <div className="font-medium">{currentTitle}</div>
              <div className="ml-auto flex items-center gap-2">
                {!online && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive">
                    Sin conexión
                  </Badge>
                )}
                {user ? (
                  <>
                    <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">Conectado</Button>
                    <Button size="sm" variant="outline" onClick={logout}>Salir</Button>
                  </>
                ) : (
                  <Link to={"/signup" as any}>
                    <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600">Registrarse</Button>
                  </Link>
                )}
                <FilterToolbar className="ml-0" />
              </div>
            </div>
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden px-4 pb-4">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TableFilterProvider>
  )
}

export const Route = createRootRoute({ component: RootLayout })

const MobileBottomNav = () => (
  <nav className="sticky bottom-0 left-0 right-0 border-t bg-background">
    <div
      className="mx-auto flex max-w-md items-center justify-around gap-2 px-4 pt-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      {MOBILE_NAV_ITEMS.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          params={item.params}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors data-[active=true]:text-foreground"
          activeProps={{ 'data-active': 'true' }}
          preload="intent"
        >
          <item.icon className="h-5 w-5" aria-hidden />
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  </nav>
)
