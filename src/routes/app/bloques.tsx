import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { bloqueService, type Bloque } from '@/services/bloque.service'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

type BloqueSearch = {
  fincaId: number
  fincaName: string
}

export const Route = createFileRoute('/app/bloques')({
  component: BloquesComponent,
  validateSearch: (search): BloqueSearch => ({
    fincaId: Number(search.fincaId),
    fincaName: String(search.fincaName || '')
  })
})

const BloqueComponent = ({ bloque, fincaId, fincaName }: {
  bloque: Bloque
  fincaId: number
  fincaName: string
}) => {
  const navigate = useNavigate()

  return (
    <Button
      className='aspect-square w-full h-full capitalize text-lg'
      onClick={() => navigate({
        to: '/app/camas',
        search: { fincaId, fincaName, bloqueId: bloque.id, bloqueName: bloque.nombre }
      })}
    >
      {bloque.nombre}
    </Button>
  )
}

function BloquesComponent() {
  const { fincaId, fincaName } = useSearch({ from: '/app/bloques' })
  const navigate = useNavigate()
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchBloques() {
      try {
        setBloques(await bloqueService.getBloquesByFinca(fincaId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }
    fetchBloques()
  }, [fincaId])

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({ to: '/app' })}
        />
        <h1 className="capitalize text-2xl text-zinc-500 font-thin">{fincaName}</h1>
      </div>
      <div className='flex-1 overflow-y-auto'>
        <div className='grid grid-cols-4 gap-2 min-h-full content-center place-items-center'>
          {loading && <p className='col-span-4 text-center'>Cargando bloques...</p>}
          {error && <p className='col-span-4 text-center'>Error al cargar bloques: {error.message}</p>}
          {!loading && !error && bloques.map(bloque => (
            <BloqueComponent
              key={bloque.id}
              bloque={bloque}
              fincaId={fincaId}
              fincaName={fincaName}
            />
          ))}
        </div>
      </div>
    </div>
  )
}