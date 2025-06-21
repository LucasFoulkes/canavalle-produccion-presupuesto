import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CrudTable } from '@/components/CrudTable'
import { useFincas } from '@/hooks/useFincas'
import { useVariedades } from '@/hooks/useVariedades'
import { useBloques } from '@/hooks/useBloques'
import { useBloquesWithFincas } from '@/hooks/useBloquesWithFincas'
import { useBloqueVariedadesWithNames } from '@/hooks/useBloqueVariedadesWithNames'

function Configuracion() {
    const fincasHook = useFincas()
    const variedadesHook = useVariedades()
    const bloquesHook = useBloques()
    const bloquesWithFincasHook = useBloquesWithFincas() // For dropdown options
    const bloqueVariedadesHook = useBloqueVariedadesWithNames()

    // Get state info
    const fincasStateInfo = fincasHook.getStateInfo()
    const variedadesStateInfo = variedadesHook.getStateInfo()
    const bloquesStateInfo = bloquesHook.getStateInfo()
    const bloqueVariedadesStateInfo = bloqueVariedadesHook.getStateInfo()

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden pb-20">
                <Tabs defaultValue="fincas" className="w-full flex flex-col h-full">
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="fincas">Fincas</TabsTrigger>
                        <TabsTrigger value="bloques">Bloques</TabsTrigger>
                        <TabsTrigger value="variedades">Variedades</TabsTrigger>
                        <TabsTrigger value="bloque-variedad">Relaciones</TabsTrigger>
                    </TabsList><TabsContent value="fincas" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Fincas"
                            data={fincasHook.fincas}
                            columns={[
                                { key: 'nombre', label: 'Nombre', filterable: true }
                            ]}
                            formFields={[
                                { key: 'nombre', label: 'Nombre', required: true }
                            ]}
                            loading={fincasHook.loading}
                            error={fincasHook.error}
                            isEmpty={fincasStateInfo.shouldRender && fincasStateInfo.stateProps?.type === 'empty'}
                            emptyMessage="No hay fincas configuradas"
                            loadingMessage="Cargando fincas..."
                            onCreate={fincasHook.create}
                            onUpdate={fincasHook.update}
                            onDelete={fincasHook.remove}
                            crudLoading={fincasHook.loading}
                            searchable={true}
                            searchPlaceholder="Buscar fincas..."
                        />
                    </TabsContent>                    <TabsContent value="bloques" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Bloques"
                            data={bloquesHook.bloques}
                            columns={[
                                { key: 'nombre', label: 'Nombre', filterable: true },
                                {
                                    key: 'finca_id',
                                    label: 'Finca',
                                    render: (bloque) => {
                                        const finca = fincasHook.fincas.find(f => f.id === bloque.finca_id)
                                        return finca?.nombre || 'Sin finca'
                                    },
                                    filterable: true
                                }
                            ]}
                            formFields={[
                                { key: 'nombre', label: 'Nombre', required: true },
                                {
                                    key: 'finca_id',
                                    label: 'Finca',
                                    type: 'select',
                                    required: true,
                                    options: fincasHook.fincas.map(f => ({ value: f.id, label: f.nombre }))
                                }
                            ]}
                            loading={bloquesHook.loading}
                            error={bloquesHook.error}
                            isEmpty={bloquesStateInfo.shouldRender && bloquesStateInfo.stateProps?.type === 'empty'}
                            emptyMessage="No hay bloques configurados"
                            loadingMessage="Cargando bloques..."
                            onCreate={bloquesHook.create}
                            onUpdate={bloquesHook.update}
                            onDelete={bloquesHook.remove}
                            crudLoading={bloquesHook.loading}
                            searchable={true}
                            searchPlaceholder="Buscar bloques..." filters={[
                                {
                                    key: 'finca_id',
                                    label: 'Filtrar por Finca',
                                    getUniqueValues: (data) => {
                                        const uniqueFincas = new Set(data.map(item => item.finca_id).filter(Boolean))
                                        return Array.from(uniqueFincas).map(fincaId => {
                                            const finca = fincasHook.fincas.find(f => f.id === fincaId)
                                            return {
                                                value: String(fincaId), // Use the actual finca_id as the filter value
                                                label: finca?.nombre || 'Sin finca'
                                            }
                                        })
                                    }
                                }
                            ]}
                        />
                    </TabsContent>
                    <TabsContent value="variedades" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Variedades"
                            data={variedadesHook.variedades}
                            columns={[
                                { key: 'nombre', label: 'Nombre', filterable: true }
                            ]}
                            formFields={[
                                { key: 'nombre', label: 'Nombre', required: true }
                            ]}
                            loading={variedadesHook.loading}
                            error={variedadesHook.error}
                            isEmpty={variedadesStateInfo.shouldRender && variedadesStateInfo.stateProps?.type === 'empty'}
                            emptyMessage="No hay variedades configuradas"
                            loadingMessage="Cargando variedades..."
                            onCreate={variedadesHook.create}
                            onUpdate={variedadesHook.update}
                            onDelete={variedadesHook.remove}
                            crudLoading={variedadesHook.loading}
                            searchable={true}
                            searchPlaceholder="Buscar variedades..."
                        />
                    </TabsContent>
                    <TabsContent value="bloque-variedad" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Relaciones Bloque-Variedad"
                            data={bloqueVariedadesHook.bloqueVariedades}
                            columns={[
                                { key: 'finca_nombre', label: 'Finca', filterable: true },
                                { key: 'bloque_nombre', label: 'Bloque', filterable: true },
                                { key: 'variedad_nombre', label: 'Variedad', filterable: true }
                            ]}
                            formFields={[{
                                key: 'bloque_id',
                                label: 'Bloque',
                                type: 'select',
                                required: true,
                                options: bloquesWithFincasHook.bloques.map(b => ({
                                    value: b.id,
                                    label: `${b.nombre} (${b.finca_nombre})`
                                }))
                            },
                            {
                                key: 'variedad_id',
                                label: 'Variedad',
                                type: 'select',
                                required: true,
                                options: variedadesHook.variedades.map(v => ({
                                    value: v.id,
                                    label: v.nombre
                                }))
                            }
                            ]}
                            loading={bloqueVariedadesHook.loading}
                            error={bloqueVariedadesHook.error}
                            isEmpty={bloqueVariedadesStateInfo.shouldRender && bloqueVariedadesStateInfo.stateProps?.type === 'empty'}
                            emptyMessage="No hay relaciones bloque-variedad configuradas"
                            loadingMessage="Cargando relaciones..."
                            onCreate={async (data) => {
                                await bloqueVariedadesHook.create({
                                    bloque_id: parseInt(data.bloque_id),
                                    variedad_id: parseInt(data.variedad_id)
                                })
                            }}
                            onUpdate={async (id, data) => {
                                await bloqueVariedadesHook.update(id, {
                                    bloque_id: parseInt(data.bloque_id),
                                    variedad_id: parseInt(data.variedad_id)
                                })
                            }}
                            onDelete={bloqueVariedadesHook.remove}
                            crudLoading={bloqueVariedadesHook.loading}
                            searchable={true}
                            searchPlaceholder="Buscar relaciones..."
                            filters={[
                                {
                                    key: 'finca_nombre',
                                    label: 'Filtrar por Finca',
                                    getUniqueValues: (data) => {
                                        const uniqueValues = [...new Set(data.map(item => item.finca_nombre).filter(Boolean))]
                                        return uniqueValues.map(value => ({
                                            value: value.toLowerCase(),
                                            label: value
                                        }))
                                    }
                                },
                                {
                                    key: 'bloque_nombre',
                                    label: 'Filtrar por Bloque',
                                    getUniqueValues: (data) => {
                                        const uniqueValues = [...new Set(data.map(item => item.bloque_nombre).filter(Boolean))]
                                        return uniqueValues.map(value => ({
                                            value: value.toLowerCase(),
                                            label: value
                                        }))
                                    }
                                },
                                {
                                    key: 'variedad_nombre',
                                    label: 'Filtrar por Variedad',
                                    getUniqueValues: (data) => {
                                        const uniqueValues = [...new Set(data.map(item => item.variedad_nombre).filter(Boolean))]
                                        return uniqueValues.map(value => ({
                                            value: value.toLowerCase(),
                                            label: value
                                        }))
                                    }
                                }
                            ]}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default Configuracion
