import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CrudTable } from '@/components/CrudTable'
import { useFincas } from '@/hooks/useFincas'
import { useVariedades } from '@/hooks/useVariedades'
import { useBloquesWithFincas } from '@/hooks/useBloquesWithFincas'
import { useBloqueVariedadesWithNames } from '@/hooks/useBloqueVariedadesWithNames'

function Configuracion() {
    const fincasHook = useFincas()
    const variedadesHook = useVariedades()
    const bloquesHook = useBloquesWithFincas()
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
                    </TabsList>

                    <TabsContent value="fincas" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Fincas"
                            data={fincasHook.fincas}
                            columns={[
                                { key: 'nombre', label: 'Nombre' }
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
                        />
                    </TabsContent>

                    <TabsContent value="bloques" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Bloques"
                            data={bloquesHook.bloques}
                            columns={[
                                { key: 'nombre', label: 'Nombre' },
                                { key: 'finca_nombre', label: 'Finca' }
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
                            loadingMessage="Cargando bloques..." onCreate={async (_data) => {
                                // Note: For bloques, we need to handle the creation differently
                                // since the hook returns BloqueWithFinca but create expects CreateBloqueData
                                alert('Funcionalidad de bloques pendiente de implementar correctamente')
                            }}
                            onUpdate={async (_id, _data) => {
                                alert('Funcionalidad de bloques pendiente de implementar correctamente')
                            }}
                            onDelete={async (_id) => {
                                alert('Funcionalidad de bloques pendiente de implementar correctamente')
                            }}
                            crudLoading={bloquesHook.loading}
                        />
                    </TabsContent>

                    <TabsContent value="variedades" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Variedades"
                            data={variedadesHook.variedades}
                            columns={[
                                { key: 'nombre', label: 'Nombre' }
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
                        />
                    </TabsContent>

                    <TabsContent value="bloque-variedad" className="flex-1 overflow-hidden">
                        <CrudTable
                            title="Relaciones Bloque-Variedad"
                            data={bloqueVariedadesHook.bloqueVariedades}
                            columns={[
                                { key: 'finca_nombre', label: 'Finca' },
                                { key: 'bloque_nombre', label: 'Bloque' },
                                { key: 'variedad_nombre', label: 'Variedad' }
                            ]}
                            formFields={[
                                {
                                    key: 'bloque_id',
                                    label: 'Bloque',
                                    type: 'select',
                                    required: true,
                                    options: bloquesHook.bloques.map(b => ({
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
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default Configuracion
