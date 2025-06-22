import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CrudTable } from '@/components/CrudTable'
import { useFincas } from '@/hooks/useFincas'
import { useVariedades } from '@/hooks/useVariedades'
import { useBloques } from '@/hooks/useBloques'
import { useBloquesWithFincas } from '@/hooks/useBloquesWithFincas'
import { useBloqueVariedadesWithNames } from '@/hooks/useBloqueVariedadesWithNames'
import { useEstadosFenologicos } from '@/hooks/useEstadosFenologicos'
import { useDatosProductivos } from '@/hooks/useDatosProductivos'

function Configuracion() {
    const fincasHook = useFincas()
    const variedadesHook = useVariedades()
    const bloquesHook = useBloques()
    const bloquesWithFincasHook = useBloquesWithFincas() // For dropdown options
    const bloqueVariedadesHook = useBloqueVariedadesWithNames()
    const estadosFenologicosHook = useEstadosFenologicos()
    const datosProductivosHook = useDatosProductivos()

    // Get state info
    const fincasStateInfo = fincasHook.getStateInfo()
    const variedadesStateInfo = variedadesHook.getStateInfo()
    const bloquesStateInfo = bloquesHook.getStateInfo()
    const bloqueVariedadesStateInfo = bloqueVariedadesHook.getStateInfo()
    const estadosFenologicosStateInfo = estadosFenologicosHook.getStateInfo()
    const datosProductivosStateInfo = datosProductivosHook.getStateInfo()

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden pb-20">                <Tabs defaultValue="fincas" className="w-full flex flex-col h-full">                <TabsList className="grid w-full grid-cols-6 mb-4 text-xs">
                <TabsTrigger value="fincas" className="text-xs">Fincas</TabsTrigger>
                <TabsTrigger value="bloques" className="text-xs">Bloques</TabsTrigger>
                <TabsTrigger value="variedades" className="text-xs">Variedades</TabsTrigger>
                <TabsTrigger value="estados" className="text-xs">Estados</TabsTrigger>
                <TabsTrigger value="datos" className="text-xs">Datos</TabsTrigger>
                <TabsTrigger value="bloque-variedad" className="text-xs">Relaciones</TabsTrigger>
            </TabsList>
                <TabsContent value="fincas" className="flex-1 overflow-hidden">
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
                </TabsContent>
                <TabsContent value="bloques" className="flex-1 overflow-hidden">
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
                    />                    </TabsContent>                <TabsContent value="estados" className="flex-1 overflow-hidden">
                    <CrudTable
                        title="Estados Fenológicos"
                        data={estadosFenologicosHook.estadosFenologicos} columns={[
                            { key: 'brotacion', label: 'Brotación' },
                            { key: '5CM', label: '5 CM' },
                            { key: '15 CM', label: '15 CM' },
                            { key: '20 CM', label: '20 CM' },
                            { key: 'PRIMERA HOJA', label: 'Primera Hoja' },
                            { key: 'ARVEJA', label: 'Arveja' },
                            { key: 'GARBANZO', label: 'Garbanzo' },
                            { key: 'UVA', label: 'Uva' },
                            { key: 'RAYANDO COLOR', label: 'Rayando Color' },
                            { key: 'SEPALOS ABIERTOS', label: 'Sépalos Abiertos' },
                            { key: 'COSECHA', label: 'Cosecha' },
                            { key: 'TOTAL DIAS CICLO', label: 'Total Días Ciclo' },
                            { key: 'ESPIGA', label: 'Espiga' },
                            { key: 'ARROZ', label: 'Arroz' }, {
                                key: 'bloque_variedad_id',
                                label: 'Bloque-Variedad',
                                render: (estado) => {
                                    const bloqueVariedad = bloqueVariedadesHook.bloqueVariedades.find(bv => bv.id === estado.bloque_variedad_id)
                                    return bloqueVariedad ? `${bloqueVariedad.finca_nombre} > ${bloqueVariedad.bloque_nombre} - ${bloqueVariedad.variedad_nombre}` : 'Sin asignar'
                                },
                                filterable: true
                            }
                        ]} formFields={[
                            { key: 'brotacion', label: 'Brotación', type: 'number' },
                            { key: '5CM', label: '5 CM', type: 'number' },
                            { key: '15 CM', label: '15 CM', type: 'number' },
                            { key: '20 CM', label: '20 CM', type: 'number' },
                            { key: 'PRIMERA HOJA', label: 'Primera Hoja', type: 'number' },
                            { key: 'ARVEJA', label: 'Arveja', type: 'number' },
                            { key: 'GARBANZO', label: 'Garbanzo', type: 'number' },
                            { key: 'UVA', label: 'Uva', type: 'number' },
                            { key: 'RAYANDO COLOR', label: 'Rayando Color', type: 'number' },
                            { key: 'SEPALOS ABIERTOS', label: 'Sépalos Abiertos', type: 'number' },
                            { key: 'COSECHA', label: 'Cosecha', type: 'number' },
                            { key: 'TOTAL DIAS CICLO', label: 'Total Días Ciclo', type: 'number' },
                            { key: 'ESPIGA', label: 'Espiga', type: 'number' },
                            { key: 'ARROZ', label: 'Arroz', type: 'number' },
                            {
                                key: 'bloque_variedad_id',
                                label: 'Bloque-Variedad',
                                type: 'select',
                                options: bloqueVariedadesHook.bloqueVariedades.map(bv => ({
                                    value: bv.id,
                                    label: `${bv.bloque_nombre} - ${bv.variedad_nombre} (${bv.finca_nombre})`
                                }))
                            }
                        ]}
                        loading={estadosFenologicosHook.loading}
                        error={estadosFenologicosHook.error}
                        isEmpty={estadosFenologicosStateInfo.shouldRender && estadosFenologicosStateInfo.stateProps?.type === 'empty'}
                        emptyMessage="No hay estados fenológicos configurados"
                        loadingMessage="Cargando estados fenológicos..."
                        onCreate={async (data) => {
                            const numericData = {
                                ...Object.fromEntries(
                                    Object.entries(data).map(([key, value]) => {
                                        if (key === 'bloque_variedad_id') {
                                            return [key, value ? parseInt(value as string) : undefined]
                                        }
                                        return [key, value ? parseInt(value as string) : undefined]
                                    })
                                )
                            }
                            await estadosFenologicosHook.create(numericData)
                        }}
                        onUpdate={async (id, data) => {
                            const numericData = {
                                ...Object.fromEntries(
                                    Object.entries(data).map(([key, value]) => {
                                        if (key === 'bloque_variedad_id') {
                                            return [key, value ? parseInt(value as string) : undefined]
                                        }
                                        return [key, value ? parseInt(value as string) : undefined]
                                    })
                                )
                            }
                            await estadosFenologicosHook.update(id, numericData)
                        }}
                        onDelete={estadosFenologicosHook.remove}
                        crudLoading={estadosFenologicosHook.loading}
                        searchable={true}
                        searchPlaceholder="Buscar estados fenológicos..." />
                </TabsContent>
                <TabsContent value="datos" className="flex-1 overflow-hidden">
                    <CrudTable
                        title="Datos Productivos"
                        data={datosProductivosHook.datosProductivos}
                        columns={[
                            {
                                key: 'bloque_variedad_id',
                                label: 'Bloque-Variedad',
                                render: (dato) => {
                                    const bloqueVariedad = bloqueVariedadesHook.bloqueVariedades.find(bv => bv.id === dato.bloque_variedad_id)
                                    return bloqueVariedad ? `${bloqueVariedad.finca_nombre} > ${bloqueVariedad.bloque_nombre} - ${bloqueVariedad.variedad_nombre}` : 'Sin asignar'
                                },
                                filterable: true
                            },
                            { key: 'estado', label: 'Estado', filterable: true },
                            { key: 'numero_de_plantas', label: 'Número de Plantas' },
                            { key: 'numero_de_camas', label: 'Número de Camas' },
                            { key: 'area', label: 'Área' },
                            { key: 'pdn_ideal_m2_ano', label: 'PDN Ideal m²/Año' },
                            { key: 'pdn_ideal_semana', label: 'PDN Ideal/Semana' },
                            { key: 'ciclo', label: 'Ciclo' },
                            { key: 'ciclo_sema', label: 'Ciclo Sema' },
                            { key: 'densidad', label: 'Densidad' },
                            { key: 'porcentaje_deciegos', label: 'Porcentaje Deciegos' }
                        ]}
                        formFields={[
                            {
                                key: 'bloque_variedad_id',
                                label: 'Bloque-Variedad',
                                type: 'select',
                                options: bloqueVariedadesHook.bloqueVariedades.map(bv => ({
                                    value: bv.id,
                                    label: `${bv.bloque_nombre} - ${bv.variedad_nombre} (${bv.finca_nombre})`
                                }))
                            },
                            { key: 'estado', label: 'Estado', type: 'text' },
                            { key: 'numero_de_plantas', label: 'Número de Plantas', type: 'number' },
                            { key: 'numero_de_camas', label: 'Número de Camas', type: 'number' },
                            { key: 'area', label: 'Área', type: 'number' },
                            { key: 'pdn_ideal_m2_ano', label: 'PDN Ideal m²/Año', type: 'number' },
                            { key: 'pdn_ideal_semana', label: 'PDN Ideal/Semana', type: 'number' },
                            { key: 'ciclo', label: 'Ciclo', type: 'number' },
                            { key: 'ciclo_sema', label: 'Ciclo Sema', type: 'number' },
                            { key: 'densidad', label: 'Densidad', type: 'number' },
                            { key: 'porcentaje_deciegos', label: 'Porcentaje Deciegos', type: 'number' }
                        ]}
                        loading={datosProductivosHook.loading}
                        error={datosProductivosHook.error}
                        isEmpty={datosProductivosStateInfo.shouldRender && datosProductivosStateInfo.stateProps?.type === 'empty'}
                        emptyMessage="No hay datos productivos configurados"
                        loadingMessage="Cargando datos productivos..."
                        onCreate={async (data) => {
                            const processedData = {
                                ...Object.fromEntries(
                                    Object.entries(data).map(([key, value]) => {
                                        if (key === 'bloque_variedad_id') {
                                            return [key, value ? parseInt(value as string) : undefined]
                                        }
                                        if (key === 'estado') {
                                            return [key, value || undefined]
                                        }
                                        return [key, value ? parseInt(value as string) : undefined]
                                    })
                                )
                            }
                            await datosProductivosHook.create(processedData)
                        }}
                        onUpdate={async (id, data) => {
                            const processedData = {
                                ...Object.fromEntries(
                                    Object.entries(data).map(([key, value]) => {
                                        if (key === 'bloque_variedad_id') {
                                            return [key, value ? parseInt(value as string) : undefined]
                                        }
                                        if (key === 'estado') {
                                            return [key, value || undefined]
                                        }
                                        return [key, value ? parseInt(value as string) : undefined]
                                    })
                                )
                            }
                            await datosProductivosHook.update(id, processedData)
                        }}
                        onDelete={datosProductivosHook.remove}
                        crudLoading={datosProductivosHook.loading}
                        searchable={true}
                        searchPlaceholder="Buscar datos productivos..."
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
