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
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/'
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
