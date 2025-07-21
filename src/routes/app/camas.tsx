import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { camaService, type Cama } from '@/services/cama.service'
import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft } from 'lucide-react'

type CamaSearch = {
  fincaId: number
  fincaName: string
  bloqueId: number
  bloqueName: string
}

export const Route = createFileRoute('/app/camas')({
  component: CamasComponent,
  validateSearch: (search): CamaSearch => ({
    fincaId: Number(search.fincaId),
    fincaName: String(search.fincaName || ''),
    bloqueId: Number(search.bloqueId),
    bloqueName: String(search.bloqueName || '')
  })
})

const CamaComponent = ({ cama, fincaId, fincaName, bloqueId, bloqueName }: {
  cama: Cama
  fincaId: number
  fincaName: string
  bloqueId: number
  bloqueName: string
}) => {
  const navigate = useNavigate()

  return (
    <Button
      className='aspect-square w-full h-full capitalize text-lg'
      onClick={() => {
        navigate({
          to: '/app/cama-detail',
          search: {
            fincaId,
            fincaName,
            bloqueId,
            bloqueName,
            camaId: cama.id,
            camaName: cama.nombre
          }
        })
      }}
    >
      {cama.nombre}
    </Button>
  )
}

function CamasComponent() {
  const { fincaId, fincaName, bloqueId, bloqueName } = useSearch({ from: '/app/camas' })
  const navigate = useNavigate()
  const [camas, setCamas] = React.useState<Cama[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const [filter, setFilter] = React.useState('')

  const filteredCamas = camas.filter(cama =>
    String(cama.nombre || '').toLowerCase().includes(filter.toLowerCase())
  )

  useEffect(() => {
    async function fetchCamas() {
      try {
        const fetchedCamas = await camaService.getCamasByBloque(bloqueId)
        setCamas(fetchedCamas)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    fetchCamas()
  }, [bloqueId])

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({
            to: '/app/bloques',
            search: { fincaId, fincaName }
          })}
        />
        <h1 className='capitalize text-2xl text-zinc-500 font-thin'>
          {fincaName} / {bloqueName}
        </h1>
      </div>
      <div>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Filtrar camas..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className='flex-1 overflow-y-auto'>
        <div className='grid grid-cols-5 gap-2 min-h-full content-center place-items-center'>
          {loading && <p className='col-span-5 text-center'>Cargando camas...</p>}
          {error && <p className='col-span-5 text-center'>Error al cargar camas: {error.message}</p>}
          {!loading && !error && filteredCamas.map(cama => (
            <CamaComponent
              key={cama.id}
              cama={cama}
              fincaId={fincaId}
              fincaName={fincaName}
              bloqueId={bloqueId}
              bloqueName={bloqueName}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
