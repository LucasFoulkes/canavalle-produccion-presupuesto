import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
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

const TABLE_GROUPS: ReadonlyArray<{ label: string; items: string[] }> = [
  { label: 'Estructura de Finca', items: ['finca', 'bloque', 'cama', 'grupo_cama', 'seccion'] },
  { label: 'Variedades', items: ['variedad', 'breeder', 'patron'] },
  { label: 'Fenologia', items: ['estados_fenologicos', 'estado_fenologico_tipo'] },
  { label: 'Observaciones', items: ['observacion'] },
  { label: 'Catalogos', items: ['grupo_cama_estado', 'grupo_cama_tipo_planta'] },
  { label: 'Sistema', items: ['usuario'] },
]

const SUMMARY_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/estimados/area', label: 'Area productiva por variedad' },
  { to: '/estimados/observaciones-area', label: 'Observaciones + Area productiva' },
  { to: '/estimados/observaciones-resumen', label: 'Resumen observaciones por cama' },
  { to: '/estimados/estimados', label: 'Estimados' },
  { to: '/estimados/estimados-resumen', label: 'Resumen fenologico' },
]

const RootLayout = () => {
  const online = useOnlineStatus()
  const currentTitle = useRouterState({
    select: (state) => {
      const dbMatch = state.matches.find((match) => match.routeId === '/db/$table') as
        | { params?: Record<string, unknown> }
        | undefined
      const tableId = (dbMatch?.params?.table as string | undefined) ?? undefined
      return tableId ? TABLES[tableId]?.title ?? tableId : 'Canavalle'
    },
  })

  return (
    <TableFilterProvider>
      <SidebarProvider>
        <div className="flex h-svh w-full overflow-hidden">
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="font-semibold">Canavalle</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="gap-0">
              <SidebarMenu>
                <Collapsible defaultOpen className="group/collapsible">
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
                          <Collapsible key={group.label} defaultOpen className="group/collapsible">
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
                <Collapsible defaultOpen className="group/collapsible">
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
                    Sin conexion
                  </Badge>
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


