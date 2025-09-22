import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { Search } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { useDottedLookups } from '@/hooks/use-dotted-lookups'
import { useIsMobile } from '@/hooks/use-mobile'
import { getStore } from '@/lib/dexie'
import { cn, formatDate, formatMax2 } from '@/lib/utils'
import { getTableConfig } from '@/services/db'

export const Route = createFileRoute('/estimados/observaciones-area')({
  component: Page,
})

const ESTADO_PRODUCTIVO = 'productivo'

type LookupMaps = {
  camasById: Record<string, any>
  gruposById: Record<string, any>
  bloquesById: Record<string, any>
  fincasById: Record<string, any>
  variedadesById: Record<string, any>
}

type ObservacionHydrated = {
  rows: any[]
  lookups: LookupMaps
}

type CamaAggregate = {
  camaId: string
  camaName: string
  fincaId?: string
  fincaKey: string
  fincaName: string
  bloqueId?: string
  bloqueKey: string
  bloqueName: string
  variedadId?: string
  variedadKey: string
  variedadName: string
  estadoGrupo?: string
  observaciones: any[]
  latestFechaMs: number
}

type FincaNode = {
  key: string
  id?: string
  name: string
  camaCount: number
  bloques: BloqueNode[]
}

type BloqueNode = {
  key: string
  id?: string
  name: string
  camaCount: number
  variedades: VariedadNode[]
}

type VariedadNode = {
  key: string
  id?: string
  name: string
  camas: CamaAggregate[]
}

const EMPTY_LOOKUPS: LookupMaps = {
  camasById: {},
  gruposById: {},
  bloquesById: {},
  fincasById: {},
  variedadesById: {},
}

function mapBy<T extends Record<string, any>>(arr: T[], key: string) {
  return arr.reduce<Record<string, T>>((acc, item) => {
    const id = (item as any)?.[key]
    if (id != null) {
      acc[String(id)] = item
    }
    return acc
  }, {})
}

function Page() {
  const isMobile = useIsMobile()

  const { data, loading } = useDeferredLiveQuery<ObservacionHydrated | undefined>(
    async () => {
      const [observaciones, camas, grupos, bloques, fincas, variedades] = await Promise.all([
        getStore('observacion').toArray(),
        getStore('cama').toArray(),
        getStore('grupo_cama').toArray(),
        getStore('bloque').toArray(),
        getStore('finca').toArray(),
        getStore('variedad').toArray(),
      ])

      let seccionLargoM = 0
      try {
        const secciones = await getStore('seccion').toArray()
        if (secciones && secciones.length > 0) {
          const s0: any = (secciones as any[])[0]
          seccionLargoM = Number(s0?.largo_m) || 0
        }
      } catch { }

      const gruposById = mapBy(grupos as any[], 'id_grupo')
      const camasById = mapBy(camas as any[], 'id_cama')
      const bloquesById = mapBy(bloques as any[], 'id_bloque')
      const fincasById = mapBy(fincas as any[], 'id_finca')
      const variedadesById = mapBy(variedades as any[], 'id_variedad')

      const areaByBloqueVar = new Map<string, number>()
      for (const cama of camas as any[]) {
        const grupo = cama?.id_grupo != null ? gruposById[String(cama.id_grupo)] : undefined
        if (!grupo) continue
        if ((grupo.estado ?? '').toString().toLowerCase() !== ESTADO_PRODUCTIVO) continue
        const key = `${String(grupo.id_bloque)}|${String(grupo.id_variedad)}`
        const largo = Number(cama?.largo_metros) || 0
        const ancho = Number(cama?.ancho_metros) || 0
        const area = largo * ancho
        areaByBloqueVar.set(key, (areaByBloqueVar.get(key) || 0) + area)
      }

      const augmented = (observaciones as any[]).map((observacion) => {
        const cama = observacion?.id_cama != null ? camasById[String(observacion.id_cama)] : undefined
        const grupo = cama?.id_grupo != null ? gruposById[String(cama.id_grupo)] : undefined
        const key = grupo ? `${String(grupo.id_bloque)}|${String(grupo.id_variedad)}` : 'x|x'
        const area_productiva = grupo ? areaByBloqueVar.get(key) || 0 : 0
        const largo = Number(cama?.largo_metros) || 0
        const ancho = Number(cama?.ancho_metros) || 0
        const area_cama = largo * ancho
        const area_observacion = (Number(seccionLargoM) || 0) * ancho
        const fecha = (observacion as any)?.creado_en ?? (observacion as any)?.fecha ?? null
        return { ...observacion, fecha, area_productiva, area_cama, area_observacion }
      })

      return {
        rows: augmented,
        lookups: {
          camasById,
          gruposById,
          bloquesById,
          fincasById,
          variedadesById,
        },
      }
    },
    [],
    { defer: false }
  )

  const rows = data?.rows ?? []
  const lookupMaps = data?.lookups ?? EMPTY_LOOKUPS

  const baseColumns = getTableConfig('observacion')?.columns ?? []
  const columns = React.useMemo(() => {
    const filtered = baseColumns.filter((column: any) => column.key !== 'creado_en' && column.key !== 'fecha')
    const fmtNum = (value: number) => formatMax2(value)
    const fmtFecha = (value: any) => formatDate(value)
    return [
      { key: 'fecha', header: 'Fecha', render: (value: any) => fmtFecha(value) },
      ...filtered,
      { key: 'area_observacion', header: 'A?rea observaciA3n (mA�)', render: (value: number) => fmtNum(value) },
      { key: 'area_cama', header: 'A?rea cama (mA�)', render: (value: number) => fmtNum(value) },
      { key: 'area_productiva', header: 'A?rea productiva (mA�)', render: (value: number) => fmtNum(value) },
    ]
  }, [JSON.stringify(baseColumns)]) as any

  const { displayRows, relationLoading } = useDottedLookups('observacion', rows, columns)

  const wrapperClass = 'h-full min-h-0 min-w-0 flex flex-col overflow-hidden'

  if (!isMobile) {
    return (
      <div className={wrapperClass}>
        {loading ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <DataTableSkeleton columns={columns as any} rows={8} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            <DataTable caption={`${displayRows.length}`} columns={columns} rows={displayRows} />
          </div>
        )}
      </div>
    )
  }

  if (loading || relationLoading) {
    return (
      <div className={wrapperClass}>
        <DataTableSkeleton columns={columns as any} rows={8} />
      </div>
    )
  }

  if (!displayRows.length) {
    return (
      <div className={wrapperClass}>
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          No hay observaciones registradas.
        </div>
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      <MobileObservaciones rows={displayRows} lookups={lookupMaps} />
    </div>
  )
}

type MobileObservacionesProps = {
  rows: any[]
  lookups: LookupMaps
}

function MobileObservaciones({ rows, lookups }: MobileObservacionesProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedFincaKey, setSelectedFincaKey] = React.useState<string | null>(null)
  const [selectedBloqueKey, setSelectedBloqueKey] = React.useState<string | null>(null)
  const [selectedVariedadKey, setSelectedVariedadKey] = React.useState<string | null>(null)
  const [selectedCamaId, setSelectedCamaId] = React.useState<string | null>(null)

  const camaAggregates = React.useMemo<CamaAggregate[]>(() => {
    if (!rows?.length) return []
    const result = new Map<string, CamaAggregate>()

    for (const row of rows as any[]) {
      const rawCamaId = row?.id_cama
      if (rawCamaId == null) continue
      const camaId = String(rawCamaId)
      let aggregate = result.get(camaId)
      if (!aggregate) {
        const cama = lookups.camasById?.[camaId]
        const grupo = cama?.id_grupo != null ? lookups.gruposById?.[String(cama.id_grupo)] : undefined
        const bloque = grupo?.id_bloque != null ? lookups.bloquesById?.[String(grupo.id_bloque)] : undefined
        const finca = bloque?.id_finca != null ? lookups.fincasById?.[String(bloque.id_finca)] : undefined
        const variedad = grupo?.id_variedad != null ? lookups.variedadesById?.[String(grupo.id_variedad)] : undefined

        const fincaName = String(finca?.nombre ?? row['finca.nombre'] ?? 'Sin finca')
        const bloqueName = String(bloque?.nombre ?? row['bloque.nombre'] ?? 'Sin bloque')
        const variedadName = String(variedad?.nombre ?? row['variedad.nombre'] ?? 'Sin variedad')
        const camaName = String(cama?.nombre ?? row['cama.nombre'] ?? `Cama ${camaId}`)

        const fincaId = finca?.id_finca != null ? String(finca.id_finca) : undefined
        const bloqueId = bloque?.id_bloque != null ? String(bloque.id_bloque) : undefined
        const variedadId = variedad?.id_variedad != null ? String(variedad.id_variedad) : undefined

        const fincaKey = fincaId ? `finca-${fincaId}` : `finca-${fincaName.toLowerCase()}`
        const bloqueKey = bloqueId ? `bloque-${bloqueId}` : `bloque-${bloqueName.toLowerCase()}|${fincaKey}`
        const variedadKey = variedadId ? `variedad-${variedadId}` : `variedad-${variedadName.toLowerCase()}|${bloqueKey}`

        aggregate = {
          camaId,
          camaName,
          fincaId,
          fincaKey,
          fincaName,
          bloqueId,
          bloqueKey,
          bloqueName,
          variedadId,
          variedadKey,
          variedadName,
          estadoGrupo: (grupo?.estado ?? row?.estado ?? undefined) as string | undefined,
          observaciones: [],
          latestFechaMs: -Infinity,
        }
        result.set(camaId, aggregate)
      }

      aggregate.observaciones.push(row)
      const timestamp = row?.fecha ? new Date(row.fecha).getTime() : NaN
      if (!Number.isNaN(timestamp)) {
        aggregate.latestFechaMs = Math.max(aggregate.latestFechaMs, timestamp)
      }
    }

    return Array.from(result.values()).map((aggregate) => ({
      ...aggregate,
      observaciones: aggregate.observaciones.sort((a: any, b: any) => {
        const aTime = a?.fecha ? new Date(a.fecha).getTime() : 0
        const bTime = b?.fecha ? new Date(b.fecha).getTime() : 0
        return bTime - aTime
      }),
    }))
  }, [rows, lookups])

  type FincaMutable = {
    key: string
    id?: string
    name: string
    camaCount: number
    bloques: Map<string, BloqueMutable>
  }

  type BloqueMutable = {
    key: string
    id?: string
    name: string
    camaCount: number
    variedades: Map<string, VariedadMutable>
  }

  type VariedadMutable = {
    key: string
    id?: string
    name: string
    camas: CamaAggregate[]
  }

  const fincaTree = React.useMemo<FincaNode[]>(() => {
    if (!camaAggregates.length) return []

    const fincaMap = new Map<string, FincaMutable>()

    for (const entry of camaAggregates) {
      let fincaNode = fincaMap.get(entry.fincaKey)
      if (!fincaNode) {
        fincaNode = {
          key: entry.fincaKey,
          id: entry.fincaId,
          name: entry.fincaName,
          camaCount: 0,
          bloques: new Map<string, BloqueMutable>(),
        }
        fincaMap.set(entry.fincaKey, fincaNode)
      }
      fincaNode.camaCount += 1

      let bloqueNode = fincaNode.bloques.get(entry.bloqueKey)
      if (!bloqueNode) {
        bloqueNode = {
          key: entry.bloqueKey,
          id: entry.bloqueId,
          name: entry.bloqueName,
          camaCount: 0,
          variedades: new Map<string, VariedadMutable>(),
        }
        fincaNode.bloques.set(entry.bloqueKey, bloqueNode)
      }
      bloqueNode.camaCount += 1

      let variedadNode = bloqueNode.variedades.get(entry.variedadKey)
      if (!variedadNode) {
        variedadNode = {
          key: entry.variedadKey,
          id: entry.variedadId,
          name: entry.variedadName,
          camas: [],
        }
        bloqueNode.variedades.set(entry.variedadKey, variedadNode)
      }
      variedadNode.camas.push(entry)
    }

    const compareByName = (a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

    return Array.from(fincaMap.values())
      .map((fincaNode) => {
        const bloques = Array.from(fincaNode.bloques.values()).map((bloqueNode) => {
          const variedades = Array.from(bloqueNode.variedades.values()).map((variedadNode) => ({
            key: variedadNode.key,
            id: variedadNode.id,
            name: variedadNode.name,
            camas: [...variedadNode.camas].sort((a, b) => {
              const byName = a.camaName.localeCompare(b.camaName, 'es', { sensitivity: 'base' })
              if (byName !== 0) return byName
              return a.camaId.localeCompare(b.camaId)
            }),
          }))
          variedades.sort(compareByName)
          return {
            key: bloqueNode.key,
            id: bloqueNode.id,
            name: bloqueNode.name,
            camaCount: bloqueNode.camaCount,
            variedades,
          }
        })
        bloques.sort(compareByName)
        return {
          key: fincaNode.key,
          id: fincaNode.id,
          name: fincaNode.name,
          camaCount: fincaNode.camaCount,
          bloques,
        }
      })
      .sort(compareByName)
  }, [camaAggregates])

  const selectedFinca = React.useMemo(() => fincaTree.find((node) => node.key === selectedFincaKey) ?? null, [fincaTree, selectedFincaKey])
  const selectedBloque = React.useMemo(() => selectedFinca?.bloques.find((node) => node.key === selectedBloqueKey) ?? null, [selectedFinca, selectedBloqueKey])
  const selectedVariedad = React.useMemo(() => selectedBloque?.variedades.find((node) => node.key === selectedVariedadKey) ?? null, [selectedBloque, selectedVariedadKey])
  const selectedCama = React.useMemo(
    () => selectedVariedad?.camas.find((entry) => entry.camaId === selectedCamaId) ?? null,
    [selectedVariedad, selectedCamaId]
  )

  React.useEffect(() => {
    if (selectedFincaKey && !fincaTree.some((node) => node.key === selectedFincaKey)) {
      setSelectedFincaKey(null)
      setSelectedBloqueKey(null)
      setSelectedVariedadKey(null)
      setSelectedCamaId(null)
    }
  }, [selectedFincaKey, fincaTree])

  React.useEffect(() => {
    if (selectedBloqueKey && !selectedFinca?.bloques.some((node) => node.key === selectedBloqueKey)) {
      setSelectedBloqueKey(null)
      setSelectedVariedadKey(null)
      setSelectedCamaId(null)
    }
  }, [selectedBloqueKey, selectedFinca])

  React.useEffect(() => {
    if (selectedVariedadKey && !selectedBloque?.variedades.some((node) => node.key === selectedVariedadKey)) {
      setSelectedVariedadKey(null)
      setSelectedCamaId(null)
    }
  }, [selectedVariedadKey, selectedBloque])

  React.useEffect(() => {
    if (selectedCamaId && !selectedVariedad?.camas.some((entry) => entry.camaId === selectedCamaId)) {
      setSelectedCamaId(null)
    }
  }, [selectedCamaId, selectedVariedad])

  React.useEffect(() => {
    if (!selectedFincaKey && fincaTree.length === 1) {
      setSelectedFincaKey(fincaTree[0].key)
    }
  }, [selectedFincaKey, fincaTree])

  React.useEffect(() => {
    if (selectedFinca && !selectedBloqueKey && selectedFinca.bloques.length === 1) {
      setSelectedBloqueKey(selectedFinca.bloques[0].key)
    }
  }, [selectedFinca, selectedBloqueKey])

  React.useEffect(() => {
    if (selectedBloque && !selectedVariedadKey && selectedBloque.variedades.length === 1) {
      setSelectedVariedadKey(selectedBloque.variedades[0].key)
    }
  }, [selectedBloque, selectedVariedadKey])

  React.useEffect(() => {
    if (selectedVariedad && !selectedCamaId && selectedVariedad.camas.length === 1) {
      setSelectedCamaId(selectedVariedad.camas[0].camaId)
    }
  }, [selectedVariedad, selectedCamaId])

  const normalizedSearch = React.useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm])

  const searchMatches = React.useMemo(() => {
    if (!normalizedSearch) return []
    return camaAggregates
      .filter((entry) => {
        const haystack = [entry.camaName, entry.variedadName, entry.bloqueName, entry.fincaName]
        return haystack.some((value) => value.toLowerCase().includes(normalizedSearch))
      })
      .sort((a, b) => (b.latestFechaMs || 0) - (a.latestFechaMs || 0))
  }, [normalizedSearch, camaAggregates])

  const hasSearch = normalizedSearch.length > 0

  const handleFincaSelect = (key: string) => {
    setSelectedFincaKey((prev) => (prev === key ? null : key))
    setSelectedBloqueKey(null)
    setSelectedVariedadKey(null)
    setSelectedCamaId(null)
  }

  const handleBloqueSelect = (key: string) => {
    setSelectedBloqueKey((prev) => (prev === key ? null : key))
    setSelectedVariedadKey(null)
    setSelectedCamaId(null)
  }

  const handleVariedadSelect = (key: string) => {
    setSelectedVariedadKey((prev) => (prev === key ? null : key))
    setSelectedCamaId(null)
  }

  const handleCamaSelect = (id: string) => {
    setSelectedCamaId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-2 space-y-6">
      <Section title="Fincas" description="Selecciona una finca para continuar">
        {fincaTree.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay observaciones registradas.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {fincaTree.map((fincaNode) => (
              <SelectionTile
                key={fincaNode.key}
                label={fincaNode.name}
                count={fincaNode.camaCount}
                selected={selectedFincaKey === fincaNode.key}
                onClick={() => handleFincaSelect(fincaNode.key)}
                variant="finca"
              />
            ))}
          </div>
        )}
      </Section>

      {selectedFinca && (
        <Section title="Bloques" description="Elige un bloque dentro de la finca">
          {selectedFinca.bloques.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin bloques con observaciones.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {selectedFinca.bloques.map((bloqueNode) => (
                <SelectionTile
                  key={bloqueNode.key}
                  label={bloqueNode.name}
                  count={bloqueNode.camaCount}
                  selected={selectedBloqueKey === bloqueNode.key}
                  onClick={() => handleBloqueSelect(bloqueNode.key)}
                  variant="bloque"
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {selectedBloque && (
        <Section title="Variedades" description="Filtra las camas por variedad">
          {selectedBloque.variedades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin variedades con observaciones.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedBloque.variedades.map((variedadNode) => (
                <OptionChip
                  key={variedadNode.key}
                  label={variedadNode.name}
                  count={variedadNode.camas.length}
                  selected={selectedVariedadKey === variedadNode.key}
                  onClick={() => handleVariedadSelect(variedadNode.key)}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {selectedVariedad && (
        <Section title="Camas" description="Selecciona una cama para ver sus observaciones">
          {selectedVariedad.camas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin camas con observaciones.</p>
          ) : (
            <div className="space-y-2">
              {selectedVariedad.camas.map((camaEntry) => {
                const latestObs = camaEntry.observaciones[0]
                const latestLabel = latestObs?.fecha ? formatDate(latestObs.fecha) : 'sin fecha'
                return (
                  <button
                    key={camaEntry.camaId}
                    type="button"
                    onClick={() => handleCamaSelect(camaEntry.camaId)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      selectedCamaId === camaEntry.camaId
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card/80 text-foreground hover:border-primary/40 hover:text-primary'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{camaEntry.camaName}</span>
                      <span className="text-xs text-muted-foreground">
                        {camaEntry.observaciones.length} obs.
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Ultima: {latestLabel}</p>
                  </button>
                )
              })}
            </div>
          )}
        </Section>
      )}

      {selectedCama && (
        <Section
          title="Detalle de la cama"
          description={`${selectedCama.observaciones.length} observaciones registradas`}
        >
          <CamaCard entry={selectedCama} />
        </Section>
      )}

      <Section title="Buscar cama" description="Filtra por cama, variedad o bloque">
        <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filtrar por cama, variedad o bloque"
              className="pl-9"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </Section>

      {hasSearch && (
        <Section title="Resultados" description={`Coincidencias: ${searchMatches.length}`}>
          {searchMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se encontraron camas.</p>
          ) : (
            <div className="space-y-4">
              {searchMatches.map((entry) => (
                <CamaCard key={`search-${entry.camaId}`} entry={entry} />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  )

}

type SectionProps = {
  title: string
  description?: string
  children: React.ReactNode
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

type SelectionTileProps = {
  label: string
  count?: number
  selected: boolean
  onClick: () => void
  variant: 'finca' | 'bloque'
}

function SelectionTile({ label, count, selected, onClick, variant }: SelectionTileProps) {
  const containerClasses =
    variant === 'finca'
      ? 'min-h-[112px] px-4'
      : 'min-h-[80px] px-2'

  const labelClasses = variant === 'finca' ? 'text-sm' : 'text-xs'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'aspect-square w-full rounded-xl border bg-card/80 text-foreground transition-colors flex flex-col items-center justify-center gap-1.5 text-center',
        containerClasses,
        selected
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border hover:border-primary/40 hover:text-primary'
      )}
    >
      <span className={cn('font-semibold leading-tight whitespace-normal text-center', labelClasses)}>
        {label}
      </span>
      {typeof count === 'number' && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  )
}

type OptionChipProps = {
  label: string
  count?: number
  selected: boolean
  onClick: () => void
}

function OptionChip({ label, count, selected, onClick }: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
      )}
    >
      <span className="truncate">{label}</span>
      {typeof count === 'number' && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>
  )
}

type CamaCardProps = {
  entry: CamaAggregate
}

function CamaCard({ entry }: CamaCardProps) {
  const estado = (entry.estadoGrupo ?? '').toString().toLowerCase()
  const isProductivo = estado === ESTADO_PRODUCTIVO
  const badgeClass = isProductivo
    ? 'border-emerald-500/50 text-emerald-600'
    : 'border-border text-muted-foreground'
  const statusLabel = entry.estadoGrupo ? entry.estadoGrupo : 'sin estado'
  const latestObservation = entry.observaciones[0]

  return (
    <Card className={cn('border-2', isProductivo ? 'border-emerald-500/80' : 'border-muted')}
    >
      <CardHeader className="pb-2">
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{entry.camaName}</CardTitle>
            <CardDescription>
              {entry.variedadName} · {entry.bloqueName}
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn('whitespace-nowrap capitalize', badgeClass)}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Observaciones: {entry.observaciones.length}</span>
          {latestObservation?.fecha && <span>Última: {formatDate(latestObservation.fecha)}</span>}
        </div>
        <div className="space-y-3">
          {entry.observaciones.map((observacion: any) => {
            const obsId = String(
              observacion?.id_observacion ?? `${entry.camaId}-${observacion?.fecha ?? Math.random()}`
            )
            const cantidad = observacion?.cantidad
            const areaObs = Number(observacion?.area_observacion)
            const areaCama = Number(observacion?.area_cama)
            const showArea = (Number.isFinite(areaObs) && areaObs > 0) || (Number.isFinite(areaCama) && areaCama > 0)

            return (
              <div key={obsId} className="rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {observacion?.tipo_observacion ?? 'Observación'}
                  </p>
                  {cantidad != null && cantidad !== '' && (
                    <p className="text-sm font-semibold">{formatMax2(cantidad)}</p>
                  )}
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {observacion?.fecha && <div>Fecha: {formatDate(observacion.fecha)}</div>}
                  {observacion?.ubicacion_seccion && (
                    <div>Sección: {String(observacion.ubicacion_seccion)}</div>
                  )}
                  {showArea && (
                    <div>
                      {Number.isFinite(areaObs) && areaObs > 0 && (
                        <span>Área obs.: {formatMax2(areaObs)} m²</span>
                      )}
                      {Number.isFinite(areaObs) && areaObs > 0 && Number.isFinite(areaCama) && areaCama > 0 && ' · '}
                      {Number.isFinite(areaCama) && areaCama > 0 && (
                        <span>Área cama: {formatMax2(areaCama)} m²</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
