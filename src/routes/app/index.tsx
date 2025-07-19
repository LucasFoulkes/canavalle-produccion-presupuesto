import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { fincaService, type Finca } from '@/services/finca.service'
import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

const FincaComponent = ({ finca }: { finca: Finca }) => {
  const navigate = useNavigate()
  return (
    <Button
      className='aspect-square w-full h-full capitalize text-lg'
      onClick={() => {
        console.log(`Selected finca: ${finca.nombre}`)
        navigate({ to: '/app/bloques', search: { fincaId: finca.id, fincaName: finca.nombre } })
      }}
    >
      {finca.nombre}
    </Button>
  )
}

function RouteComponent() {
  const [fincas, setFincas] = React.useState<Finca[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  useEffect(() => {
    async function fetchFincas() {
      try {
        const fetchedFincas = await fincaService.getAllFincas()
        setFincas(fetchedFincas)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    fetchFincas()
  }, [])

  return (
    <div className='w-full h-full flex flex-col p-2'>
      <h1 className='text-2xl text-zinc-500 font-thin text-center'>Eliga una finca</h1>
      <div className='flex-1 grid grid-cols-2 gap-2 content-center'>
        {loading && <p>Cargando fincas...</p>}
        {error && <p>Error al cargar fincas: {error.message}</p>}
        {!loading && !error &&
          fincas.map(finca => (
            <FincaComponent key={finca.id} finca={finca} />
          ))
        }
      </div>
    </div>
  )
}
