import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estimados/observaciones')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/estimados/observaciones"!</div>
}
