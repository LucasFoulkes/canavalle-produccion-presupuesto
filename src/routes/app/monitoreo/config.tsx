import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/app/monitoreo/config')({
    component: MonitoreoConfigComponent,
})

function MonitoreoConfigComponent() {
    return (
        <div className='flex flex-col items-center justify-center h-full gap-6 p-8'>
            hi
        </div>
    )
}
