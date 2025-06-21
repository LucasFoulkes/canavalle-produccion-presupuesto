import { Outlet } from 'react-router-dom'
import { BottomNavbar } from '@/components/BottomNavbar'

export function Layout() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1 flex flex-col p-4 pb-20">
                <Outlet />
            </main>
            <BottomNavbar />
        </div>
    )
}
