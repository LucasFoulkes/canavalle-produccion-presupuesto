import { Outlet } from 'react-router-dom'
import { BottomNavbarDiagnostic } from '@/components/BottomNavbarDiagnostic'

export function Layout() {
    console.log('🔧 DIAGNOSTIC: Layout rendering')

    return (<div className="h-screen flex flex-col md:flex-row">
        {/* Side navigation for desktop */}
        <div className="hidden md:block">
            <BottomNavbarDiagnostic variant="desktop" />
        </div>

        {/* Main content area */}
        <main className="flex-1 flex flex-col p-4 pb-0 md:pb-4 min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
                <Outlet />
            </div>
        </main>

        {/* Bottom navigation for mobile */}
        <div className="md:hidden">
            <BottomNavbarDiagnostic variant="mobile" />
        </div>
    </div>
    )
}
