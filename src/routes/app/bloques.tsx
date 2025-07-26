import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/bloques')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/bloques"!</div>
}
