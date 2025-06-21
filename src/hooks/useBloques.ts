import { useGenericCrud } from './useCrud'
import { BloquesService, Bloque, CreateBloqueData, UpdateBloqueData } from '@/services/bloques.service'

const bloquesService = {
    getAll: BloquesService.getAllBloques,
    create: BloquesService.createBloque,
    update: BloquesService.updateBloque,
    delete: BloquesService.deleteBloque,
}

export const useBloques = () => {
    const { items: bloques, getStateInfo, ...rest } = useGenericCrud<Bloque, CreateBloqueData, UpdateBloqueData>(
        bloquesService
    )

    // Customize the state info for bloques
    const getBloquesStateInfo = () => {
        return getStateInfo("Cargando bloques...")
    }

    return {
        bloques,
        getStateInfo: getBloquesStateInfo,
        ...rest
    }
}
