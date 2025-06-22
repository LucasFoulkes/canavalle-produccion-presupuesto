import { useNavigate, useLocation } from 'react-router-dom'

export function BottomNavbarDiagnostic() {
    const navigate = useNavigate()
    const location = useLocation()

    console.log('🔧 DIAGNOSTIC: BottomNavbar rendering on:', location.pathname)

    const isActive = (path: string) => {
        if (path === '/acciones') {
            return location.pathname === '/acciones' ||
                location.pathname.startsWith('/acciones/') ||
                location.pathname.startsWith('/bloques/') ||
                location.pathname.startsWith('/variedades/')
        }
        return location.pathname === path
    }

    const buttonStyle = {
        flex: 1,
        height: '72px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        borderRadius: 0
    }

    const activeStyle = {
        ...buttonStyle,
        backgroundColor: '#007bff',
        color: 'white'
    }

    const inactiveStyle = {
        ...buttonStyle,
        backgroundColor: 'white',
        color: '#6b7280'
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            height: '72px',
            display: 'flex',
            borderTop: '1px solid #e5e7eb'
        }}>
            <button
                style={isActive('/acciones') ? activeStyle : inactiveStyle}
                onClick={() => navigate('/acciones')}
            >
                Actividad
            </button>
            <button
                style={isActive('/configuracion') ? activeStyle : inactiveStyle}
                onClick={() => navigate('/configuracion')}
            >
                Configuración
            </button>
            <button
                style={isActive('/reportes') ? activeStyle : inactiveStyle}
                onClick={() => navigate('/reportes')}
            >
                Reportes
            </button>
        </div>
    )
}
