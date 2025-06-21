import { useGenericCrud } from './useCrud'
import { BloquesService, BloqueWithFinca, CreateBloqueData, UpdateBloqueData } from '@/services/bloques.service'

// Custom service wrapper for bloques with fincas
const bloquesWithFincasService = {
    getAll: BloquesService.getAllBloquesWithFincas,
    create: BloquesService.createBloque,
    update: BloquesService.updateBloque,
    delete: BloquesService.deleteBloque,
}

export const useBloquesWithFincas = () => {
    const { items: bloques, getStateInfo, ...rest } = useGenericCrud<BloqueWithFinca, CreateBloqueData, UpdateBloqueData>(
        bloquesWithFincasService
    )

    // Customize the state info for bloques
    const getBloquesStateInfo = () => {
        return getStateInfo("Cargando bloques...")
    }

    return {
        bloques,
        getStateInfo: getBloquesStateInfo, ...rest
    }
}
