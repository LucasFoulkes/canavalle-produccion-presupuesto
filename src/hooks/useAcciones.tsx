import { useState, useEffect } from 'react'
import { useGenericCrud } from './useCrud'
import {
    AccionesService,
    Accion,
    CreateAccionData,
    UpdateAccionData
} from '@/services/acciones.service'

// Service configuration for useCrud
const accionesService = {
    getAll: AccionesService.getAllAcciones,
    create: AccionesService.createAccion,
    update: AccionesService.updateAccion,
    delete: AccionesService.deleteAccion,
    getById: AccionesService.getAccionById,
}

// Hook for CRUD operations on acciones
export const useAccionesCrud = (bloqueVariedadId?: number) => {
    // If bloqueVariedadId is provided, override getAll to fetch acciones by that relation
    const service = bloqueVariedadId
        ? { ...accionesService, getAll: () => AccionesService.getAccionesByBloqueVariedadId(bloqueVariedadId) }
        : accionesService

    const { items: acciones, getStateInfo, ...rest } = useGenericCrud<Accion, CreateAccionData, UpdateAccionData>(
        service
    )

    // Customize the state info for acciones
    const getAccionesStateInfo = () => {
        return getStateInfo("Cargando acciones...", "No hay acciones registradas")
    }

    return {
        acciones,
        getStateInfo: getAccionesStateInfo,
        ...rest
    }
}

// Hook for getting column names (existing functionality)
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