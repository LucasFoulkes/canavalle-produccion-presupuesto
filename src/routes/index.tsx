import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  validateSearch: (search: { table?: string }) => search,
  component: RouteComponent,
})

function RouteComponent() {


  return (
    <div>hello you, this is going to a dashboard</div>
  )
}