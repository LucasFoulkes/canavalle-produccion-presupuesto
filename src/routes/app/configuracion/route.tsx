import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/configuracion')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/configuracion"!</div>
}
