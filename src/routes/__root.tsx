import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { resolveTitleFromPath } from '@/lib/navigation'

const RootLayout = () => {
  const state = useRouterState()
  const pathname = state.location?.pathname ?? '/'
  const display = resolveTitleFromPath(pathname)

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
        {/* AI bar hidden for now */}
      </SidebarInset>
    </SidebarProvider>
  )
}
export const Route = createRootRoute({ component: RootLayout })
