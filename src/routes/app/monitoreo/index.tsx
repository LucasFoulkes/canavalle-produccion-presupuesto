import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/app/monitoreo/')({
    component: MonitoreoComponent,
})

function MonitoreoComponent() {
    return (
        <div className='flex flex-col items-center justify-center h-full gap-6 p-8'>
            <h1 className='text-3xl font-bold text-gray-800'>Monitoreo de Producción</h1>
            <p className='text-gray-600 text-center max-w-md'>
                Esta es la página principal del sistema de monitoreo. Desde aquí puedes acceder a todas las funcionalidades de seguimiento.
            </p>
            <div className='flex gap-4'>
                <Link to='/app/monitoreo/config'>
                    <Button variant='default' size='lg' className='mt-4'>
                        Configuración
                    </Button>
                </Link>
            </div>
        </div>
    )
}
