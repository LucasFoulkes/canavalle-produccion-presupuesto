import { Outlet } from 'react-router-dom'
import { BottomNavbar } from '@/components/BottomNavbar'

export function Layout() {
    return (
        <div className="h-screen flex flex-col">
            <main className="flex-1 flex flex-col p-4 pb-0 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Outlet />
                </div>
            </main>
            <BottomNavbar />
        </div>
    )
}
