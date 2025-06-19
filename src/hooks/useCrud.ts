import { useState, useEffect } from 'react'

interface CrudService<T, CreateData, UpdateData> {
    getAll: () => Promise<{ data: T[] | null; error: any }>
    create: (data: CreateData) => Promise<{ data: T | null; error: any }>
    update: (id: number, data: UpdateData) => Promise<{ data: T | null; error: any }>
    delete: (id: number) => Promise<{ data: any; error: any }>
}

export const useGenericCrud = <T extends { id: number }, CreateData, UpdateData>(
    service: CrudService<T, CreateData, UpdateData>,
    autoFetch = true
) => {
    const [items, setItems] = useState<T[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const executeAction = async <R>(
        action: () => Promise<{ data: R; error: any }>,
        onSuccess?: (data: R) => void
    ) => {
        setLoading(true)
        setError(null)

        const { data, error: err } = await action()

        if (err) {
            setError(err.message)
        } else if (data && onSuccess) {
            onSuccess(data)
        }

        setLoading(false)
        return { data, error: err }
    }

    // Generic state info for common UI patterns
    const getStateInfo = (
        loadingMessage: string = "Cargando...",
        emptyMessage: string = "No hay datos disponibles"
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

        if (items.length === 0) {
            return {
                shouldRender: true,
                stateProps: { message: emptyMessage, type: "empty" as const }
            }
        } return { shouldRender: false, stateProps: null }
    }

    const getAll = () => executeAction(
        service.getAll,
        (data) => setItems(data || [])
    )

    const create = (itemData: CreateData) => executeAction(
        () => service.create(itemData),
        (data) => data && setItems(prev => [...prev, data])
    )

    const update = (id: number, updates: UpdateData) => executeAction(
        () => service.update(id, updates),
        (data) => data && setItems(prev => prev.map(item => item.id === id ? data : item))
    )

    const remove = (id: number) => executeAction(
        () => service.delete(id),
        () => setItems(prev => prev.filter(item => item.id !== id))
    )

    useEffect(() => {
        if (autoFetch) getAll()
    }, [])

    return {
        items,
        loading,
        error,
        getStateInfo,
        getAll,
        create,
        update,
        remove,
    }
}