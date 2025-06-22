import { useVariedades } from '@/hooks/useVariedades'
import { StateDisplay } from '@/components/StateDisplay'
import { VariedadButtonWithValue } from '@/components/VariedadButtonWithValue'
import { ActionBadge } from '@/components/ActionBadge'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BloquesService } from '@/services/bloques.service'
import { BackButton } from '@/components/BackButton'

// Use the component interface to match what VariedadButtonWithValue expects
interface ComponentBloque {
    id: number;
    nombre: string;
    finca_id: number;
}

// Interface for the finca object needed by VariedadButtonWithValue
interface ComponentFinca {
    id: number;
    nombre: string;
}

function Variedades() {
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

    const { variedades, getStateInfo } = useVariedades(bloqueId ? parseInt(bloqueId) : undefined)    // Fetch only bloque data (finca name comes from URL)
    useEffect(() => {
        const fetchBloque = async () => {
            console.log('🔍 Variedades useEffect - Starting fetch')
            console.log('Params:', { fincaId, fincaNombre, bloqueId, accion })

            if (!fincaId || !fincaNombre || !bloqueId || !accion) {
                console.log('❌ Missing required params, redirecting to /fincas')
                navigate('/fincas')
                return
            }

            setLoading(true)
            setError(null)

            try {
                console.log('📡 Fetching bloque with ID:', bloqueId)
                const bloqueResult = await BloquesService.getBloqueById(parseInt(bloqueId))

                console.log('📋 Bloque result:', bloqueResult)

                if (bloqueResult.error) {
                    console.log('❌ Bloque fetch error:', bloqueResult.error)
                    setError(`Error al cargar bloque: ${bloqueResult.error.message}`)
                    return
                }

                if (!bloqueResult.data) {
                    console.log('❌ No bloque data found')
                    setError('Bloque no encontrado')
                    return
                }

                // Verify that bloque belongs to finca
                const expectedFincaId = parseInt(fincaId)
                const actualFincaId = bloqueResult.data.finca_id

                console.log('🔍 Finca ID validation:', {
                    expected: expectedFincaId,
                    actual: actualFincaId
                })

                if (actualFincaId !== expectedFincaId) {
                    console.log('❌ Bloque does not belong to finca')
                    setError('El bloque no pertenece a esta finca')
                    return
                }

                console.log('✅ Setting bloque data:', bloqueResult.data)
                setBloque({
                    id: bloqueResult.data.id,
                    nombre: bloqueResult.data.nombre,
                    finca_id: bloqueResult.data.finca_id || parseInt(fincaId)
                })

                console.log('✅ Variedades page loaded successfully')
            } catch (err) {
                console.log('❌ Exception in fetchBloque:', err)
                setError(`Error cargando datos: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            } finally {
                console.log('🔄 Setting loading to false')
                setLoading(false)
            }
        }

        fetchBloque()
    }, [fincaId, fincaNombre, bloqueId, accion, navigate])

    // Redirect if missing required params
    if (!fincaId || !fincaNombre || !bloqueId || !accion) {
        navigate('/fincas')
        return null
    }

    // Convert URL-safe name back to display format
    const displayName = fincaNombre.replace(/-/g, ' ')

    // Create finca object from URL params for component compatibility
    const finca: ComponentFinca = {
        id: parseInt(fincaId),
        nombre: displayName
    }    // Show loading or error states
    if (loading) {
        console.log('🔄 Showing loading state')
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateDisplay message="Cargando datos..." type="loading" />
            </div>
        )
    }

    if (error || !bloque) {
        console.log('❌ Showing error state:', { error, bloque })
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateDisplay message={error || "Datos no encontrados"} type="error" />
            </div>
        )
    }

    const stateInfo = getStateInfo(`No hay variedades configuradas para el bloque ${bloque.nombre}`)

    return (
        <>
            <header className='relative w-full h-fit flex justify-center mb-4'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {displayName} • {bloque.nombre}
                    </h1>
                    <p className='text-gray-600'>Selecciona una variedad</p>                </div>
                <BackButton to={`/bloques/${fincaId}/${fincaNombre}/${accion}`} />
            </header>
            <ActionBadge action={accion} />
            {stateInfo.shouldRender && stateInfo.stateProps ? (
                <div className="flex-1 flex items-center justify-center">
                    <StateDisplay {...stateInfo.stateProps} />
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center w-full overflow-y-auto pb-20 mt-2">
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
        </>
    )
}

export default Variedades
