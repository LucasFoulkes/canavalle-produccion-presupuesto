import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, Settings, BarChart3 } from 'lucide-react'

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

    const navigationItems = [
        {
            path: '/acciones',
            label: 'Actividad',
            icon: Activity
        },
        {
            path: '/configuracion',
            label: 'Configuración',
            icon: Settings
        },
        {
            path: '/reportes',
            label: 'Reportes',
            icon: BarChart3
        }
    ]

    return (
        <>
            {variant === 'mobile' && (
                /* Mobile Bottom Navigation */
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-[72px] flex z-50 shadow-lg">
                    {navigationItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.path}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 transition-all duration-200 ${isActive(item.path)
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                onClick={() => navigate(item.path)}
                            >
                                <Icon size={20} className="stroke-current" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            {variant === 'desktop' && (
                /* Desktop Side Navigation */
                <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-1">
                            CañanValle
                        </h2>
                        <p className="text-sm text-gray-500">Sistema de Producción</p>
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <button
                                    key={item.path}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${isActive(item.path)
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                                        }`}
                                    onClick={() => navigate(item.path)}
                                >
                                    <Icon size={20} className="stroke-current" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                    <div className="p-4 border-t border-gray-100">
                        <div className="text-xs text-gray-400 text-center">
                            v1.0.0
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
