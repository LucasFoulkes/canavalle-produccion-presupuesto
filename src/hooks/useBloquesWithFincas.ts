import { useState, useEffect } from 'react'
import { BloquesService, BloqueWithFinca } from '@/services/bloques.service'

export const useBloquesWithFincas = () => {
    const [bloques, setBloques] = useState<BloqueWithFinca[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBloques = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await BloquesService.getAllBloquesWithFincas()

            if (fetchError) {
                setError(fetchError.message)
            } else {
                setBloques(data || [])
            }
        } catch (err) {
            setError('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBloques()
    }, [])

    // Generic state info for common UI patterns
    const getStateInfo = (
        loadingMessage: string = "Cargando bloques...",
        emptyMessage: string = "No hay bloques disponibles"
    ) => {
        if (loading) {
            return {
                shouldRender: true,
                stateProps: { message: loadingMessage, type: "loading" as const }
            }
        }

        if (error) {
            return {
                shouldRender: true,
                stateProps: { message: `Error: ${error}`, type: "error" as const }
            }
        }

        if (bloques.length === 0) {
            return {
                shouldRender: true,
                stateProps: { message: emptyMessage, type: "empty" as const }
            }
        }

        return { shouldRender: false, stateProps: null }
    }

    return {
        bloques,
        loading,
        error,
        getStateInfo,
        refetch: fetchBloques
    }
}
