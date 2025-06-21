import { Button } from '@/components/ui/button'
import { useNavigate, useLocation } from 'react-router-dom'

export function BottomNavbar() {
    const navigate = useNavigate()
    const location = useLocation()

    const isActive = (path: string) => {
        if (path === '/acciones') {
            return location.pathname === '/acciones' ||
                location.pathname.startsWith('/acciones/') ||
                location.pathname.startsWith('/bloques/') ||
                location.pathname.startsWith('/variedades/')
        }
        return location.pathname === path
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white h-18 flex">
            <Button
                variant={isActive('/acciones') ? 'default' : 'ghost'}
                className="flex-1 h-full rounded-none"
                onClick={() => navigate('/acciones')}
            >
                Actividad
            </Button>
            <Button
                variant={isActive('/configuracion') ? 'default' : 'ghost'}
                className="flex-1 h-full rounded-none"
                onClick={() => navigate('/configuracion')}
            >
                Configuración
            </Button>
            <Button
                variant={isActive('/reportes') ? 'default' : 'ghost'}
                className="flex-1 h-full rounded-none"
                onClick={() => navigate('/reportes')}
            >
                Reportes
            </Button>
        </div>
    )
}
