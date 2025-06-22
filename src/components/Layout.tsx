import { Outlet } from 'react-router-dom'
import { BottomNavbarDiagnostic } from '@/components/BottomNavbarDiagnostic'

export function Layout() {
    console.log('🔧 DIAGNOSTIC: Layout rendering')

    return (
        <div className="h-screen flex flex-col">
            <main className="flex-1 flex flex-col p-4 pb-0 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Outlet />
                </div>
            </main>
            <BottomNavbarDiagnostic />
        </div>
    )
}
