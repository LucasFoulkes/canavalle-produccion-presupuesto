import { Button } from '@/components/ui/button'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { camasService, Cama } from '@/services/camas.service'
import { fincasService, Finca } from '@/services/fincas.service'
import { bloquesService, Bloque } from '@/services/bloques.service'
import { GenericCombobox } from '@/components/generic-combobox'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/app/configuracion/camas')({
  component: CamasConfigComponent,
})


function CamaCard({ cama }: { cama: Cama }) {
  return (
    <Button
      className='aspect-square w-full h-full capitalize text-lg'
      key={cama.id}
      onClick={() => {
        console.log('Selected cama:', cama)
        alert(`Selected cama: ${cama.nombre}\n(Next level not implemented yet)`)
      }}
    >
      {cama.nombre}
    </Button>
  )
}

function CamasConfigComponent() {
  const [camas, setCamas] = useState<Cama[]>([])
  const [fincas, setFincas] = useState<Finca[]>([])
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [allBloques, setAllBloques] = useState<Bloque[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFinca, setSelectedFinca] = useState("")
  const [selectedBloque, setSelectedBloque] = useState("")
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedFinca) {
      // Filter bloques by selected finca
      const fincaBloques = allBloques.filter(bloque => bloque.finca_id.toString() === selectedFinca)
      setBloques(fincaBloques)
      setSelectedBloque("") // Reset bloque selection when finca changes
    } else {
      setBloques([])
      setSelectedBloque("")
    }
  }, [selectedFinca, allBloques])

  useEffect(() => {
    loadCamas()
  }, [selectedBloque])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      const [fincasData, bloquesData] = await Promise.all([
        fincasService.getAllFincas(),
        bloquesService.getAllBloques()
      ])
      setFincas(fincasData)
      setAllBloques(bloquesData)

      // Don't load camas initially - wait for filters
      setCamas([])
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCamas = async () => {
    try {
      if (selectedBloque && selectedFinca) {
        // Only load camas when both finca and bloque are selected
        const camasData = await camasService.getCamasByBloqueId(Number(selectedBloque))
        setCamas(camasData)
      } else {
        // Clear camas if either filter is missing
        setCamas([])
      }
    } catch (error) {
      console.error('Error loading camas:', error)
    }
  }

  const getEmptyStateMessage = () => {
    if (selectedFinca && selectedBloque) {
      return "No se encontraron camas para este bloque"
    }
    if (!selectedFinca) {
      return "Seleccione una finca y un bloque para ver las camas"
    }
    return "Seleccione un bloque para ver las camas"
  }

  // Filter camas based on the filter input
  const filteredCamas = camas.filter(cama =>
    filter === '' ||
    (cama.nombre && cama.nombre.toString().startsWith(filter)) ||
    cama.id.toString().startsWith(filter)
  )

  return (
    <div className="flex h-full flex-col p-2 pb-0 gap-2">
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({ to: '/app/configuracion' })}
        />
        <div>
          <h1 className='text-2xl font-thin'>
            Configuración de Camas
          </h1>
        </div>
      </div>

      {/* Filter Controls */}
      <div className='grid grid-cols-2 gap-2'>
        <div>
          <label className='text-sm font-medium mb-1 block'>Finca</label>
          <GenericCombobox
            value={selectedFinca}
            onValueChange={setSelectedFinca}
            items={fincas}
            placeholder="Seleccionar finca..."
            searchPlaceholder="Buscar finca..."
            emptyMessage="No se encontró finca."
          />
        </div>
        <div>
          <label className='text-sm font-medium mb-1 block'>Bloque</label>
          <GenericCombobox
            value={selectedBloque}
            onValueChange={setSelectedBloque}
            items={bloques}
            placeholder="Seleccionar bloque..."
            searchPlaceholder="Buscar bloque..."
            emptyMessage="No se encontró bloque."
            disabled={!selectedFinca}
          />
        </div>
      </div>
      <Input
        type="number"
        inputMode="numeric"
        placeholder="Filtrar camas..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {isLoading && <p>Cargando datos...</p>}

      {!isLoading && (
        <div className='flex-1 overflow-y-auto'>
          {filteredCamas.length > 0 ? (
            <div className='grid grid-cols-4 gap-2 min-h-full content-center place-items-center'>
              {filteredCamas.map((cama) => (
                <CamaCard cama={cama} key={cama.id} />
              ))}
            </div>
          ) : (
            <div className='flex h-full w-full items-center justify-center'>
              <p className="text-gray-500 font-thin">
                {getEmptyStateMessage()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
