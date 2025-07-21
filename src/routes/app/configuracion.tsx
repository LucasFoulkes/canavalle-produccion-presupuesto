import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/app/configuracion')({
  component: RouteComponent,
})

interface Opcion {
  label: string;
  value: string;
}

const OpcionComponent = ({ opcion }: { opcion: Opcion }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    console.log(`Selected option: ${opcion.label}`)
    if (opcion.label === 'Asignar camas a bloques') {
      navigate({ to: '/app', search: { mode: 'assign-camas' } })
    } else {
      navigate({ to: opcion.value })
    }
  }

  return (
    <Button
      className='aspect-square w-full h-16 text-lg'
      onClick={handleClick}
    >
      {opcion.label}
    </Button>
  )
}

function RouteComponent() {
  const opciones: Opcion[] = [
    { label: 'Asignar camas a bloques', value: '/app' },
    { label: 'Editar estados fenologicos', value: '/app/estados-fenologicos' },
  ]
  return (
    <div className='w-full h-full flex flex-col p-2'>
      <h1 className='text-2xl text-zinc-500 font-thin text-center'>Eliga una opción</h1>
      <div className='flex-1 grid grid-cols-1 gap-2 content-center'>
        {opciones.map(opcion => (
          <OpcionComponent key={opcion.label} opcion={opcion} />
        ))}
      </div>
    </div>
  )
}
