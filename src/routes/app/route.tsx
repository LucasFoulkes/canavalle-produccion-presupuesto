import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { Share2, Settings, FileText, Activity } from 'lucide-react'


export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  const location = useLocation()

  const navigationItems = [
    { path: '/app', icon: Activity },
    { path: '/app/reportes', icon: FileText },
    { path: '/app/compartir', icon: Share2 },
    { path: '/app/configuracion', icon: Settings },
  ]

  const isActive = (path: string) => {
    // Check if we're in configuration mode (assign-camas flow from config)
    const isConfigMode = location.search?.mode === 'assign-camas'
    // Also consider assign-camas page itself as configuration (since it's only accessible from config)
    const isAssignCamasPage = location.pathname === '/app/assign-camas'

    if (path === '/app') {
      // Main monitor section - active for /app and monitoring sub-routes (but not when in config mode or assign-camas)
      return !isConfigMode && !isAssignCamasPage && (
        location.pathname === '/app' ||
        location.pathname === '/app/' ||
        location.pathname === '/app/bloques' ||
        location.pathname === '/app/camas' ||
        location.pathname === '/app/cama-detail'
      )
    }
    if (path === '/app/configuracion') {
      // Configuration section - active for configuration routes OR when in config mode OR on assign-camas page
      return location.pathname.startsWith('/app/configuracion') ||
        isConfigMode ||
        isAssignCamasPage
    }
    if (path === '/app/compartir') {
      // Sharing section - active for sharing and its sub-routes
      return location.pathname.startsWith('/app/compartir')
    }
    if (path === '/app/reportes') {
      // Reports section - active for reports and its sub-routes
      return location.pathname.startsWith('/app/reportes')
    }
    return location.pathname === path
  }

  return (
    <div className='h-screen w-screen flex flex-col'>
      <div className='flex-1 overflow-hidden'>
        <Outlet />
      </div>
      <div className='flex justify-center'>
        <div className='bg-zinc-900 text-white m-4 mt-0 rounded-full w-fit'>
          <div className='flex space-between items-center justify-center gap-2 p-2'>
            {navigationItems.map(({ path, icon: Icon }) => {
              const active = isActive(path)
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center justify-center cursor-pointer p-3 rounded-full ${active ? 'bg-zinc-100' : ''
                    }`}
                >
                  <Icon className={`size-6 ${active ? 'text-black' : 'text-white'}`} />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
