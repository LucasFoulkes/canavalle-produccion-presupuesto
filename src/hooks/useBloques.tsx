import { useGenericCrud } from './useCrud'
import { BloquesService, Bloque, CreateBloqueData, UpdateBloqueData } from '@/services/bloques.service'

const bloquesService = {
    getAll: BloquesService.getAllBloques,
    create: BloquesService.createBloque,
    update: BloquesService.updateBloque,
    delete: BloquesService.deleteBloque,
    getById: BloquesService.getBloqueById,
    getAllByFincaId: BloquesService.getBloquesByFincaId
}

export const useBloques = (fincaId?: number) => {
    // If a fincaId is provided, override getAll to fetch bloques by that finca
    const service = fincaId
        ? { ...bloquesService, getAll: () => BloquesService.getBloquesByFincaId(fincaId) }
        : bloquesService
    const { items: bloques, getStateInfo, ...rest } = useGenericCrud<Bloque, CreateBloqueData, UpdateBloqueData>(
        service
    )    // Customize the state info for bloques
    const getBloquesStateInfo = (emptyMessage: string = "No hay bloques disponibles") => {
        return getStateInfo("Cargando bloques...", emptyMessage)
    }

    return {
        bloques,
        getStateInfo: getBloquesStateInfo,
        ...rest
    }
}