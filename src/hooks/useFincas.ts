import { useGenericCrud } from './useCrud'
import { FincasService, Finca, CreateFincaData, UpdateFincaData } from '@/services/fincas.service'

const fincasService = {
    getAll: FincasService.getAllFincas,
    create: FincasService.createFinca,
    update: FincasService.updateFinca,
    delete: FincasService.deleteFinca,
}

export const useFincas = () => {
    const { items: fincas, getStateInfo, ...rest } = useGenericCrud<Finca, CreateFincaData, UpdateFincaData>(
        fincasService
    )

    // Customize the state info for fincas
    const getFincasStateInfo = () => {
        return getStateInfo("Cargando fincas...")
    }

    return {
        fincas,
        getStateInfo: getFincasStateInfo,
        ...rest
    }
}