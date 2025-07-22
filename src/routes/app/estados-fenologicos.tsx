import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { estadosFenologicosService, EstadoFenologicoWithRelations } from '@/services/estados-fenologicos.service'
import { ChevronLeft } from 'lucide-react'
import { DynamicTable } from '@/components/DynamicTable'

export const Route = createFileRoute('/app/estados-fenologicos')({
  component: EstadosFenologicosComponent,
})

function EstadosFenologicosComponent() {
  const navigate = useNavigate()
  const [estadosFenologicos, setEstadosFenologicos] = useState<EstadoFenologicoWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchEstadosFenologicos() {
      try {
        const data = await estadosFenologicosService.getAll()
        setEstadosFenologicos(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    fetchEstadosFenologicos()
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
          Estados Fenológicos
        </h1>
      </div>
      <div className='flex-1 overflow-y-auto relative border rounded-md'>
        <DynamicTable
          data={estadosFenologicos}
          hiddenColumns={['id']}  // Adjust if service excludes bloque_variedad_id
        />
      </div>
    </div>
  )
}