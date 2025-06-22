import { useState, useEffect } from 'react'
import { 
    DatosProductivosService, 
    DatoProductivo, 
    CreateDatoProductivoData, 
    UpdateDatoProductivoData 
} from '@/services/datos-productivos.service'

export function useDatosProductivos() {
    const [datosProductivos, setDatosProductivos] = useState<DatoProductivo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load datos productivos
    const loadDatosProductivos = async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await DatosProductivosService.getAllDatosProductivos()
            
            if (result.error) {
                setError(`Error cargando datos productivos: ${result.error.message}`)
                setDatosProductivos([])
            } else {
                setDatosProductivos(result.data || [])
            }
        } catch (err) {
            setError(`Error cargando datos productivos: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            setDatosProductivos([])
        } finally {
            setLoading(false)
        }
    }

    // Create new dato productivo
    const create = async (datoData: CreateDatoProductivoData) => {
        try {
            setLoading(true)
            setError(null)
            const result = await DatosProductivosService.createDatoProductivo(datoData)
            
            if (result.error) {
                setError(`Error creando dato productivo: ${result.error.message}`)
                return { success: false, error: result.error.message }
            } else {
                // Add the new dato to the list
                if (result.data) {
                    setDatosProductivos(prev => [...prev, result.data!])
                }
                return { success: true, data: result.data }
            }
        } catch (err) {
            const errorMessage = `Error creando dato productivo: ${err instanceof Error ? err.message : 'Error desconocido'}`
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }

    // Update existing dato productivo
    const update = async (id: number, updates: UpdateDatoProductivoData) => {
        try {
            setLoading(true)
            setError(null)
            const result = await DatosProductivosService.updateDatoProductivo(id, updates)
            
            if (result.error) {
                setError(`Error actualizando dato productivo: ${result.error.message}`)
                return { success: false, error: result.error.message }
            } else {
                // Update the dato in the list
                if (result.data) {
                    setDatosProductivos(prev => 
                        prev.map(dato => dato.id === id ? result.data! : dato)
                    )
                }
                return { success: true, data: result.data }
            }
        } catch (err) {
            const errorMessage = `Error actualizando dato productivo: ${err instanceof Error ? err.message : 'Error desconocido'}`
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }

    // Delete dato productivo
    const remove = async (id: number) => {
        try {
            setLoading(true)
            setError(null)
            const result = await DatosProductivosService.deleteDatoProductivo(id)
            
            if (result.error) {
                setError(`Error eliminando dato productivo: ${result.error.message}`)
                return { success: false, error: result.error.message }
            } else {
                // Remove the dato from the list
                setDatosProductivos(prev => prev.filter(dato => dato.id !== id))
                return { success: true }
            }
        } catch (err) {
            const errorMessage = `Error eliminando dato productivo: ${err instanceof Error ? err.message : 'Error desconocido'}`
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }

    // Get state info for rendering
    const getStateInfo = (emptyMessage: string = "No hay datos productivos configurados") => {
        if (loading) {
            return {
                shouldRender: true,
                stateProps: {
                    message: "Cargando datos productivos...",
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

        if (datosProductivos.length === 0) {
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
        loadDatosProductivos()
    }, [])

    return {
        datosProductivos,
        loading,
        error,
        create,
        update,
        remove,
        reload: loadDatosProductivos,
        getStateInfo
    }
}
