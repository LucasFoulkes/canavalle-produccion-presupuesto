import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { Monitor, FileText, Share2, Settings } from 'lucide-react'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = useLocation()

  const navigationItems = [
    { path: '/app/monitoreo', icon: Monitor, label: 'Monitoreo' },
    { path: '/app/reportes', icon: FileText, label: 'Reportes' },
    { path: '/app/compartir', icon: Share2, label: 'Compartir' },
    { path: '/app/configuracion', icon: Settings, label: 'Configuración' },
  ]

  const isActive = (path: string) =>
    path === '/app/monitoreo'
      ? pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/monitoreo')
      : pathname === path

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <nav className="flex-shrink-0 p-4 pb-safe">
        <ul className="flex justify-center gap-2 rounded-full bg-zinc-900 p-2">
          {navigationItems.map(({ path, icon: Icon, label }) => (
            <li key={path}>
              <Link
                to={path}
                className={`flex rounded-full p-3 ${isActive(path) ? 'bg-zinc-100' : ''}`}
                aria-label={label}
              >
                <Icon className={`size-6 ${isActive(path) ? 'text-black' : 'text-white'}`} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}