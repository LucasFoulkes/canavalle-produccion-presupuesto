import { Button } from '@/components/ui/button'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { camasService, Cama } from '@/services/camas.service'
import { fincasService, Finca } from '@/services/fincas.service'
import { bloquesService, Bloque } from '@/services/bloques.service'
import { GenericCombobox } from '@/components/generic-combobox'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/app/configuracion/camas')({
  component: CamasConfigComponent,
})

function CamaCard({ cama, onSelect }: { cama: Cama; onSelect: (cama: Cama) => void }) {
  return (
    <Button
      className="aspect-square w-full h-full capitalize text-lg"
      onClick={() => onSelect(cama)}
      aria-label={`Select cama ${cama.nombre}`}
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
  const [selectedFinca, setSelectedFinca] = useState<number | null>(null)
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [fincasData, bloquesData] = await Promise.all([
          fincasService.getAllFincas(),
          bloquesService.getAllBloques(),
        ])
        setFincas(fincasData)
        setAllBloques(bloquesData)
      } catch {
        setError('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    setBloques(selectedFinca ? allBloques.filter(b => b.finca_id === selectedFinca) : [])
    setSelectedBloque(null)
  }, [selectedFinca, allBloques])

  useEffect(() => {
    const loadCamas = async () => {
      try {
        setCamas(selectedBloque ? await camasService.getCamasByBloqueId(selectedBloque) : [])
      } catch {
        setError('Failed to load camas')
      }
    }
    loadCamas()
  }, [selectedBloque])

  const filteredCamas = useMemo(
    () =>
      camas.filter(
        c => filter === '' || c.nombre?.toLowerCase().startsWith(filter.toLowerCase()) || c.id.toString().startsWith(filter),
      ),
    [camas, filter],
  )

  const emptyMessage = !selectedFinca
    ? 'Seleccione una finca y un bloque'
    : !selectedBloque
      ? 'Seleccione un bloque'
      : 'No se encontraron camas'

  const handleCamaSelect = (cama: Cama) => navigate({ to: `/app/configuracion/camas/${cama.id}` })

  return (
    <div className="flex h-full flex-col gap-2 p-2 pb-0">
      <div className="relative flex items-center justify-center">
        <ChevronLeft
          className="absolute left-2 h-6 w-6 cursor-pointer"
          onClick={() => navigate({ to: '/app/configuracion' })}
          aria-label="Back to configuration"
        />
        <h1 className="text-2xl font-thin">Configuración de Camas</h1>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Finca</label>
          <GenericCombobox
            value={selectedFinca?.toString() ?? ''}
            onValueChange={v => setSelectedFinca(v ? Number(v) : null)}
            items={fincas}
            placeholder="Seleccionar finca..."
            searchPlaceholder="Buscar finca..."
            emptyMessage="No se encontró finca."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Bloque</label>
          <GenericCombobox
            value={selectedBloque?.toString() ?? ''}
            onValueChange={v => setSelectedBloque(v ? Number(v) : null)}
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
        onChange={e => setFilter(e.target.value)}
        aria-label="Filter camas by name or ID"
      />
      {error && <p className="text-red-500">{error}</p>}
      {isLoading ? (
        <p>Cargando...</p>
      ) : filteredCamas.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-2 place-items-center">
            {filteredCamas.map(cama => (
              <CamaCard key={cama.id} cama={cama} onSelect={handleCamaSelect} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="font-thin text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}