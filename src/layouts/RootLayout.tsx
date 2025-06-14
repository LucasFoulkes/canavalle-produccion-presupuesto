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
        <div className="flex flex-col min-h-screen">
            <main className="container mx-auto p-4 flex-grow ">
                {children}
            </main>
            <nav className="flex gap-2 p-2">
                <NavLink to="/acciones" label="acciones" />
                <NavLink to="/configuracion" label="configuracion" />
            </nav>
        </div>
    )
}
