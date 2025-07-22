import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { fincaService, type Finca } from '@/services/finca.service'
import { Button } from '@/components/ui/button'
import { useOfflineData } from '@/hooks/useOfflineData'

type AppSearch = {
  mode?: 'assign-camas'
}

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
  validateSearch: (search): AppSearch => ({
    mode: search.mode as 'assign-camas' | undefined
  })
})

const FincaComponent = ({ finca, mode }: { finca: Finca, mode?: 'assign-camas' }) => {
  const navigate = useNavigate()
  return (
    <Button
      className='aspect-square w-full h-full capitalize text-lg'
      onClick={() => {
        console.log(`Selected finca: ${finca.nombre}`)
        navigate({
          to: '/app/bloques',
          search: {
            fincaId: finca.id,
            fincaName: finca.nombre,
            ...(mode && { mode })
          }
        })
      }}
    >
      {finca.nombre}
    </Button>
  )
}

function RouteComponent() {
  const { mode } = useSearch({ from: '/app/' })

  // Use our custom hook for offline data
  const {
    data: fincas,
    loading,
    error,
    isOfflineData,
    refreshData
  } = useOfflineData<Finca>(
    'fincas',
    fincaService.getAllFincas,
    { autoSync: true, syncInterval: 30000 }
  )

  // Function to test offline capabilities
  const testOffline = async () => {
    try {
      const { testOfflineCapabilities } = await import('@/lib/offline-test')
      const results = await testOfflineCapabilities() as Record<string, any>
      console.log('Offline test results:', results)

      // Show results in an alert for easy debugging
      alert(
        `Offline Status:\n` +
        `- Online: ${navigator.onLine ? 'Yes' : 'No'}\n` +
        `- IndexedDB: ${results.indexedDB ? 'Working' : 'Failed'}\n` +
        `- Service Worker: ${results.serviceWorkerRegistered ? 'Registered' : 'Not Registered'}\n` +
        `- Cache API: ${results.cachesAvailable ? 'Available' : 'Not Available'}\n` +
        `- Running as PWA: ${results.isRunningAsPWA ? 'Yes' : 'No'}\n` +
        `- Overall: ${results.offlineReady ? 'Ready for Offline' : 'Not Ready'}`
      )
    } catch (err) {
      console.error('Failed to run offline test:', err)
      alert('Error testing offline capabilities. See console for details.')
    }
  }

  return (
    <div className='w-full h-full flex flex-col p-2'>
      <h1 className='text-2xl text-zinc-500 font-thin text-center'>
        {mode === 'assign-camas' ? 'Seleccione finca para asignar camas' : 'Eliga una finca v1'}
      </h1>

      {/* Offline status indicator */}
      <div className='flex justify-center mb-2'>
        <div className={`px-3 py-1 rounded-full text-xs ${!navigator.onLine ? 'bg-yellow-100 text-yellow-800' :
          isOfflineData ? 'bg-orange-100 text-orange-800' :
            'bg-green-100 text-green-800'
          }`}>
          {!navigator.onLine ? '🟡 Sin conexión' :
            isOfflineData ? '🟠 Usando datos guardados' :
              '🟢 En línea'}
        </div>
        <button
          onClick={testOffline}
          className='ml-2 px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800'
        >
          Probar modo offline
        </button>
        {navigator.onLine && (
          <button
            onClick={refreshData}
            className='ml-2 px-3 py-1 rounded-full text-xs bg-green-100 text-green-800'
          >
            🔄 Actualizar
          </button>
        )}
      </div>

      <div className='flex-1 grid grid-cols-2 gap-2 content-center'>
        {loading && <p>Cargando fincas...</p>}
        {error && <p>Error al cargar fincas: {error.message}</p>}
        {!loading && !error &&
          fincas.map(finca => (
            <FincaComponent key={finca.id} finca={finca} mode={mode} />
          ))
        }
      </div>
    </div>
  )
}
