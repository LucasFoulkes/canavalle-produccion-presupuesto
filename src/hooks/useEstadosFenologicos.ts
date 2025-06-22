import { useState, useEffect } from 'react'
import {
    EstadosFenologicosService,
    EstadoFenologico,
    CreateEstadoFenologicoData,
    UpdateEstadoFenologicoData
} from '@/services/estados-fenologicos.service'

export function useEstadosFenologicos() {
    const [estadosFenologicos, setEstadosFenologicos] = useState<EstadoFenologico[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load estados fenologicos
    const loadEstadosFenologicos = async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await EstadosFenologicosService.getAllEstadosFenologicos()

            if (result.error) {
                setError(`Error cargando estados fenológicos: ${result.error.message}`)
                setEstadosFenologicos([])
            } else {
                setEstadosFenologicos(result.data || [])
            }
        } catch (err) {
            setError(`Error cargando estados fenológicos: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            setEstadosFenologicos([])
        } finally {
            setLoading(false)
        }
    }

    // Create new estado fenologico
    const create = async (estadoData: CreateEstadoFenologicoData) => {
        try {
            setLoading(true)
            setError(null)
            const result = await EstadosFenologicosService.createEstadoFenologico(estadoData)

            if (result.error) {
                setError(`Error creando estado fenológico: ${result.error.message}`)
                return { success: false, error: result.error.message }
            } else {                // Add the new estado to the list
                if (result.data) {
                    setEstadosFenologicos(prev => [...prev, result.data!])
                }
                return { success: true, data: result.data }
            }
        } catch (err) {
            const errorMessage = `Error creando estado fenológico: ${err instanceof Error ? err.message : 'Error desconocido'}`
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }

    // Update existing estado fenologico
    const update = async (id: number, updates: UpdateEstadoFenologicoData) => {
        try {
            setLoading(true)
            setError(null)
            const result = await EstadosFenologicosService.updateEstadoFenologico(id, updates)

            if (result.error) {
                setError(`Error actualizando estado fenológico: ${result.error.message}`)
                return { success: false, error: result.error.message }
            } else {                // Update the estado in the list
                if (result.data) {
                    setEstadosFenologicos(prev =>
                        prev.map(estado => estado.id === id ? result.data! : estado)
                    )
                }
                return { success: true, data: result.data }
            }
        } catch (err) {
            const errorMessage = `Error actualizando estado fenológico: ${err instanceof Error ? err.message : 'Error desconocido'}`
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }

    // Delete estado fenologico
    const remove = async (id: number) => {
        try {
            setLoading(true)
            setError(null)
            const result = await EstadosFenologicosService.deleteEstadoFenologico(id)

            if (result.error) {
                setError(`Error eliminando estado fenológico: ${result.error.message}`)
                return { success: false, error: result.error.message }
            } else {
                // Remove the estado from the list
                setEstadosFenologicos(prev => prev.filter(estado => estado.id !== id))
                return { success: true }
            }
        } catch (err) {
            const errorMessage = `Error eliminando estado fenológico: ${err instanceof Error ? err.message : 'Error desconocido'}`
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }

    // Get state info for rendering
    const getStateInfo = (emptyMessage: string = "No hay estados fenológicos configurados") => {
        if (loading) {
            return {
                shouldRender: true,
                stateProps: {
                    message: "Cargando estados fenológicos...",
                    type: "loading" as const
                }
            }
        }

        if (error) {
            return {
                shouldRender: true,
                stateProps: {
                    message: error,
                    type: "error" as const
                }
            }
        }

        if (estadosFenologicos.length === 0) {
            return {
                shouldRender: true,
                stateProps: {
                    message: emptyMessage,
                    type: "empty" as const
                }
            }
        }

        return {
            shouldRender: false,
            stateProps: null
        }
    }

    // Load data on mount
    useEffect(() => {
        loadEstadosFenologicos()
    }, [])

    return {
        estadosFenologicos,
        loading,
        error,
        create,
        update,
        remove,
        reload: loadEstadosFenologicos,
        getStateInfo
    }
}
