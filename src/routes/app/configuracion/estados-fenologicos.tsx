import { Button } from '@/components/ui/button'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/configuracion/estados-fenologicos')({
    component: EstadosFenologicosComponent,
})

// Mock data for estados fenológicos
const estadosFenologicos = [
    { id: 1, nombre: 'Germinación', descripcion: 'Inicio del crecimiento de la semilla' },
    { id: 2, nombre: 'Emergencia', descripcion: 'Aparición de los primeros brotes' },
    { id: 3, nombre: 'Crecimiento vegetativo', descripcion: 'Desarrollo de hojas y tallos' },
    { id: 4, nombre: 'Floración', descripcion: 'Aparición de flores' },
    { id: 5, nombre: 'Formación de frutos', descripcion: 'Desarrollo inicial de frutos' },
    { id: 6, nombre: 'Maduración', descripcion: 'Madurez de los frutos' },
    { id: 7, nombre: 'Cosecha', descripcion: 'Recolección de frutos maduros' },
]

function EstadosFenologicosComponent() {
    const [estados] = useState(estadosFenologicos)
    const navigate = useNavigate()

    return (
        <div className="flex h-full flex-col p-2 pb-0 gap-2">
            <div className="flex items-center justify-center relative">
                <ChevronLeft
                    className="h-6 w-6 absolute left-2 cursor-pointer"
                    onClick={() => navigate({ to: '/app/configuracion' })}
                />
                <div>
                    <h1 className='text-2xl font-thin'>
                        Estados Fenológicos
                    </h1>
                </div>
            </div>

            <div className='flex-1 overflow-y-auto'>
                <div className='space-y-2'>
                    {estados.map((estado) => (
                        <div
                            key={estado.id}
                            className='flex items-center justify-between p-3 border rounded-lg'
                        >
                            <div>
                                <span className='font-medium'>{estado.nombre}</span>
                                <p className='text-sm text-gray-500'>{estado.descripcion}</p>
                            </div>
                            <Button variant="outline" size="sm">
                                Editar
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
