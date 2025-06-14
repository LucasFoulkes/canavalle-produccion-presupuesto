import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

function NavLink({ to, label }: { to: string; label?: string }) {
    return (
        <Link to={to} className="flex-1">
            <Button className="uppercase w-full h-16">{label}</Button>
        </Link>
    )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full">
            <main className="flex-1 overflow-auto p-4">
                {children}
            </main>
            <nav className="flex gap-4 p-4 pb-7 shrink-0 bg-black">
                <NavLink to="/acciones" label="acciones" />
                <NavLink to="/configuracion" label="configuracion" />
            </nav>
        </div>
    )
}
