import { Button } from '@/components/ui/button'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { camasService, Cama } from '@/services/camas.service'
import { fincasService, Finca } from '@/services/fincas.service'
import { bloquesService, Bloque } from '@/services/bloques.service'
import { variedadesService, Variedad } from '@/services/variedades.service'
import { GenericCombobox } from '@/components/generic-combobox'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/app/configuracion/camas')({
  component: CamasConfigComponent,
})

interface CamaGroup {
  from: string
  to: string
  variety: string
  area: number
}

function CamasConfigComponent() {
  const [camas, setCamas] = useState<Cama[]>([])
  const [groups, setGroups] = useState<CamaGroup[]>([])
  const [fincas, setFincas] = useState<Finca[]>([])
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [allBloques, setAllBloques] = useState<Bloque[]>([])
  const [variedades, setVariedades] = useState<Variedad[]>([])
  const [selectedFinca, setSelectedFinca] = useState<number | null>(null)
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Form states
  const [fromCama, setFromCama] = useState('')
  const [toCama, setToCama] = useState('')
  const [selectedVariety, setSelectedVariety] = useState<number | null>(null)
  const [area, setArea] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [fincasData, bloquesData, variedadesData] = await Promise.all([
          fincasService.getAllFincas(),
          bloquesService.getAllBloques(),
          variedadesService.getAllVariedades()
        ])
        setFincas(fincasData)
        setAllBloques(bloquesData)
        setVariedades(variedadesData)
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
        if (selectedBloque) {
          const camasData = await camasService.getCamasByBloqueId(selectedBloque)
          setCamas(camasData)
        } else {
          setCamas([])
        }
      } catch {
        setError('Failed to load camas')
      }
    }
    loadCamas()
  }, [selectedBloque])

  useEffect(() => {
    const groupCamas = () => {
      const sortedCamas = [...camas].sort((a, b) => parseInt(a.nombre) - parseInt(b.nombre))
      const grouped: CamaGroup[] = []
      if (sortedCamas.length > 0) {
        let currentGroup = {
          from: sortedCamas[0].nombre,
          to: sortedCamas[0].nombre,
          variety: variedades.find((v: Variedad) => v.id === sortedCamas[0].variedad_id)?.nombre || 'Unknown',
          area: sortedCamas[0].area || 0
        }
        for (let i = 1; i < sortedCamas.length; i++) {
          if (
            sortedCamas[i].variedad_id === sortedCamas[i - 1].variedad_id &&
            sortedCamas[i].area === sortedCamas[i - 1].area &&
            parseInt(sortedCamas[i].nombre) === parseInt(sortedCamas[i - 1].nombre) + 1 // Consecutive check
          ) {
            currentGroup.to = sortedCamas[i].nombre
          } else {
            grouped.push(currentGroup)
            currentGroup = {
              from: sortedCamas[i].nombre,
              to: sortedCamas[i].nombre,
              variety: variedades.find((v: Variedad) => v.id === sortedCamas[i].variedad_id)?.nombre || 'Unknown',
              area: sortedCamas[i].area || 0
            }
          }
        }
        grouped.push(currentGroup)
      }
      setGroups(grouped)
    }
    groupCamas()
  }, [camas, variedades])

  const handleAddGroup = async () => {
    if (!selectedBloque || !fromCama || !toCama || !selectedVariety || !area) {
      setError('Por favor complete todos los campos')
      return
    }
    const fromNum = parseInt(fromCama)
    const toNum = parseInt(toCama)
    const areaNum = parseFloat(area)
    if (fromNum > toNum || isNaN(areaNum) || areaNum <= 0) {
      setError('Rango inválido o área inválida')
      return
    }

    try {
      for (let i = fromNum; i <= toNum; i++) {
        const cama: Omit<Cama, 'id'> = {
          nombre: i.toString(),
          bloque_id: selectedBloque,
          variedad_id: selectedVariety,
          area: areaNum
        }
        await camasService.upsertCama(cama)
      }

      // Reload camas to trigger grouping update
      const updatedCamas = await camasService.getCamasByBloqueId(selectedBloque)
      setCamas(updatedCamas)

      // Clear form
      setFromCama('')
      setToCama('')
      setSelectedVariety(null)
      setArea('')
      setError(null)
    } catch {
      setError('Failed to add group')
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="relative flex items-center justify-center">
        <ChevronLeft
          className="absolute left-0 h-6 w-6 cursor-pointer"
          onClick={() => navigate({ to: '/app/configuracion' })}
          aria-label="Back to configuration"
        />
        <h1 className="text-xl font-semibold">Configuración de Camas</h1>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <GenericCombobox
          value={selectedFinca?.toString() ?? ''}
          onValueChange={v => setSelectedFinca(v ? Number(v) : null)}
          items={fincas}
          placeholder="Seleccionar finca"
          searchPlaceholder="Buscar finca"
          emptyMessage="No se encontró finca."
        />
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
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {isLoading ? (
        <p className="text-center text-gray-500">Cargando...</p>
      ) : selectedBloque ? (
        <div className="flex-1 overflow-y-auto space-y-4">
          {groups.map((group, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <span className="text-sm font-medium text-gray-700">{`${group.from}-${group.to}`}</span>
                <span className="text-sm text-gray-600">{group.variety}</span>
                <span className="text-sm text-gray-600">{group.area} m²</span>
              </div>
            </Card>
          ))}
          <Card>
            <CardTitle className="text-lg font-medium">Configurar grupo</CardTitle>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 w-16">Camas</label>
                <div className="flex gap-3 flex-1">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Desde"
                    value={fromCama}
                    onChange={e => setFromCama(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Hasta"
                    value={toCama}
                    onChange={e => setToCama(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <GenericCombobox
                value={selectedVariety?.toString() ?? ''}
                onValueChange={v => setSelectedVariety(v ? Number(v) : null)}
                items={variedades}
                placeholder="Variedad..."
                searchPlaceholder="Buscar variedad..."
                emptyMessage="No se encontró variedad."
              />
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 w-16">Área (m²)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button onClick={handleAddGroup} className="w-full">
                + Agregar Grupo
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}