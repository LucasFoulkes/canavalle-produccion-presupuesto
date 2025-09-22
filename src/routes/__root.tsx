import { createRootRoute, Link, Outlet, useRouterState, useRouter } from '@tanstack/react-router'
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
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { TABLES } from '@/services/db'
import { TableFilterProvider } from '@/hooks/use-table-filter'
import { useIsMobile } from '@/hooks/use-mobile'
import { useGpsTracker } from '@/hooks/use-gps-tracker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
// Removed mobile search dialog

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
  const { state: routerState } = useRouter()
  const isHome = routerState.location.pathname === '/'
  // PWA install state (mobile only)
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null)
  const [isInstalled, setIsInstalled] = React.useState<boolean>(false)
  const [openIosInstructions, setOpenIosInstructions] = React.useState(false)
  const isIOS = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }, [])
  const displayModeStandalone = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
  }, [])
  React.useEffect(() => {
    // Determine if already installed (iOS Safari exposes navigator.standalone)
    const installed = displayModeStandalone || (typeof navigator !== 'undefined' && (navigator as any).standalone === true)
    setIsInstalled(Boolean(installed))
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const canShowAndroidInstall = !isIOS && !isInstalled && !!deferredPrompt && isHome
  // Derive breadcrumb items from the current path
  const breadcrumbs = React.useMemo(() => {
    const path = routerState.location.pathname
    const segs = path.split('/').filter(Boolean)
    if (segs.length === 0) return [] as { label: string; to?: string }[]
    const items: { label: string; to?: string }[] = []
    // Home always first
    items.push({ label: 'Inicio', to: '/' })
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const prev = segs[i - 1]
      const curPath = '/' + segs.slice(0, i + 1).join('/')
      if (seg === 'db') {
        items.push({ label: 'Tablas' })
        continue
      }
      if (seg === 'estimados') {
        items.push({ label: 'Resúmenes' })
        continue
      }
      if (seg === 'predicciones') {
        items.push({ label: 'Predicciones', to: '/predicciones' })
        continue
      }
      if (seg === 'observaciones') {
        items.push({ label: 'Observaciones' })
        continue
      }
      // Specific children
      if (prev === 'db') {
        const label = TABLES[seg as keyof typeof TABLES]?.title ?? seg
        items.push({ label, to: curPath })
        continue
      }
      if (prev === 'estimados') {
        const map: Record<string, string> = {
          'area': 'Área productiva por variedad',
          'observaciones-area': 'Observaciones + Área productiva',
          'observaciones-resumen': 'Resumen observaciones por cama',
          'estimados': 'Estimados',
          'estimados-resumen': 'Resumen fenológico',
        }
        items.push({ label: map[seg] ?? seg })
        continue
      }
      if (prev === 'predicciones') {
        const map: Record<string, string> = {
          'totales': 'Predicciones totales',
          'cosecha': 'Cosecha',
        }
        items.push({ label: map[seg] ?? seg, to: curPath })
        continue
      }
      // Fallback
      items.push({ label: seg, to: curPath })
    }
    return items
  }, [routerState.location.pathname])
  // quick search for tables
  const [q, setQ] = React.useState('')
  const allTables = React.useMemo(() => Object.values(TABLES).map(t => ({ id: t.id, title: t.title })), [])
  const results = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return [] as { id: string; title: string }[]
    return allTables
      .filter(t => t.id.toLowerCase().includes(s) || t.title.toLowerCase().includes(s))
      .slice(0, 10)
  }, [q, allTables])
  const clearSearch = () => setQ('')

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
                  {/* PWA install actions: Android shows prompt; iOS shows instructions. Hidden if already installed. */}
                  {!isInstalled && isHome && (
                    <>
                      {canShowAndroidInstall && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Instalar la app en tu dispositivo"
                          onClick={async () => {
                            try {
                              deferredPrompt.prompt()
                              const choice = await deferredPrompt.userChoice
                              if (choice && choice.outcome) {
                                setDeferredPrompt(null)
                              }
                            } catch { /* noop */ }
                          }}
                        >
                          Instalar
                        </Button>
                      )}
                      {isIOS && (
                        <Dialog open={openIosInstructions} onOpenChange={setOpenIosInstructions}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" title="Cómo instalar en iPhone/iPad">Instalar</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[420px]">
                            <DialogHeader>
                              <DialogTitle>Instalar en iPhone/iPad</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 text-sm">
                              <p>1. Abre esta página en Safari.</p>
                              <p>2. Toca el botón Compartir (ícono de cuadrado con flecha arriba).</p>
                              <p>3. Selecciona "Añadir a pantalla de inicio".</p>
                              <p>4. Confirma para crear el acceso directo.</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </>
                  )}
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
              <div className="animate-fade-in-up h-full">
                <Outlet />
              </div>
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
                <Link to="/" preload="intent" search={{ focus: 'none', byWeek: false }} className="font-semibold rounded-sm outline-none focus-visible:ring-2 ring-ring flex items-center gap-2">
                  <Home className="h-4 w-4" aria-hidden />
                  <span>Canavalle</span>
                </Link>
              </div>
              <div className="px-2 pb-1.5">
                <SidebarInput
                  placeholder="Buscar tabla…"
                  value={q}
                  onChange={(e) => setQ((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && results[0]) {
                      // programmatic navigation via Link is simpler with a click; but we can also set location
                      // here we let users click; Enter picks first result
                      (document.getElementById(`table-result-${results[0].id}`) as HTMLAnchorElement | null)?.click()
                    }
                  }}
                />
                {q && (
                  <div className="mt-1 max-h-56 overflow-auto rounded-md border bg-popover p-1 shadow-md">
                    {results.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin resultados</div>
                    ) : results.map(r => (
                      <Link
                        id={`table-result-${r.id}`}
                        key={r.id}
                        to="/db/$table"
                        params={{ table: r.id }}
                        className="block rounded-[6px] px-2 py-1.5 text-sm hover:bg-muted truncate"
                        onClick={() => clearSearch()}
                        title={`${r.title} (${r.id})`}
                      >
                        <span className="truncate inline-block max-w-full align-bottom">{r.title}</span>
                        <span className="text-muted-foreground ml-2">({r.id})</span>
                      </Link>
                    ))}
                  </div>
                )}
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
                      <SidebarMenuButton size="sm" className="uppercase tracking-wide text-[11px] text-muted-foreground/90" title="Tablas">
                        <span>Tablas</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
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
                                <SidebarMenuSubButton size="sm" title={group.label}>
                                  <span>{group.label}</span>
                                  <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuSubButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
                                <SidebarMenuSub>
                                  {group.items
                                    .map((tableId) => ({ id: tableId, config: TABLES[tableId] }))
                                    .filter((entry) => Boolean(entry.config))
                                    .map((entry) => (
                                      <SidebarMenuSubItem key={entry.id}>
                                        <SidebarMenuSubButton asChild size="sm" title={entry.config?.title ?? entry.id}>
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
                <SidebarSeparator />
                <Collapsible
                  open={openTop === 'resumenes'}
                  onOpenChange={(o) => setOpenTop(o ? 'resumenes' : (openTop === 'resumenes' ? null : openTop))}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton size="sm" className="uppercase tracking-wide text-[11px] text-muted-foreground/90" title="Resumenes">
                        <span>Resumenes</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
                      <SidebarMenuSub>
                        {SUMMARY_LINKS.map((link) => (
                          <SidebarMenuSubItem key={link.to}>
                            <SidebarMenuSubButton asChild size="sm" title={link.label}>
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
                <SidebarSeparator />
                <Collapsible
                  open={openTop === 'predicciones'}
                  onOpenChange={(o) => setOpenTop(o ? 'predicciones' : (openTop === 'predicciones' ? null : openTop))}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton size="sm" className="uppercase tracking-wide text-[11px] text-muted-foreground/90" title="Predicciones">
                        <span>Predicciones</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
                      <SidebarMenuSub>
                        {PREDICTION_LINKS.map((link) => (
                          <SidebarMenuSubItem key={link.to}>
                            <SidebarMenuSubButton asChild size="sm" title={link.label}>
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
            {!user && (
              <SidebarFooter className="mt-auto">
                <Link to={"/signup" as any} className="w-full">
                  <Button className="w-full bg-amber-500 text-black hover:bg-amber-400">Registrarse</Button>
                </Link>
              </SidebarFooter>
            )}
            <SidebarRail />
          </Sidebar>
          <SidebarInset>
            <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
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
                ) : null}
                {!isHome && <FilterToolbar className="ml-0" />}
              </div>
            </div>
            {/* Breadcrumb under sticky header (hidden on home) */}
            {!isHome && breadcrumbs.length > 0 ? (
              <div className="border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
                <nav aria-label="breadcrumb" className="container-app px-5 py-1.5 text-xs text-muted-foreground">
                  <ol className="flex items-center gap-1.5">
                    {breadcrumbs.map((b, idx) => (
                      <React.Fragment key={`${b.label}-${idx}`}>
                        {idx > 0 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />}
                        {b.to ? (
                          <Link to={b.to as any} className="hover:text-foreground" title={b.label}>
                            {b.label}
                          </Link>
                        ) : (
                          <span className="truncate" title={b.label}>{b.label}</span>
                        )}
                      </React.Fragment>
                    ))}
                  </ol>
                </nav>
              </div>
            ) : null}
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
              <div className={isHome ? "px-5 pb-5" : "container-app px-5 pb-5"}>
                <div className="animate-fade-in-up h-full">
                  <Outlet />
                </div>
              </div>
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
