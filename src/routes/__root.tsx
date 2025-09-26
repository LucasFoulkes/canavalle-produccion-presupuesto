import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createRootRoute, Outlet } from '@tanstack/react-router'


const RootLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
)
export const Route = createRootRoute({ component: RootLayout })
