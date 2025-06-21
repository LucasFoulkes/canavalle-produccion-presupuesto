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

    const { variedades, getStateInfo } = useVariedades(bloqueId ? parseInt(bloqueId) : undefined)

    useEffect(() => {
        const fetchBloque = async () => {
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

                if (bloqueResult.data.finca_id !== parseInt(fincaId)) {
                    setError('El bloque no pertenece a esta finca')
                    return
                }

                setBloque({
                    id: bloqueResult.data.id,
                    nombre: bloqueResult.data.nombre,
                    finca_id: bloqueResult.data.finca_id || parseInt(fincaId)
                })
            } catch (err) {
                setError('Error cargando datos')
            } finally {
                setLoading(false)
            }
        }

        fetchBloque()
    }, [fincaId, fincaNombre, bloqueId, accion, navigate])

    if (!fincaId || !fincaNombre || !bloqueId || !accion) {
        navigate('/fincas')
        return null
    }

    const displayName = fincaNombre.replace(/-/g, ' ')

    const finca: ComponentFinca = {
        id: parseInt(fincaId),
        nombre: displayName
    }

    if (loading) {
        return <StateDisplay message="Cargando datos..." type="loading" />
    } if (error || !bloque) {
        return <StateDisplay message={error || "Datos no encontrados"} type="error" />
    }

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } return (
        <>
            <header className='relative w-full h-fit flex justify-center mb-4'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {displayName} • {bloque.nombre}
                    </h1>
                    <p className='text-gray-600'>Selecciona una variedad</p>
                </div>
                <BackButton to={`/bloques/${fincaId}/${fincaNombre}/${accion}`} />
            </header>
            <ActionBadge action={accion} />
            <div className='flex-1 flex flex-col items-center justify-center w-full h-full'>
                <div className='grid gap-3 w-full grid-cols-1'>
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
        </>
    )
}

export default Variedades
