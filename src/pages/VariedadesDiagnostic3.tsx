import { useVariedades } from '@/hooks/useVariedades'
import { StateDisplay } from '@/components/StateDisplay'
import { VariedadButtonWithValue } from '@/components/VariedadButtonWithValue'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BloquesService } from '@/services/bloques.service'
import { BackButton } from '@/components/BackButton'

interface ComponentBloque {
    id: number;
    nombre: string;
    finca_id: number;
}

interface ComponentFinca {
    id: number;
    nombre: string;
}

function VariedadesDiagnostic3() {
    const navigate = useNavigate()
    const { fincaId, fincaNombre, accion, bloqueId } = useParams<{
        fincaId: string;
        fincaNombre: string;
        accion: string;
        bloqueId: string
    }>()

    const [bloque, setBloque] = useState<ComponentBloque | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const { variedades, getStateInfo } = useVariedades(bloqueId ? parseInt(bloqueId) : undefined)

    useEffect(() => {
        const fetchBloque = async () => {
            console.log('🔍 Diagnostic 3 - Starting fetch')

            if (!fincaId || !fincaNombre || !bloqueId || !accion) {
                navigate('/fincas')
                return
            }

            setLoading(true)
            setError(null)

            try {
                const bloqueResult = await BloquesService.getBloqueById(parseInt(bloqueId))

                if (bloqueResult.error || !bloqueResult.data) {
                    setError('Bloque no encontrado')
                    return
                }

                const expectedFincaId = parseInt(fincaId)
                const actualFincaId = bloqueResult.data.finca_id

                if (actualFincaId !== expectedFincaId) {
                    setError('El bloque no pertenece a esta finca')
                    return
                }

                setBloque({
                    id: bloqueResult.data.id,
                    nombre: bloqueResult.data.nombre,
                    finca_id: bloqueResult.data.finca_id || parseInt(fincaId)
                })

            } catch (err) {
                setError(`Error cargando datos: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            } finally {
                setLoading(false)
            }
        }

        fetchBloque()
    }, [fincaId, fincaNombre, bloqueId, accion, navigate])

    if (!fincaId || !fincaNombre || !bloqueId || !accion) {
        navigate('/fincas')
        return null
    } const displayName = fincaNombre.replace(/-/g, ' ')

    // Create finca object from URL params for component compatibility
    const finca: ComponentFinca = {
        id: parseInt(fincaId),
        nombre: displayName
    }

    const stateInfo = getStateInfo(`No hay variedades configuradas para el bloque ${bloque?.nombre}`)

    console.log('🔧 DIAGNOSTIC 3 - BackButton added:', {
        loading,
        error,
        bloque: bloque?.nombre,
        variedadesCount: variedades?.length || 0
    })

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateDisplay message="Cargando datos..." type="loading" />
            </div>
        )
    }

    if (error || !bloque) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateDisplay message={error || "Datos no encontrados"} type="error" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <header className='relative w-full h-fit flex justify-center mb-4'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {displayName} • {bloque.nombre}
                    </h1>
                    <p className='text-gray-600'>Selecciona una variedad</p>
                </div>
                {/* 🧪 TEST: Adding BackButton (no Radix UI) */}
                <BackButton to={`/bloques/${fincaId}/${fincaNombre}/${accion}`} />
            </header>

            {/* 🧪 TEST: No ActionBadge yet (contains Badge/Radix UI) */}
            <div className="w-full flex justify-center items-center mb-4">
                <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                    {accion.replace(/_/g, ' ')}
                </div>
            </div>

            {stateInfo.shouldRender && stateInfo.stateProps ? (
                <div className="flex-1 flex items-center justify-center">
                    <StateDisplay {...stateInfo.stateProps} />
                </div>
            ) : (<div className="flex-1 flex items-center justify-center w-full overflow-y-auto pb-20 mt-2">
                <div className='grid gap-3 w-full max-w-md grid-cols-1'>
                    {variedades.map(variedad => (
                        <VariedadButtonWithValue
                            key={variedad.id}
                            finca={finca}
                            bloque={bloque}
                            variedad={variedad}
                            accion={accion || ''}
                        />
                    ))}
                </div>
            </div>
            )}
        </div>
    )
}

export default VariedadesDiagnostic3
