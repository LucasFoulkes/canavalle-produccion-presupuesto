import { useVariedades } from '@/hooks/useVariedades'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BloquesService } from '@/services/bloques.service'

// Interface definitions
interface ComponentBloque {
    id: number;
    nombre: string;
    finca_id: number;
}

// interface ComponentFinca {
//     id: number;
//     nombre: string;
// }

function VariedadesDiagnostic2() {
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

    // ✅ TESTING: Add back the hooks to see if they cause issues
    const { variedades, getStateInfo } = useVariedades(bloqueId ? parseInt(bloqueId) : undefined)

    // ✅ TESTING: Add back the async data fetching
    useEffect(() => {
        const fetchBloque = async () => {
            console.log('🔧 DIAGNOSTIC 2: Starting async data fetch')

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
    } const displayName = fincaNombre.replace(/-/g, ' ')

    // Commented out for now since we're not using it in this diagnostic
    // const finca: ComponentFinca = {
    //     id: parseInt(fincaId),
    //     nombre: displayName
    // }

    const stateInfo = getStateInfo(`No hay variedades configuradas para el bloque ${bloque?.nombre}`)

    console.log('🔧 DIAGNOSTIC 2:', {
        loading,
        error,
        bloque,
        variedades,
        stateInfo
    })

    if (loading) {
        return (
            <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
                <h1>🔧 DIAGNOSTIC 2 - Loading...</h1>
                <p>Testing with hooks and async data fetching</p>
            </div>
        )
    }

    if (error || !bloque) {
        return (
            <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
                <h1>🔧 DIAGNOSTIC 2 - Error</h1>
                <p>Error: {error || "Bloque not found"}</p>
            </div>
        )
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>🔧 DIAGNOSTIC 2 - Data Loaded</h1>
            <div style={{ marginBottom: '20px' }}>
                <h2>{displayName} • {bloque.nombre}</h2>
                <p>Loaded {variedades.length} variedades</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Variedades:</h3>
                <ul>
                    {variedades.map(variedad => (
                        <li key={variedad.id} style={{ marginBottom: '10px' }}>
                            <strong>{variedad.nombre}</strong>
                            <div style={{
                                display: 'inline-block',
                                marginLeft: '10px',
                                padding: '5px 10px',
                                backgroundColor: '#f0f0f0',
                                borderRadius: '4px'
                            }}>
                                [Variedad {variedad.id}]
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <button
                onClick={() => navigate(-1)}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                ← Go Back
            </button>
        </div>
    )
}

export default VariedadesDiagnostic2
