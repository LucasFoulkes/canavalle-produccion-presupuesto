import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { accionService } from '@/services/accion.service'
import { estadosFenologicosService, EstadoFenologicoWithRelations } from '@/services/estados-fenologicos.service'
import { ChevronLeft } from 'lucide-react'
import { DynamicTable } from '@/components/DynamicTable'

interface TransformedAccion {
  fecha_produccion?: string  // Date + estado_valor days
  finca: string
  bloque: string
  cama: string
  variedad: string
  produccion: number
}

export const Route = createFileRoute('/app/reportes')({
  component: reportes,
})

function reportes() {
  const navigate = useNavigate()
  const [acciones, setAcciones] = useState<TransformedAccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)


  useEffect(() => {
    async function fetchData() {
      try {
        const [accionesData, estadosData] = await Promise.all([
          accionService.getAll(),
          estadosFenologicosService.getAll()
        ])
        const actionColumns = ['arveja', 'garbanzo', 'uva', 'arroz', 'rayando_color', 'sepalos_abiertos', 'cosecha']
        const columns = ['brotacion', '5_cm', '15_cm', '20_cm', 'primera_hoja', 'espiga', 'arroz', 'arveja', 'garbanzo', 'uva', 'rayando_color', 'sepalos_abiertos', 'cosecha']
        const transformedEstados = estadosData.map(estado => {
          const vals = columns.map(col => (estado as any)[col] ?? 0)
          const suffixSums = vals.reduceRight((acc, val) => [val + (acc[0] ?? 0), ...acc], [])
          const newEstado = { ...estado } as any
          columns.forEach((col, idx) => { newEstado[col] = suffixSums[idx] })
          return newEstado as EstadoFenologicoWithRelations
        })

        const transformedAcciones = accionesData.flatMap(accion => {
          const baseRow = {
            finca: accion.finca_nombre || '',
            bloque: accion.bloque_nombre || '',
            cama: accion.cama_nombre || '',
            variedad: accion.variedad_nombre || ''
          }

          const estadoFenologico = transformedEstados.find(estado =>
            estado.bloque_nombre === accion.bloque_nombre &&
            estado.variedad_nombre === accion.variedad_nombre
          )

          return actionColumns
            .filter(col => (accion as any)[col] != null && (accion as any)[col] !== 0)
            .map(col => {
              const estadoValor = estadoFenologico ? (estadoFenologico as any)[col] : undefined
              const baseDate = new Date(accion.created_at || new Date().toISOString())
              const fechaProduccion = estadoValor ?
                new Date(baseDate.getTime() + estadoValor * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                undefined

              return {
                fecha_produccion: fechaProduccion,
                ...baseRow,
                produccion: (accion as any)[col],
              }
            })
        })

        setAcciones(transformedAcciones)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error?.message ?? 'Unknown'}</div>

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({ to: '/app' })}
        />
        <h1 className='capitalize text-2xl text-zinc-500 font-thin'>
          Reportes
        </h1>
      </div>

      {/* Acciones Table */}
      <div className='flex-1 overflow-y-auto relative border rounded-md'>
        <DynamicTable
          data={acciones}
          hiddenColumns={['id', 'cama_id']}
        />
      </div>
    </div>
  )
}