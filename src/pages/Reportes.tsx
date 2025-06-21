import { ConstructionIcon, WrenchIcon } from 'lucide-react'

function Reportes() {
    return (
        <div className="flex flex-col h-full">
            <header className='relative w-full h-fit flex justify-center mb-8'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        Reportes
                    </h1>
                    <p className='text-gray-600'>Informes y estadísticas</p>
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="bg-orange-100 p-6 rounded-full">
                            <ConstructionIcon className="h-16 w-16 text-orange-600" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Página en Construcción
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Estamos trabajando en esta sección para brindarte los mejores reportes e informes.
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <WrenchIcon className="h-4 w-4" />
                        <span>Próximamente disponible</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Reportes
