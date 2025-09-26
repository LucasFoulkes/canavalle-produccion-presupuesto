import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router'
const RootLayout = () => {
  const router = useRouter()
  const path = router.state.location.pathname
  const seg = path.split('/').filter(Boolean)[0] ?? ''
  const tableTitle = seg
    ? seg.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : ''

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger />
            {tableTitle ? (
              <span className="text-sm text-muted-foreground truncate max-w-[60vw] md:max-w-[50vw]">
                {tableTitle}
              </span>
            ) : null}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
export const Route = createRootRoute({ component: RootLayout })
