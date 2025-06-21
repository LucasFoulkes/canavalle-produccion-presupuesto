import { useGenericCrud } from './useCrud'
import {
    VariedadesService,
    Variedad,
    CreateVariedadData,
    UpdateVariedadData
} from '@/services/variedades.service'

const variedadesService = {
    getAll: VariedadesService.getAllVariedades,
    create: VariedadesService.createVariedad,
    update: VariedadesService.updateVariedad,
    delete: VariedadesService.deleteVariedad,
    getById: VariedadesService.getVariedadById,
    getAllByParent: VariedadesService.getVariedadesByBloqueId
}

// Parent ID optional: if provided, fetch by bloque
export const useVariedades = (bloqueId?: number) => {
    const service = bloqueId
        ? { ...variedadesService, getAll: () => VariedadesService.getVariedadesByBloqueId(bloqueId) }
        : variedadesService

    const { items: variedades, getStateInfo, ...rest } = useGenericCrud<Variedad, CreateVariedadData, UpdateVariedadData>(
        service
    )

    const getVariedadesStateInfo = (emptyMessage: string = 'No hay variedades disponibles') =>
        getStateInfo('Cargando variedades...', emptyMessage)

    return {
        variedades,
        getStateInfo: getVariedadesStateInfo,
        ...rest
    }
}
