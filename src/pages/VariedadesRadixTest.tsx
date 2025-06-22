import { useParams } from 'react-router-dom'
import { StateDisplay } from '@/components/StateDisplay'
import { BackButton } from '@/components/BackButton'
import { useVariedades } from '@/hooks/useVariedades'

// Let's start by reintroducing just the Button component
import { Button } from '@/components/ui/button'

export default function VariedadesRadixTest() {
    console.log('🧪 RADIX TEST: VariedadesRadixTest component rendering')
    
    const { fincaId, fincaNombre, accion, bloqueId } = useParams()
    
    if (!fincaId || !fincaNombre || !accion || !bloqueId) {
        console.error('🚨 Missing required parameters:', { fincaId, fincaNombre, accion, bloqueId })
        return <div>Error: Missing parameters</div>
    }

    const { variedades, loading, error } = useVariedades(parseInt(bloqueId))

    console.log('🧪 RADIX TEST: Hook results:', { 
        variedadesCount: variedades?.length, 
        loading, 
        error 
    })

    if (loading) {
        return (
            <div>
                <div className="text-lg font-semibold mb-4">Variedades</div>
                <div className="flex-1 flex items-center justify-center">
                    <StateDisplay message="Cargando variedades..." type="loading" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div>
                <div className="text-lg font-semibold mb-4">Variedades</div>
                <div className="flex-1 flex items-center justify-center">
                    <StateDisplay message={`Error: ${error}`} type="error" />
                </div>
            </div>
        )
    }

    console.log('🧪 RADIX TEST: About to render main content')

    return (
        <div>
            <div className="text-lg font-semibold mb-4">Variedades</div>
            <BackButton />
            
            <div className="flex-1 flex flex-col space-y-4">
                <div className="text-sm text-gray-600">
                    Finca: {fincaNombre} | Bloque: {bloqueId}
                </div>

                <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        {variedades?.map((variedad, index) => (
                            <div key={variedad.id || index} className="space-y-2">
                                <div className="text-lg font-medium">
                                    {variedad.nombre}
                                </div>
                                
                                {/* TEST: Simple Button component */}
                                <Button>
                                    Test Button
                                </Button>
                                
                                <div className="text-sm text-gray-500">
                                    ID: {variedad.id}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
