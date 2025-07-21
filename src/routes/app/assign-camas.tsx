import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { ChevronLeft, Plus } from 'lucide-react'
import { camaAssignmentService, type VariedadRange as ServiceVariedadRange } from '@/services/cama-assignment.service'
import { camaService } from '@/services/cama.service'
import { bloqueVariedadService } from '@/services/bloque-variedad.service'

type AssignCamasSearch = {
  fincaId: number
  fincaName: string
  bloqueId: number
  bloqueName: string
}

export const Route = createFileRoute('/app/assign-camas')({
  component: AssignCamasComponent,
  validateSearch: (search): AssignCamasSearch => ({
    fincaId: Number(search.fincaId),
    fincaName: String(search.fincaName || ''),
    bloqueId: Number(search.bloqueId),
    bloqueName: String(search.bloqueName || '')
  })
})

interface VariedadRange {
  id: string
  varietyId: number
  varietyName: string
  startNumber: number
  endNumber: number
}

function AssignCamasComponent() {
  const { fincaId, fincaName, bloqueId, bloqueName } = useSearch({ from: '/app/assign-camas' })
  const navigate = useNavigate()

  const [totalCamas, setTotalCamas] = useState<number>(0)
  const [varietyRanges, setVarietyRanges] = useState<VariedadRange[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New state for existing data checks
  const [hasExistingCamas, setHasExistingCamas] = useState(false)
  const [availableVariedades, setAvailableVariedades] = useState<any[]>([])
  const [originalCamaCount, setOriginalCamaCount] = useState<number>(0)
  const hasPopulatedRanges = useRef(false)


  // Check for existing camas and varieties on component mount
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        // Check if block has existing camas
        const camas = await camaService.getCamasByBloque(bloqueId)
        setHasExistingCamas(camas.length > 0)

        if (camas.length > 0) {
          setTotalCamas(camas.length)
          setOriginalCamaCount(camas.length)
        }

        // Get available varieties from bloque_variedad table
        console.log('Checking varieties for bloqueId:', bloqueId)
        const availableVars = await bloqueVariedadService.getVariedadesByBloque(bloqueId)
        console.log('Available varieties:', availableVars)
        setAvailableVariedades(availableVars)

      } catch (error) {
        console.error('Error checking existing data:', error)
        setError('Error al verificar datos existentes')
      }
    }

    checkExistingData()
  }, [bloqueId])

  // Function to populate ranges from existing camas
  const populateRangesFromExistingCamas = async () => {
    try {
      const camas = await camaService.getCamasByBloque(bloqueId)
      if (camas.length === 0) return

      // Group camas by variety
      const camasByVariety = new Map<number, number[]>()

      for (const cama of camas) {
        const camaNumber = parseInt(cama.nombre) || 0
        if (!camasByVariety.has(cama.variedad_id)) {
          camasByVariety.set(cama.variedad_id, [])
        }
        camasByVariety.get(cama.variedad_id)!.push(camaNumber)
      }

      // Create ranges from grouped camas
      const newRanges: VariedadRange[] = []
      let rangeId = 0

      for (const [varietyId, camaNumbers] of camasByVariety) {
        // Sort numbers and find continuous ranges
        camaNumbers.sort((a, b) => a - b)

        // Find the variety name
        const variety = availableVariedades.find(v => v.variedad_id === varietyId)
        const varietyName = variety?.variedad?.nombre || `Variedad ${varietyId}`

        // For simplicity, create one range per variety (min to max)
        if (camaNumbers.length > 0) {
          newRanges.push({
            id: (rangeId++).toString(),
            varietyId: varietyId,
            varietyName: varietyName,
            startNumber: Math.min(...camaNumbers),
            endNumber: Math.max(...camaNumbers)
          })
        }
      }

      setVarietyRanges(newRanges)
      hasPopulatedRanges.current = true
    } catch (error) {
      console.error('Error populating ranges from existing camas:', error)
    }
  }

  // Add initial variety range when totalCamas changes
  useEffect(() => {
    if (totalCamas > 0 && varietyRanges.length === 0 && !hasExistingCamas) {
      addVarietyRange()
    }
  }, [totalCamas, varietyRanges.length, hasExistingCamas])

  // Pre-populate variety ranges if varieties are available from bloque_variedad
  useEffect(() => {
    if (availableVariedades.length > 0 && totalCamas > 0 && varietyRanges.length === 0 && !hasPopulatedRanges.current) {
      // If we have existing camas, populate from them; otherwise create new ranges
      if (hasExistingCamas && originalCamaCount > 0) {
        populateRangesFromExistingCamas()
      } else {
        const rangeSize = Math.floor(totalCamas / availableVariedades.length)
        const remainder = totalCamas % availableVariedades.length

        const newRanges: VariedadRange[] = []
        let currentStart = 1

        availableVariedades.forEach((varRel, index) => {
          const isLast = index === availableVariedades.length - 1
          const rangeEnd = isLast ? totalCamas : currentStart + rangeSize - 1 + (index < remainder ? 1 : 0)

          newRanges.push({
            id: Date.now().toString() + index,
            varietyId: varRel.variedad_id,
            varietyName: varRel.variedad?.nombre || `Variedad ${index + 1}`,
            startNumber: currentStart,
            endNumber: rangeEnd
          })

          currentStart = rangeEnd + 1
        })

        setVarietyRanges(newRanges)
        hasPopulatedRanges.current = true
      }
    }
  }, [availableVariedades, totalCamas, hasExistingCamas, originalCamaCount])

  // Function to redistribute ranges evenly
  const redistributeRanges = () => {
    if (totalCamas > 0 && varietyRanges.length > 0) {
      const rangeSize = Math.floor(totalCamas / varietyRanges.length)
      const remainder = totalCamas % varietyRanges.length

      const updatedRanges: VariedadRange[] = []
      let currentStart = 1

      varietyRanges.forEach((range, index) => {
        const isLast = index === varietyRanges.length - 1
        const rangeEnd = isLast ? totalCamas : currentStart + rangeSize - 1 + (index < remainder ? 1 : 0)

        updatedRanges.push({
          ...range, // Keep all existing properties
          startNumber: currentStart,
          endNumber: rangeEnd
        })

        currentStart = rangeEnd + 1
      })

      setVarietyRanges(updatedRanges)
    }
  }

  const addVarietyRange = () => {
    const lastRange = varietyRanges[varietyRanges.length - 1]
    const startNumber = lastRange ? lastRange.endNumber + 1 : 1

    setVarietyRanges([...varietyRanges, {
      id: Date.now().toString(),
      varietyId: 0,
      varietyName: '',
      startNumber,
      endNumber: totalCamas
    }])
  }



  const updateVarietyRange = (id: string, field: keyof VariedadRange, value: string | number) => {
    setVarietyRanges(varietyRanges.map(range =>
      range.id === id ? { ...range, [field]: value } : range
    ))
  }

  const validateRanges = (): boolean => {
    // Check if all ranges have varieties selected
    if (varietyRanges.some(range => !range.varietyId || range.varietyId === 0)) {
      setError('Todas las variedades deben estar seleccionadas')
      return false
    }

    // Check if ranges cover all camas without gaps or overlaps
    const sortedRanges = [...varietyRanges].sort((a, b) => a.startNumber - b.startNumber)

    for (let i = 0; i < sortedRanges.length; i++) {
      const range = sortedRanges[i]

      // Check if start is greater than end
      if (range.startNumber > range.endNumber) {
        setError(`Rango inválido para ${range.varietyName}: el número inicial debe ser menor al final`)
        return false
      }

      // Check if this range starts where the previous ended + 1
      if (i > 0 && range.startNumber !== sortedRanges[i - 1].endNumber + 1) {
        setError('Los rangos deben ser consecutivos sin espacios')
        return false
      }

      // Check if first range starts at 1
      if (i === 0 && range.startNumber !== 1) {
        setError('El primer rango debe comenzar en 1')
        return false
      }
    }

    // Check if last range ends at totalCamas
    if (sortedRanges.length > 0 && sortedRanges[sortedRanges.length - 1].endNumber !== totalCamas) {
      setError(`El último rango debe terminar en ${totalCamas}`)
      return false
    }

    setError(null)
    return true
  }

  const handleSave = async () => {
    if (!validateRanges()) return

    setIsLoading(true)
    try {
      // Convert to service format
      const serviceRanges: ServiceVariedadRange[] = varietyRanges.map(range => ({
        varietyId: range.varietyId,
        varietyName: range.varietyName,
        startNumber: range.startNumber,
        endNumber: range.endNumber
      }))

      // Smart logic: if total camas changed, recreate; otherwise just update varieties
      if (hasExistingCamas && totalCamas === originalCamaCount) {
        // Same number of camas - just update varieties
        await camaAssignmentService.updateCamaVarieties(bloqueId, serviceRanges)
      } else {
        // Different number of camas - delete and recreate
        await camaAssignmentService.assignCamasToBloque(bloqueId, totalCamas, serviceRanges)
      }

      // Navigate back to bloques with assign-camas mode
      navigate({
        to: '/app/bloques',
        search: { fincaId, fincaName, mode: 'assign-camas' }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar las asignaciones')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({
            to: '/app/bloques',
            search: { fincaId, fincaName, mode: 'assign-camas' }
          })}
        />
        <h1 className="capitalize text-2xl text-zinc-500 font-thin">
          {fincaName} / {bloqueName}
        </h1>
      </div>

      <div className='flex-1 overflow-y-auto'>
        <div className="space-y-4 p-2">



          <div>
            <Label htmlFor="totalCamas">Número total de camas</Label>
            <Input
              id="totalCamas"
              type="number"
              min="1"
              value={totalCamas === 0 ? '' : totalCamas}
              onChange={(e) => setTotalCamas(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="Ej: 100"
            />

          </div>

          {totalCamas > 0 && availableVariedades.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Asignación por variedades</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={redistributeRanges}
                    size="sm"
                    variant="outline"
                  >
                    Redistribuir
                  </Button>
                  {varietyRanges.length < availableVariedades.length && (
                    <Button
                      onClick={addVarietyRange}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar rango
                    </Button>
                  )}
                </div>
              </div>

              {varietyRanges.map((range) => (
                <div key={range.id} className="border rounded-lg p-4 space-y-3">
                  <div className="p-3 bg-gray-50 rounded-md border text-center">
                    <span className="font-medium text-lg">{range.varietyName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cama inicial</Label>
                      <Input
                        type="number"
                        min="1"
                        max={totalCamas}
                        value={range.startNumber === 0 ? '' : range.startNumber}
                        onChange={(e) => updateVarietyRange(range.id, 'startNumber', e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Cama final</Label>
                      <Input
                        type="number"
                        min="1"
                        max={totalCamas}
                        value={range.endNumber === 0 ? '' : range.endNumber}
                        onChange={(e) => updateVarietyRange(range.id, 'endNumber', e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    Camas {range.startNumber} - {range.endNumber} ({range.endNumber - range.startNumber + 1} camas)
                  </p>
                </div>
              ))}

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={isLoading || varietyRanges.length === 0}
                className="w-full"
              >
                {isLoading
                  ? 'Guardando...'
                  : hasExistingCamas && totalCamas === originalCamaCount
                    ? 'Actualizar variedades'
                    : 'Guardar asignación'
                }
              </Button>
            </div>
          )}

          {/* Show message when no varieties available */}
          {totalCamas > 0 && availableVariedades.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <p className="text-yellow-700">
                No se pueden asignar camas porque este bloque no tiene variedades configuradas.
                Debe configurar las variedades para este bloque primero.
              </p>
              {/* Development button to add test data */}
              <Button
                onClick={async () => {
                  try {
                    await bloqueVariedadService.addTestData(bloqueId)
                    // Refresh the data
                    const availableVars = await bloqueVariedadService.getVariedadesByBloque(bloqueId)
                    setAvailableVariedades(availableVars)
                  } catch (error) {
                    console.error('Error adding test data:', error)
                  }
                }}
                variant="outline"
                size="sm"
              >
                Agregar datos de prueba (desarrollo)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}