import { useGenericCrud } from './useCrud'
import { BloqueVariedadService, BloqueVariedadWithNames, CreateBloqueVariedadData, UpdateBloqueVariedadData } from '@/services/bloque-variedad.service'

// Custom service wrapper for bloque-variedad with names
const bloqueVariedadService = {
    getAll: BloqueVariedadService.getAllBloqueVariedadesWithNames,
    create: async (data: CreateBloqueVariedadData) => {
        const result = await BloqueVariedadService.createBloqueVariedad(data)
        // Note: The result won't have the joined names, but the generic CRUD will refresh the data
        return result
    },
    update: async (id: number, data: UpdateBloqueVariedadData) => {
        const result = await BloqueVariedadService.updateBloqueVariedad(id, data)
        // Note: The result won't have the joined names, but the generic CRUD will refresh the data
        return result
    },
    delete: BloqueVariedadService.deleteBloqueVariedad,
}

export const useBloqueVariedadesWithNames = () => {
    const { items: bloqueVariedades, getStateInfo, getAll, ...rest } = useGenericCrud<BloqueVariedadWithNames, CreateBloqueVariedadData, UpdateBloqueVariedadData>(
        bloqueVariedadService
    )

    // Customize the state info for bloque variedades
    const getBloqueVariedadesStateInfo = () => {
        return getStateInfo("Cargando relaciones bloque-variedad...")
    }

    // Override CRUD methods to refresh data after operations
    const createWithRefresh = async (data: CreateBloqueVariedadData) => {
        const result = await rest.create(data)
        if (result.data && !result.error) {
            await getAll()
        }
        return result
    }

    const updateWithRefresh = async (id: number, data: UpdateBloqueVariedadData) => {
        const result = await rest.update(id, data)
        if (result.data && !result.error) {
            await getAll()
        }
        return result
    }

    const removeWithRefresh = async (id: number) => {
        const result = await rest.remove(id)
        if (!result.error) {
            await getAll()
        }
        return result
    }

    return {
        bloqueVariedades,
        getStateInfo: getBloqueVariedadesStateInfo,
        ...rest,
        create: createWithRefresh,
        update: updateWithRefresh,
        remove: removeWithRefresh,
    }
}
