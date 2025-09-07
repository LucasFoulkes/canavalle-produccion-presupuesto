import { Button } from '@/components/ui/button'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronDown, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { camasService, Cama } from '@/services/camas.service'
import { fincasService, Finca } from '@/services/fincas.service'
import { bloquesService, Bloque } from '@/services/bloques.service'
import { variedadesService, Variedad } from '@/services/variedades.service'
import { GenericCombobox } from '@/components/generic-combobox'
import { Input } from '@/components/ui/input'
import { Card, CardTitle } from '@/components/ui/card'
import { gruposPlantacionService } from '@/services/grupos-plantacion.service'

export const Route = createFileRoute('/app/configuracion/camas')({
  component: CamasConfigComponent,
})

interface CamaGroup {
  from: string
  to: string
  variety: string
  varietyId: number
  area: number
  camaIds: number[]
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

  // Inline edit states
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null)
  const [editVarietyId, setEditVarietyId] = useState<number | null>(null)
  const [editArea, setEditArea] = useState('')
  const [addFormOpen, setAddFormOpen] = useState(false)

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
    setBloques(selectedFinca ? allBloques.filter((b: any) => (b as any).id_finca === selectedFinca || (b as any).finca_id === selectedFinca) as any : [])
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
      const nameOf = (c: Cama) => c.nombre ?? String((c as any).id_cama)
      const numOf = (c: Cama) => {
        const n = parseInt(nameOf(c), 10)
        return isNaN(n) ? Number.MAX_SAFE_INTEGER : n
      }
      const sortedCamas = [...camas].sort((a, b) => numOf(a) - numOf(b))
      const grouped: CamaGroup[] = []
      if (sortedCamas.length > 0) {
        let currentGroup: CamaGroup = {
          from: nameOf(sortedCamas[0]),
          to: nameOf(sortedCamas[0]),
          variety: '—',
          varietyId: 0,
          area: 0,
          camaIds: [Number((sortedCamas[0] as any).id_cama)]
        }
        for (let i = 1; i < sortedCamas.length; i++) {
          if (numOf(sortedCamas[i]) === numOf(sortedCamas[i - 1]) + 1) {
            currentGroup.to = nameOf(sortedCamas[i])
            currentGroup.camaIds.push(Number((sortedCamas[i] as any).id_cama))
          } else {
            grouped.push(currentGroup)
            currentGroup = {
              from: nameOf(sortedCamas[i]),
              to: nameOf(sortedCamas[i]),
              variety: '—',
              varietyId: 0,
              area: 0,
              camaIds: [Number((sortedCamas[i] as any).id_cama)]
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
      // Ensure there is a grupo_cama for this bloque + variedad
      const grupos = await gruposPlantacionService.getByBloqueId(selectedBloque)
      let grupo = (grupos as any).find((g: any) => !g.eliminado_en && (g.id_variedad === selectedVariety || (g as any).variedad_id === selectedVariety))
      if (!grupo) {
        // Create group with minimal fields
        const created = await gruposPlantacionService.upsert({
          id_bloque: selectedBloque as any,
          id_variedad: selectedVariety as any,
          fecha_siembra: new Date().toISOString(),
        } as any)
        if (!created) throw new Error('No se pudo crear el grupo')
        grupo = created
      }
      const grupoId = (grupo as any).id_grupo ?? (grupo as any).grupo_id
      for (let i = fromNum; i <= toNum; i++) {
        const cama: any = {
          nombre: i.toString(),
          id_grupo: grupoId,
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

  const toggleGroupEdit = (index: number) => {
    if (editingGroupIndex === index) {
      // collapse
      setEditingGroupIndex(null)
      setEditVarietyId(null)
      setEditArea('')
      setError(null)
    } else {
      const grp = groups[index]
      setEditingGroupIndex(index)
      setEditVarietyId(grp.varietyId)
      setEditArea(grp.area.toString())
      setError(null)
    }
  }

  const handleUpdateGroup = async () => {
    if (editingGroupIndex === null) return
    const grp = groups[editingGroupIndex]
    if (!grp || !editVarietyId || !editArea) {
      setError('Por favor complete todos los campos')
      return
    }
    const areaNum = parseFloat(editArea)
    if (isNaN(areaNum) || areaNum <= 0) {
      setError('Área inválida')
      return
    }
    try {
      // TODO: actualizar variedad/área requiere mover camas entre grupos o actualizar grupo; omitido por ahora
      console.warn('[configuracion/camas] actualizar grupo no implementado con nuevo esquema')
      if (selectedBloque) {
        const updatedCamas = await camasService.getCamasByBloqueId(selectedBloque)
        setCamas(updatedCamas)
      }
      // collapse after update
      setEditingGroupIndex(null)
      setEditVarietyId(null)
      setEditArea('')
      setError(null)
    } catch {
      setError('Failed to update group')
    }
  }

  const handleCancelEdit = () => {
    setEditingGroupIndex(null)
    setEditVarietyId(null)
    setEditArea('')
    setError(null)
  }

  const handleDeleteGroup = async (index: number) => {
    const grp = groups[index]
    if (!grp) return
    const confirmMsg = grp.from === grp.to
      ? `Eliminar la cama ${grp.from}?`
      : `Eliminar las camas ${grp.from}–${grp.to}?`
    if (!window.confirm(confirmMsg)) return
    try {
      await camasService.deleteCamasByIds(grp.camaIds)
      if (selectedBloque) {
        const updatedCamas = await camasService.getCamasByBloqueId(selectedBloque)
        setCamas(updatedCamas)
      }
      if (editingGroupIndex === index) {
        setEditingGroupIndex(null)
        setEditVarietyId(null)
        setEditArea('')
      }
    } catch {
      setError('No se pudo eliminar el grupo')
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="relative mb-4 flex items-center justify-center">
        <ChevronLeft
          className="absolute left-0 h-6 w-6 cursor-pointer"
          onClick={() => navigate({ to: '/app/configuracion' })}
          aria-label="Back to configuration"
        />
        <h1 className="text-xl font-semibold tracking-tight">Configuración de Camas</h1>
      </div>
      {/* Selectors */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <GenericCombobox
          value={selectedFinca?.toString() ?? ''}
          onValueChange={v => setSelectedFinca(v ? Number(v) : null)}
          items={fincas.map(f => ({ id: (f as any).id_finca, nombre: f.nombre })) as any}
          placeholder="Seleccionar finca"
          searchPlaceholder="Buscar finca"
          emptyMessage="No se encontró finca."
        />
        <GenericCombobox
          value={selectedBloque?.toString() ?? ''}
          onValueChange={v => setSelectedBloque(v ? Number(v) : null)}
          items={bloques.map(b => ({ id: (b as any).id_bloque ?? (b as any).bloque_id, nombre: String((b as any).nombre ?? (b as any).codigo ?? `Bloque ${(b as any).id_bloque ?? (b as any).bloque_id}`) })) as any}
          placeholder="Seleccionar bloque..."
          searchPlaceholder="Buscar bloque..."
          emptyMessage="No se encontró bloque."
          disabled={!selectedFinca}
        />
      </div>
      {error && <p className="mx-auto mt-2 w-full max-w-2xl text-sm text-red-500">{error}</p>}
      {isLoading ? (
        <p className="mt-10 text-center text-sm text-gray-500">Cargando...</p>
      ) : selectedBloque ? (
        <div className="mx-auto flex-1 overflow-y-auto w-full max-w-2xl mt-2 space-y-2 pb-20">
          {groups.map((group, index) => {
            const expanded = editingGroupIndex === index
            return (
              <Card key={index} className={`transition-colors overflow-hidden ${expanded ? 'ring-1 ring-gray-200' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleGroupEdit(index)}
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="grid w-full grid-cols-[1fr_1fr_auto] items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-gray-900 tracking-tight">
                        {group.from === group.to ? `Cama ${group.from}` : `Camas ${group.from}–${group.to}`}
                      </span>
                      <span className="truncate text-center text-[11px] sm:text-xs text-gray-600 px-1">
                        {group.variety}
                      </span>
                      <span className="text-right text-[11px] sm:text-xs text-gray-600 pl-1">
                        {group.area} m²
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 flex-none text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {expanded && (
                  <div className="border-t px-3 py-3 bg-gray-50/60">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Variedad</label>
                        <GenericCombobox
                          value={editVarietyId?.toString() ?? ''}
                          onValueChange={v => setEditVarietyId(v ? Number(v) : null)}
                          items={variedades.map(v => ({ id: (v as any).id_variedad, nombre: v.nombre })) as any}
                          placeholder="Variedad..."
                          searchPlaceholder="Buscar variedad..."
                          emptyMessage="No se encontró variedad."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Área (m²)</label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0.00"
                          value={editArea}
                          onChange={e => setEditArea(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button size="sm" onClick={handleUpdateGroup}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cerrar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteGroup(index)}>Eliminar</Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
          {addFormOpen ? (
            <Card className="border-dashed">
              <div className="px-4 py-3">
                <CardTitle className="mb-4 text-base font-medium tracking-tight">Nuevo grupo</CardTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600" htmlFor="cama-desde">Cama desde</label>
                    <Input
                      id="cama-desde"
                      type="number"
                      min="1"
                      placeholder="Desde"
                      value={fromCama}
                      onChange={e => setFromCama(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600" htmlFor="cama-hasta">Cama hasta</label>
                    <Input
                      id="cama-hasta"
                      type="number"
                      min="1"
                      placeholder="Hasta"
                      value={toCama}
                      onChange={e => setToCama(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Variedad</label>
                    <GenericCombobox
                      value={selectedVariety?.toString() ?? ''}
                      onValueChange={v => setSelectedVariety(v ? Number(v) : null)}
                      items={variedades.map(v => ({ id: (v as any).id_variedad, nombre: v.nombre })) as any}
                      placeholder="Variedad..."
                      searchPlaceholder="Buscar variedad..."
                      emptyMessage="No se encontró variedad."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Área (m²)</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      value={area}
                      onChange={e => setArea(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={handleAddGroup} className="flex-1">Guardar</Button>
                  <Button size="sm" type="button" variant="outline" className="flex-1" onClick={() => setAddFormOpen(false)}>Cancelar</Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setAddFormOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-lg ring-1 ring-black/10 hover:scale-105 active:scale-95 transition-all"
                aria-label="Agregar grupo"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}