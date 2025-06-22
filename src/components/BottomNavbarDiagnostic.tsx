import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface BottomNavbarDiagnosticProps {
    variant?: 'mobile' | 'desktop'
}

export function BottomNavbarDiagnostic({ variant = 'mobile' }: BottomNavbarDiagnosticProps) {
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

    // Mobile bottom navigation styles
    const mobileButtonStyle = {
        flex: 1,
        height: '72px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        borderRadius: 0
    }

    const mobileActiveStyle = {
        ...mobileButtonStyle,
        backgroundColor: '#007bff',
        color: 'white'
    }

    const mobileInactiveStyle = {
        ...mobileButtonStyle,
        backgroundColor: 'white',
        color: '#6b7280'
    }    // Desktop side navigation styles
    const desktopButtonStyle = {
        width: '100%',
        height: '56px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        borderRadius: '8px',
        margin: '4px 0',
        padding: '0 16px',
        textAlign: 'left' as const,
        transition: 'all 0.2s ease'
    }

    const desktopActiveStyle = {
        ...desktopButtonStyle,
        backgroundColor: '#007bff',
        color: 'white'
    }

    const desktopInactiveStyle = {
        ...desktopButtonStyle,
        backgroundColor: 'transparent',
        color: '#6b7280'
    }

    const handleDesktopButtonMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive(e.currentTarget.dataset.path || '')) {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
        }
    }

    const handleDesktopButtonMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive(e.currentTarget.dataset.path || '')) {
            e.currentTarget.style.backgroundColor = 'transparent'
        }
    }

    return (
        <>
            {variant === 'mobile' && (
                /* Mobile Bottom Navigation */
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    height: '72px',
                    display: 'flex',
                    borderTop: '1px solid #e5e7eb',
                    zIndex: 50
                }}>
                    <button
                        style={isActive('/acciones') ? mobileActiveStyle : mobileInactiveStyle}
                        onClick={() => navigate('/acciones')}
                    >
                        Actividad
                    </button>
                    <button
                        style={isActive('/configuracion') ? mobileActiveStyle : mobileInactiveStyle}
                        onClick={() => navigate('/configuracion')}
                    >
                        Configuración
                    </button>
                    <button
                        style={isActive('/reportes') ? mobileActiveStyle : mobileInactiveStyle}
                        onClick={() => navigate('/reportes')}
                    >
                        Reportes
                    </button>
                </div>
            )}

            {variant === 'desktop' && (
                /* Desktop Side Navigation */
                <div style={{
                    width: '220px',
                    height: '100vh',
                    backgroundColor: 'white',
                    borderRight: '1px solid #e5e7eb',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: '0 0 16px 0'
                        }}>
                            Navegación
                        </h2>
                    </div>
                    <nav style={{ flex: 1 }}>
                        <button
                            style={isActive('/acciones') ? desktopActiveStyle : desktopInactiveStyle}
                            onClick={() => navigate('/acciones')}
                            data-path="/acciones"
                            onMouseEnter={handleDesktopButtonMouseEnter}
                            onMouseLeave={handleDesktopButtonMouseLeave}
                        >
                            Actividad
                        </button>
                        <button
                            style={isActive('/configuracion') ? desktopActiveStyle : desktopInactiveStyle}
                            onClick={() => navigate('/configuracion')}
                            data-path="/configuracion"
                            onMouseEnter={handleDesktopButtonMouseEnter}
                            onMouseLeave={handleDesktopButtonMouseLeave}
                        >
                            Configuración
                        </button>
                        <button
                            style={isActive('/reportes') ? desktopActiveStyle : desktopInactiveStyle}
                            onClick={() => navigate('/reportes')}
                            data-path="/reportes"
                            onMouseEnter={handleDesktopButtonMouseEnter}
                            onMouseLeave={handleDesktopButtonMouseLeave}
                        >
                            Reportes
                        </button>
                    </nav>
                </div>
            )}
        </>
    )
}
