import { useState, useEffect } from 'react'
import { AccionesService } from '@/services/acciones.service'

export const useAcciones = () => {
    const [columns, setColumns] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getColumns = async () => {
        setLoading(true)
        setError(null)

        const { data, error: err } = await AccionesService.getColumns()

        if (err) {
            setError(err.message)
        } else {
            setColumns(data || [])
        }

        setLoading(false)
    }

    // Generic state info for common UI patterns (like useCrud)
    const getStateInfo = (
        title: string = "Columnas de Acciones",
        loadingMessage: string = "Cargando columnas...",
        emptyMessage: string = "No hay columnas disponibles"
    ) => {
        if (loading) {
            return {
                shouldRender: true,
                stateProps: { title, message: loadingMessage, type: "loading" as const }
            }
        }

        if (error) {
            return {
                shouldRender: true,
                stateProps: { title, message: `Error: ${error}`, type: "error" as const }
            }
        }

        if (columns.length === 0) {
            return {
                shouldRender: true,
                stateProps: { title, message: emptyMessage, type: "empty" as const }
            }
        }

        return { shouldRender: false, stateProps: null }
    }

    useEffect(() => {
        getColumns()
    }, [])

    return {
        columns,
        loading,
        error,
        getStateInfo,
        getColumns
    }
}