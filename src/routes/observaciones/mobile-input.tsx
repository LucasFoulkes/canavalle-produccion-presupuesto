import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { ChevronLeft, Search } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getStore } from '@/lib/dexie'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { filterObservationTypes } from '@/config/observation-types'
import { observacionService, pincheService } from '@/services/db'

type Step = 'finca' | 'bloque' | 'variedad' | 'cama' | 'input'

export const Route = createFileRoute('/observaciones/mobile-input')({
  component: MobileObservationInput,
})

function MobileObservationInput() {
  const [currentStep, setCurrentStep] = React.useState<Step>('finca')
  const [selectedFinca, setSelectedFinca] = React.useState<any>(null)
  const [selectedBloque, setSelectedBloque] = React.useState<any>(null)
  const [selectedVariedad, setSelectedVariedad] = React.useState<any>(null)
  const [selectedCama, setSelectedCama] = React.useState<any>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [globalCounters, setGlobalCounters] = React.useState<Record<string, number>>({})
  const [pincheCounters, setPincheCounters] = React.useState<Record<string, number>>({})

  const handleBack = () => {
    switch (currentStep) {
      case 'bloque':
        setCurrentStep('finca')
        setSelectedFinca(null)
        break
      case 'variedad':
        setCurrentStep('bloque')
        setSelectedBloque(null)
        break
      case 'cama':
        setCurrentStep('variedad')
        setSelectedVariedad(null)
        break
      case 'input':
        setCurrentStep('cama')
        setSelectedCama(null)
        break
    }
  }

  const getTitle = () => {
    switch (currentStep) {
      case 'finca':
        return 'Seleccionar Finca'
      case 'bloque':
        return 'Seleccionar Bloque'
      case 'variedad':
        return 'Seleccionar Variedad'
      case 'cama':
        return 'Seleccionar Cama'
      case 'input':
        return 'Nueva Observación'
      default:
        return 'Observaciones'
    }
  }

  return (
    <div className="flex h-svh w-full flex-col bg-background">
      <header className="border-b px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {currentStep !== 'finca' && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleBack}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold">{getTitle()}</h1>
          </div>
          {currentStep === 'input' && (Object.values(globalCounters).some((c) => c > 0) || Object.values(pincheCounters).some((c) => c > 0)) && (
            <Button
              onClick={async () => {
                const observationsToSave = Object.entries(globalCounters).filter(([_, count]) => count > 0)
                const pinchesToSave = Object.entries(pincheCounters).filter(([_, count]) => count > 0)

                if (observationsToSave.length === 0 && pinchesToSave.length === 0) {
                  alert('No hay datos para guardar. Incremente al menos un contador.')
                  return
                }

                console.log('=== SAVING ALL OBSERVATIONS ===')
                console.log('Observations to save:', observationsToSave)

                let savedCount = 0
                let errorCount = 0

                for (const [tipo, count] of observationsToSave) {
                  try {
                    const payload = {
                      id_cama: selectedCama.id_cama,
                      tipo_observacion: tipo,
                      cantidad: count,
                      ubicacion_seccion: null,
                      id_usuario: 1,
                    }

                    console.log(`Saving ${tipo} with count ${count}:`, payload)
                    console.log('Full cama object:', selectedCama)

                    if (!selectedCama || !selectedCama.id_cama) {
                      console.error('ERROR: No cama selected or no id_cama!')
                      alert('Error: No se ha seleccionado una cama')
                      return
                    }

                    console.log('About to call observacionService.insert...')
                    console.log('Navigator online status:', navigator.onLine)

                    // Try saving directly to Dexie first for immediate feedback
                    const dexieObservation = {
                      ...payload,
                      id_observacion: Date.now() + Math.random(), // Temporary ID
                      creado_en: new Date().toISOString(),
                      needs_sync: true
                    }

                    console.log('Saving to Dexie first:', dexieObservation)
                    await getStore('observacion').put(dexieObservation)
                    console.log('Saved to Dexie successfully')

                    // Then try to sync to Supabase if online
                    if (navigator.onLine) {
                      try {
                        const { data, error } = await observacionService.insert(payload)
                        console.log('Service call completed. Data:', data, 'Error:', error)

                        if (error) {
                          console.error(`Error syncing ${tipo} to Supabase:`, error)
                          console.error('Full error object:', JSON.stringify(error))
                          // Don't increment errorCount since we saved to Dexie
                        } else {
                          console.log(`Synced ${tipo} to Supabase:`, data)
                          // Update the Dexie record with the real data from Supabase
                          if (data) {
                            // Remove temp row and insert server row to avoid duplicates
                            try {
                              await getStore('observacion').delete(dexieObservation.id_observacion)
                            } catch (e) {
                              console.debug('Could not remove temp observation from Dexie', e)
                            }
                            await getStore('observacion').put({ ...(data as any), needs_sync: false })
                            console.log('Replaced Dexie temp with Supabase data')
                          }
                        }
                      } catch (syncErr: any) {
                        console.error(`Exception syncing ${tipo} to Supabase:`, syncErr)
                        // Don't increment errorCount since we saved to Dexie
                      }
                    } else {
                      console.log('Offline - observation saved to Dexie only')
                    }

                    savedCount++
                  } catch (err: any) {
                    console.error(`Exception saving ${tipo}:`, err)
                    console.error('Full exception:', err.message, err.stack)
                    errorCount++
                  }
                }

                // Save pinches
                for (const [tipo, count] of pinchesToSave) {
                  try {
                    if (!selectedCama || !selectedCama.id_cama) {
                      console.error('ERROR: No cama selected or no id_cama!')
                      alert('Error: No se ha seleccionado una cama')
                      return
                    }

                    const payload = {
                      bloque: selectedBloque?.id_bloque ?? null,
                      cama: selectedCama.id_cama,
                      variedad: selectedVariedad?.id_variedad ?? null,
                      cantidad: count,
                      tipo,
                    }

                    // Save to Dexie first
                    const dexieRow = {
                      ...payload,
                      id: Date.now() + Math.random(), // temporary id
                      created_at: new Date().toISOString(),
                      needs_sync: true,
                    }
                    await getStore('pinche').put(dexieRow)

                    if (navigator.onLine) {
                      try {
                        const { data, error } = await pincheService.insert(payload as any)
                        if (error) {
                          console.error(`Error syncing pinche ${tipo} to Supabase:`, error)
                        } else if (data) {
                          // Remove temp and insert server row
                          try { await getStore('pinche').delete(dexieRow.id) } catch (e) { console.debug('Could not delete temp pinche', e) }
                          await getStore('pinche').put({ ...(data as any), needs_sync: false })
                        }
                      } catch (syncErr) {
                        console.error('Exception syncing pinche:', syncErr)
                      }
                    }

                    savedCount++
                  } catch (err: any) {
                    console.error(`Exception saving pinche ${tipo}:`, err)
                    errorCount++
                  }
                }

                // Reset counters for saved observations
                if (savedCount > 0) {
                  setGlobalCounters({})
                  setPincheCounters({})
                  alert(`Guardadas ${savedCount} observaciones${errorCount > 0 ? ` (${errorCount} errores)` : ''}`)

                  // Go back to cama selection
                  setCurrentStep('cama')
                  setSelectedCama(null)
                } else {
                  alert(`Error: No se pudo guardar datos`)
                }
              }}
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Guardar ({[...Object.values(globalCounters), ...Object.values(pincheCounters)].filter((c) => c > 0).length})
            </Button>
          )}
        </div>
        {selectedFinca && (
          <div className="mt-2 text-xs text-muted-foreground">
            {selectedFinca.nombre}
            {selectedBloque && ` > ${selectedBloque.nombre}`}
            {selectedVariedad && ` > ${selectedVariedad.nombre}`}
            {selectedCama && ` > ${selectedCama.nombre}`}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto">
        {currentStep === 'finca' && (
          <FincaSelection
            onSelect={(finca) => {
              setSelectedFinca(finca)
              setCurrentStep('bloque')
            }}
          />
        )}
        {currentStep === 'bloque' && (
          <BloqueSelection
            fincaId={selectedFinca?.id_finca}
            onSelect={(bloque) => {
              setSelectedBloque(bloque)
              setCurrentStep('variedad')
            }}
          />
        )}
        {currentStep === 'variedad' && (
          <VariedadSelection
            bloqueId={selectedBloque?.id_bloque}
            onSelect={(variedad) => {
              setSelectedVariedad(variedad)
              setCurrentStep('cama')
            }}
          />
        )}
        {currentStep === 'cama' && (
          <CamaSelection
            bloqueId={selectedBloque?.id_bloque}
            variedadId={selectedVariedad?.id_variedad}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={(cama) => {
              setSelectedCama(cama)
              setCurrentStep('input')
            }}
          />
        )}
        {currentStep === 'input' && (
          <ObservationInput
            finca={selectedFinca}
            bloque={selectedBloque}
            variedad={selectedVariedad}
            cama={selectedCama}
            counters={globalCounters}
            setCounters={setGlobalCounters}
            pincheCounters={pincheCounters}
            setPincheCounters={setPincheCounters}
            onComplete={() => {
              setCurrentStep('cama')
              setSelectedCama(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

function FincaSelection({ onSelect }: { onSelect: (finca: any) => void }) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const allFincas = useLiveQuery(
    () => db.finca.toArray(),
    []
  ) ?? []

  const fincas = React.useMemo(
    () => allFincas.filter((f: any) => !f.eliminado_en || f.eliminado_en === ''),
    [allFincas]
  )

  const filteredFincas = React.useMemo(() => {
    if (!searchQuery) return fincas
    const query = searchQuery.toLowerCase()
    return fincas.filter((f: any) => f.nombre.toLowerCase().includes(query))
  }, [fincas, searchQuery])

  if (!fincas.length) {
    return <div className="p-4">Cargando...</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-background p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar finca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-3 pb-32">
          {filteredFincas.map((finca: any) => (
            <button
              key={finca.id_finca}
              onClick={() => onSelect(finca)}
              className="aspect-square flex items-center justify-center rounded-lg border bg-card p-4 text-center transition-colors hover:bg-accent active:scale-95"
            >
              <span className="font-medium">{finca.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function BloqueSelection({
  fincaId,
  onSelect,
}: {
  fincaId: any
  onSelect: (bloque: any) => void
}) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const allBloques = useLiveQuery(
    () => db.bloque.toArray(),
    []
  ) ?? []

  const bloques = React.useMemo(
    () => allBloques.filter((b: any) => {
      // Compare as strings to handle both string and number IDs
      return String(b.id_finca) === String(fincaId) && (!b.eliminado_en || b.eliminado_en === '')
    }),
    [allBloques, fincaId]
  )

  const filteredBloques = React.useMemo(() => {
    if (!searchQuery) return bloques
    const query = searchQuery.toLowerCase()
    return bloques.filter((b: any) => b.nombre.toLowerCase().includes(query))
  }, [bloques, searchQuery])

  if (!allBloques.length) {
    return <div className="p-4">Cargando bloques...</div>
  }

  if (!bloques.length) {
    return <div className="p-4 text-sm text-muted-foreground">No hay bloques disponibles para esta finca</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-background p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar bloque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-4 gap-2 pb-32">
          {filteredBloques.map((bloque: any) => (
            <button
              key={bloque.id_bloque}
              onClick={() => onSelect(bloque)}
              className="aspect-square flex items-center justify-center rounded-lg border bg-card p-2 text-center text-sm transition-colors hover:bg-accent active:scale-95"
            >
              <span className="font-medium">{bloque.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function VariedadSelection({
  bloqueId,
  onSelect,
}: {
  bloqueId: any
  onSelect: (variedad: any) => void
}) {
  const allGrupos = useLiveQuery(
    () => db.grupo_cama.toArray(),
    []
  ) ?? []

  const allCamas = useLiveQuery(
    () => db.cama.toArray(),
    []
  ) ?? []

  const allVariedades = useLiveQuery(
    () => db.variedad.toArray(),
    []
  ) ?? []

  const camasData = React.useMemo(() => {
    // Find grupos for this bloque
    const grupos = allGrupos.filter((g: any) =>
      String(g.id_bloque) === String(bloqueId) &&
      (!g.eliminado_en || g.eliminado_en === '')
    )

    // Get unique variedad IDs from grupos
    const variedadIds = [...new Set(grupos.map((g: any) => g.id_variedad))]

    // Get variedades
    const variedades = allVariedades.filter((v: any) =>
      variedadIds.some((id) => String(id) === String(v.id_variedad))
    )

    // Count camas for each variedad
    return variedades.map((v: any) => {
      // Find grupos for this variedad in this bloque
      const variedadGrupos = grupos.filter((g: any) => String(g.id_variedad) === String(v.id_variedad))
      const grupoIds = variedadGrupos.map((g: any) => g.id_grupo)

      // Count camas belonging to these grupos
      const camaCount = allCamas.filter((c: any) =>
        grupoIds.some((gId: any) => String(c.id_grupo) === String(gId)) &&
        (!c.eliminado_en || c.eliminado_en === '')
      ).length

      return {
        ...v,
        camaCount
      }
    })
  }, [allGrupos, allCamas, allVariedades, bloqueId])

  if (!allGrupos.length && !allVariedades.length) {
    return <div className="p-4">Cargando datos...</div>
  }

  if (!camasData.length) {
    return <div className="p-4 text-sm text-muted-foreground">No hay variedades con camas en este bloque</div>
  }

  return (
    <div className="flex flex-col gap-2 p-4 pb-24">
      {camasData.map((variedad: any) => (
        <button
          key={variedad.id_variedad}
          onClick={() => onSelect(variedad)}
          className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent active:scale-95"
        >
          <div className="flex items-center gap-3">
            {variedad.color && (
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: variedad.color }}
              />
            )}
            <span className="font-medium">{variedad.nombre}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {variedad.camaCount} camas
          </span>
        </button>
      ))}
    </div>
  )
}

function CamaSelection({
  bloqueId,
  variedadId,
  searchQuery,
  onSearchChange,
  onSelect,
}: {
  bloqueId: any
  variedadId: any
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelect: (cama: any) => void
}) {
  const allGrupos = useLiveQuery(
    () => db.grupo_cama.toArray(),
    []
  ) ?? []

  const allCamas = useLiveQuery(
    () => db.cama.toArray(),
    []
  ) ?? []

  const camas = React.useMemo(() => {
    // Find grupos for this bloque and variedad
    const grupos = allGrupos.filter((g: any) =>
      String(g.id_bloque) === String(bloqueId) &&
      String(g.id_variedad) === String(variedadId) &&
      (!g.eliminado_en || g.eliminado_en === '')
    )

    const grupoIds = grupos.map((g: any) => g.id_grupo)

    // Get camas belonging to these grupos
    return allCamas.filter((c: any) =>
      grupoIds.some((gId: any) => String(c.id_grupo) === String(gId)) &&
      (!c.eliminado_en || c.eliminado_en === '')
    )
  }, [allGrupos, allCamas, bloqueId, variedadId])

  const filteredCamas = React.useMemo(() => {
    if (!searchQuery) return camas
    const query = searchQuery.toLowerCase()
    return camas.filter((c: any) => c.nombre.toLowerCase().includes(query))
  }, [camas, searchQuery])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-background p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar cama..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-4 gap-2 pb-32">
          {filteredCamas.map((cama: any) => (
            <button
              key={cama.id_cama}
              onClick={() => onSelect(cama)}
              className="aspect-square flex items-center justify-center rounded-lg border bg-card p-2 text-sm transition-colors hover:bg-accent active:scale-95"
            >
              <span className="font-medium">{cama.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ObservationInput({
  finca: _finca,
  bloque: _bloque,
  variedad: _variedad,
  cama: _cama,
  counters,
  setCounters,
  pincheCounters,
  setPincheCounters,
  onComplete: _onComplete,
}: {
  finca: any
  bloque: any
  variedad: any
  cama: any
  counters: Record<string, number>
  setCounters: React.Dispatch<React.SetStateAction<Record<string, number>>>
  pincheCounters: Record<string, number>
  setPincheCounters: React.Dispatch<React.SetStateAction<Record<string, number>>>
  onComplete: () => void
}) {
  // Intentionally unused props kept for API compatibility with parent
  // and to avoid TypeScript/ESLint unused warnings
  void _finca; void _bloque; void _variedad; void _cama; void _onComplete;
  const [tipoObservacion, setTipoObservacion] = React.useState('')
  const [cantidad, setCantidad] = React.useState('')
  const [seccion, setSeccion] = React.useState('')
  // Note: previously had a local saving state and a separate handleSave function,
  // but saving is handled by the header button; remove unused local state/function.

  // Load observation types from database, filtered and ordered by configuration
  const estadoTiposRaw = useLiveQuery(
    () => db.estado_fenologico_tipo.toArray(),
    []
  ) ?? []

  const estadoTipos = React.useMemo(() => {
    return filterObservationTypes(estadoTiposRaw)
  }, [estadoTiposRaw])

  // Load pinche types
  const pincheTipos: any[] = useLiveQuery(
    () => db.pinche_tipo.toArray(),
    []
  ) ?? []

  // Sync cantidad input with selected tipo counter
  React.useEffect(() => {
    if (tipoObservacion && counters[tipoObservacion] !== undefined) {
      setCantidad(String(counters[tipoObservacion]))
    }
  }, [tipoObservacion, counters])

  const handleIncrement = (typeCode: string) => {
    setTipoObservacion(typeCode)
    setCounters(prev => {
      const current = prev[typeCode] || 0
      const newValue = current + 1
      setCantidad(String(newValue))
      return { ...prev, [typeCode]: newValue }
    })
  }

  const handleDecrement = (typeCode: string) => {
    setCounters(prev => {
      const current = prev[typeCode] || 0
      const newValue = Math.max(0, current - 1)
      if (tipoObservacion === typeCode) {
        setCantidad(String(newValue))
      }
      return { ...prev, [typeCode]: newValue }
    })
  }

  const handlePincheIncrement = (typeCode: string) => {
    setPincheCounters(prev => ({ ...prev, [typeCode]: (prev[typeCode] || 0) + 1 }))
  }

  const handlePincheDecrement = (typeCode: string) => {
    setPincheCounters(prev => ({ ...prev, [typeCode]: Math.max(0, (prev[typeCode] || 0) - 1) }))
  }

  const handleCantidadChange = (value: string) => {
    setCantidad(value)
    if (tipoObservacion && value) {
      const num = parseFloat(value)
      if (!isNaN(num) && num >= 0) {
        setCounters(prev => ({ ...prev, [tipoObservacion]: num }))
      }
    }
  }

  // (removed unused local save handler)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-4 pb-32">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de observación</label>
            {estadoTipos.length > 0 ? (
              <div className="flex flex-col gap-2">
                {estadoTipos.map((type) => {
                  const count = counters[type.codigo] || 0
                  return (
                    <div
                      key={type.codigo}
                      className={cn(
                        'w-full rounded-lg border transition-colors',
                        tipoObservacion === type.codigo
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card'
                      )}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleDecrement(type.codigo)}
                            disabled={count === 0}
                            className="w-10 h-10 rounded-full border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-medium"
                          >
                            −
                          </button>

                          <button
                            onClick={() => handleIncrement(type.codigo)}
                            className="flex-1 mx-3 py-2 text-center hover:bg-accent/50 rounded-md transition-colors"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-medium">{type.codigo}</span>
                              {count > 0 && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                                  {count}
                                </span>
                              )}
                            </div>
                          </button>

                          <button
                            onClick={() => handleIncrement(type.codigo)}
                            className="w-10 h-10 rounded-full border bg-background hover:bg-accent flex items-center justify-center text-lg font-medium"
                          >
                            +
                          </button>
                        </div>
                      </div>

                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Cargando tipos de observación...</div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Pinches</label>
            {pincheTipos.length > 0 ? (
              <div className="flex flex-col gap-2">
                {pincheTipos.map((type) => {
                  const code = String((type as any).codigo ?? '')
                  const count = pincheCounters[code] || 0
                  return (
                    <div key={code} className={cn('w-full rounded-lg border transition-colors', count > 0 ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handlePincheDecrement(code)}
                            disabled={count === 0}
                            className="w-10 h-10 rounded-full border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-medium"
                          >
                            −
                          </button>
                          <div className="flex-1 mx-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-medium">{code}</span>
                              {count > 0 && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">{count}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handlePincheIncrement(code)}
                            className="w-10 h-10 rounded-full border bg-background hover:bg-accent flex items-center justify-center text-lg font-medium"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Cargando tipos de pinches...</div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cantidad" className="text-sm font-medium">
              Cantidad
            </label>
            <Input
              id="cantidad"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={cantidad}
              onChange={(e) => handleCantidadChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="seccion" className="text-sm font-medium">
              Sección (opcional)
            </label>
            <Input
              id="seccion"
              type="text"
              placeholder="Ej: A1, B2..."
              value={seccion}
              onChange={(e) => setSeccion(e.target.value)}
            />
          </div>
        </div>
      </div>

    </div>
  )
}