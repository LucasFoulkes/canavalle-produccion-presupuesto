import { Button } from '@/components/ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/app/configuracion/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex h-full flex-col p-2 pb-0 gap-2">
      <h1 className='text-2xl font-thin'>
        Configuracion
      </h1>
      <div className='flex-1 grid grid-cols-1 gap-2 content-center'>
        <Link to="/app/configuracion/camas">
          <Button className='h-14 w-full text-lg'>Camas</Button>
        </Link>
        <Link to="/app/configuracion/estados-fenologicos">
          <Button className='h-14 w-full text-lg'>Estados Fenologicos</Button>
        </Link>
      </div>
    </div>
  )
}
