import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

function NavLink({ to, label }: { to: string; label?: string }) {
    return (
        <Link to={to} className="flex-1">
            <Button className="uppercase w-full h-16 bg-gray-100 hover:bg-gray-200" variant="ghost">{label}</Button>
        </Link>
    )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full bg-gray-100">            <main className="flex-1 overflow-auto p-4 bg-gray-100">
            {children}
        </main>
            <nav className="flex gap-4 p-4 bg-gray-100 bg-safe-extend">
                <NavLink to="/acciones" label="acciones" />
                <NavLink to="/configuracion" label="configuracion" />
            </nav>
        </div>
    )
}
