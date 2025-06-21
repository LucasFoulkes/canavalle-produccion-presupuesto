import { Button } from '@/components/ui/button'
import { useNavigate, useLocation } from 'react-router-dom'

export function BottomNavbar() {
    const navigate = useNavigate()
    const location = useLocation()

    const isActive = (path: string) => {
        if (path === '/fincas') {
            return location.pathname === '/fincas' ||
                location.pathname.startsWith('/acciones/') ||
                location.pathname.startsWith('/bloques/') ||
                location.pathname.startsWith('/variedades/')
        }
        return location.pathname === path
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="flex">
                <Button
                    variant={isActive('/fincas') ? 'default' : 'ghost'}
                    className="flex-1 h-16 rounded-none border-r border-gray-200"
                    onClick={() => navigate('/fincas')}
                >
                    Fincas
                </Button>
                <Button
                    variant={isActive('/configuracion') ? 'default' : 'ghost'}
                    className="flex-1 h-16 rounded-none"
                    onClick={() => navigate('/configuracion')}
                >
                    Configuración
                </Button>
            </div>
        </div>
    )
}
