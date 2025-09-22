import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { getTableConfig, getTableService, SERVICE_PK, grupoCamaService, estadosFenologicosService, observacionService } from '@/services/db'
import { formatDate, isDateLikeKey, formatDateISO } from '@/lib/utils'
import { getStore } from '@/lib/dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { syncTable } from '@/services/sync'
import { useDottedLookups } from '@/hooks/use-dotted-lookups'
import { useTableFilter } from '@/hooks/use-table-filter'
import { useIsMobile } from '@/hooks/use-mobile'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/db/$table')({
  component: Page,
})

function useDbTable(tableId: string) {
  const config = getTableConfig(tableId)
  const dexieSupported = !!SERVICE_PK[tableId]
  const [error, setError] = React.useState<string | null>(null)

  // Live rows from Dexie if supported; else null to fallback to Supabase fetch once
  const liveRows = useLiveQuery(async () => {
    if (!dexieSupported) return null
    try {
      const store = getStore(tableId)
      const all = await store.toArray()
      return all as any[]
    } catch (e: any) {
      console.warn('Dexie read failed', e)
      return []
    }
  }, [tableId, dexieSupported])

  // Kick per-table sync when mounting/swapping table
  React.useEffect(() => {
    if (!dexieSupported) return
    syncTable(tableId).catch((e) => {
      console.warn('Sync failed', e)
      setError(String(e?.message ?? e))
    })
  }, [tableId, dexieSupported])

  // Fallback fetch if table not in Dexie config
  const [fallbackRows, setFallbackRows] = React.useState<any[] | null>(null)
  React.useEffect(() => {
    if (dexieSupported) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError((prev) => prev ?? 'Sin conexion: datos remotos no disponibles.')
      setFallbackRows([])
      return
    }
    let cancelled = false
      ; (async () => {
        const { data, error } = await getTableService(tableId).selectAll('*')
        if (cancelled) return
        if (error) setError(error.message)
        setFallbackRows((data as any[]) ?? [])
      })()
    return () => {
      cancelled = true
    }
  }, [tableId, dexieSupported])

  // Remote fallback for Dexie-backed tables with empty cache
  const [remoteRows, setRemoteRows] = React.useState<any[] | null>(null)
  React.useEffect(() => {
    if (!dexieSupported) return
    // Only try if cache is empty and we're online
    const emptyCache = Array.isArray(liveRows) && liveRows.length === 0
    if (!emptyCache) { setRemoteRows(null); return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    let cancelled = false
      ; (async () => {
        const { data, error } = await getTableService(tableId).selectAll('*')
        if (cancelled) return
        if (error) setError((prev) => prev ?? error.message)
        setRemoteRows((data as any[]) ?? [])
      })()
    return () => { cancelled = true }
  }, [tableId, dexieSupported, Array.isArray(liveRows) ? liveRows.length : liveRows])

  const rows = ((liveRows && (liveRows as any[]).length > 0 ? liveRows : remoteRows) ?? fallbackRows ?? []) as any[]

  const columns = React.useMemo(() => {
    if (config) {
      // Attach date formatter lazily without mutating original config
      return config.columns.map((c) => {
        if (isDateLikeKey(c.key)) {
          return { ...c, render: (v: any) => formatDate(v) }
        }
        return c
      })
    }
    const sample = rows?.[0]
    if (sample) {
      return Object.keys(sample)
        .slice(0, 6)
        .map((k) => ({ key: k, render: isDateLikeKey(k) ? (v: any) => formatDate(v) : undefined }))
    }
    return []
  }, [config, rows])

  const title = config?.title ?? tableId
  return { title, columns, rows, error }
}

function Page() {
  const { table } = Route.useParams()
  const tableConfig = getTableConfig(table)
  // Limit to known tables to avoid accidental exposure
  if (!tableConfig) throw notFound()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  // Redirect mobile users to the mobile input flow for observations
  React.useEffect(() => {
    if (isMobile && table === 'observacion') {
      navigate({ to: '/observaciones/mobile-input' })
    }
  }, [isMobile, table, navigate])

  const { columns, rows, error } = useDbTable(table)
  const { registerColumns, query, column, filters } = useTableFilter()
  // Register columns on changes
  React.useEffect(() => {
    registerColumns(columns.map(c => ({ key: String((c as any).key), label: (c as any).header ?? String((c as any).key) })))
  }, [table, columns, registerColumns])
  // Some tables (e.g., 'pinche') have nullable FKs; don't block rendering waiting for all dotted lookups
  const requireAllLookups = table !== 'pinche' && table !== 'produccion' && table !== 'puntos_gps'
  const { displayRows, relationLoading } = useDottedLookups(table, rows, columns as any, { requireAll: requireAllLookups })
  const finalLoading = rows == null || relationLoading
  const filtered = React.useMemo(() => {
    let rowsToCheck = displayRows
    if (filters.length) {
      rowsToCheck = rowsToCheck.filter(r => {
        return filters.every(f => {
          const raw = (r as any)[f.column]
          if (raw == null) return false
          const valStr = String(raw)
          const lower = valStr.toLowerCase()
          switch (f.op) {
            case 'eq':
              return lower === f.value.toLowerCase()
            case 'contains':
              return lower.includes(f.value.toLowerCase())
            case 'starts':
              return lower.startsWith(f.value.toLowerCase())
            case 'ends':
              return lower.endsWith(f.value.toLowerCase())
            case 'gt': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a > b
            }
            case 'lt': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a < b
            }
            case 'gte': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a >= b
            }
            case 'lte': {
              const a = Number(raw); const b = Number(f.value); if (isNaN(a) || isNaN(b)) return false; return a <= b
            }
            case 'between': {
              // Date or number range
              if (!f.value2) return false
              if (isDateLikeKey(f.column)) {
                const d = formatDateISO(raw)
                const a = f.value
                const b = f.value2
                if (!d || !a || !b) return false
                return d >= a && d <= b
              } else {
                const aNum = Number(f.value); const bNum = Number(f.value2); const n = Number(raw)
                if ([aNum, bNum, n].some(isNaN)) return false
                return n >= aNum && n <= bNum
              }
            }
            default:
              return lower.includes(f.value.toLowerCase())
          }
        })
      })
    }
    if (!query) return rowsToCheck
    const q = query.toLowerCase()
    const keys = column === '*' ? columns.map(c => String(c.key)) : [column]
    return rowsToCheck.filter(r => keys.some(k => {
      const v = (r as any)[k]
      if (v == null) return false
      return String(v).toLowerCase().includes(q)
    }))
  }, [query, column, displayRows, columns, filters])
  const isGrupoCama = table === 'grupo_cama'
  const isEstadosFenologicos = table === 'estados_fenologicos'
  const isObservacion = table === 'observacion'

  // Editor state (only for grupo_cama)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Reference data for selects
  const [bloques, setBloques] = React.useState<any[]>([])
  const [fincas, setFincas] = React.useState<any[]>([])
  const [variedades, setVariedades] = React.useState<any[]>([])
  const [estados, setEstados] = React.useState<any[]>([])
  const [tiposPlanta, setTiposPlanta] = React.useState<any[]>([])
  const [patrones, setPatrones] = React.useState<any[]>([])
  const [camas, setCamas] = React.useState<any[]>([])
  const [grupos, setGrupos] = React.useState<any[]>([])
  const [estadoTipos, setEstadoTipos] = React.useState<any[]>([])
  const [usuarios, setUsuarios] = React.useState<any[]>([])

  React.useEffect(() => {
    if (!isGrupoCama && !isEstadosFenologicos && !isObservacion) return
    let cancelled = false
      ; (async () => {
        const [b, f, v, e, t, p, cm, gr, et, us] = await Promise.all([
          getStore('bloque').toArray(),
          getStore('finca').toArray(),
          getStore('variedad').toArray(),
          getStore('grupo_cama_estado').toArray(),
          getStore('grupo_cama_tipo_planta').toArray(),
          getStore('patron').toArray(),
          getStore('cama').toArray(),
          getStore('grupo_cama').toArray(),
          getStore('estado_fenologico_tipo').toArray(),
          getStore('usuario').toArray(),
        ])
        if (cancelled) return
        setBloques(b as any[])
        setFincas(f as any[])
        setVariedades(v as any[])
        setEstados(e as any[])
        setTiposPlanta(t as any[])
        setPatrones(p as any[])
        setCamas(cm as any[])
        setGrupos(gr as any[])
        setEstadoTipos(et as any[])
        setUsuarios(us as any[])
      })()
    return () => { cancelled = true }
  }, [isGrupoCama, isEstadosFenologicos, isObservacion])

  const bloqueLabel = React.useCallback((id_bloque: any) => {
    const b = bloques.find((x) => String((x as any).id_bloque) === String(id_bloque))
    if (!b) return String(id_bloque ?? '')
    const f = fincas.find((x) => String((x as any).id_finca) === String((b as any).id_finca))
    const parts = [f ? (f as any).nombre : undefined, (b as any).nombre].filter(Boolean)
    return parts.join(' / ')
  }, [bloques, fincas])

  const variedadLabel = React.useCallback((id_variedad: any) => {
    const v = variedades.find((x) => String((x as any).id_variedad) === String(id_variedad))
    return v ? String((v as any).nombre) : String(id_variedad ?? '')
  }, [variedades])

  const openCreate = () => {
    setEditing({
      id_finca: '',
      id_bloque: '',
      id_variedad: '',
      fecha_siembra: '',
      patron: '',
      estado: '',
      tipo_planta: '',
      numero_camas: '',
      total_plantas: '',
    })
    setErrorMsg(null)
    setEditorOpen(true)
  }

  const openCreateEstado = () => {
    setEditing({
      id_estado_fenologico: undefined,
      id_finca: '',
      id_bloque: '',
      id_variedad: '',
      dias_brotacion: '',
      dias_cincuenta_mm: '',
      dias_quince_cm: '',
      dias_veinte_cm: '',
      dias_primera_hoja: '',
      dias_espiga: '',
      dias_arroz: '',
      dias_arveja: '',
      dias_garbanzo: '',
      dias_uva: '',
      dias_rayando_color: '',
      dias_sepalos_abiertos: '',
      dias_cosecha: '',
    })
    setErrorMsg(null)
    setEditorOpen(true)
  }

  const openEdit = (row: any) => {
    setEditing({
      id_grupo: row.id_grupo,
      id_finca: row.id_finca ?? (bloques.find((b: any) => String(b.id_bloque) === String(row.id_bloque))?.id_finca ?? ''),
      id_bloque: row.id_bloque ?? '',
      id_variedad: row.id_variedad ?? '',
      fecha_siembra: row.fecha_siembra ?? '',
      patron: row.patron ?? '',
      estado: row.estado ?? '',
      tipo_planta: row.tipo_planta ?? '',
      numero_camas: row.numero_camas ?? '',
      total_plantas: row.total_plantas ?? '',
    })
    setErrorMsg(null)
    setEditorOpen(true)
  }

  const openEditEstado = (row: any) => {
    setEditing({
      id_estado_fenologico: row.id_estado_fenologico,
      id_finca: row.id_finca ?? (bloques.find((b: any) => String(b.id_bloque) === String(row.id_bloque))?.id_finca ?? ''),
      id_bloque: row.id_bloque ?? '',
      id_variedad: row.id_variedad ?? '',
      dias_brotacion: row.dias_brotacion ?? '',
      dias_cincuenta_mm: row.dias_cincuenta_mm ?? '',
      dias_quince_cm: row.dias_quince_cm ?? '',
      dias_veinte_cm: row.dias_veinte_cm ?? '',
      dias_primera_hoja: row.dias_primera_hoja ?? '',
      dias_espiga: row.dias_espiga ?? '',
      dias_arroz: row.dias_arroz ?? '',
      dias_arveja: row.dias_arveja ?? '',
      dias_garbanzo: row.dias_garbanzo ?? '',
      dias_uva: row.dias_uva ?? '',
      dias_rayando_color: row.dias_rayando_color ?? '',
      dias_sepalos_abiertos: row.dias_sepalos_abiertos ?? '',
      dias_cosecha: row.dias_cosecha ?? '',
    })
    setErrorMsg(null)
    setEditorOpen(true)
  }

  const openCreateObservacion = () => {
    setEditing({
      id_finca: '',
      id_bloque: '',
      id_variedad: '',
      id_cama: '',
      tipo_observacion: '',
      cantidad: '',
      ubicacion_seccion: '',
      id_usuario: '',
    })
    setErrorMsg(null)
    setEditorOpen(true)
  }

  const closeEditor = () => { if (!saving) { setEditorOpen(false); setEditing(null); setErrorMsg(null) } }

  const saveEditing = async () => {
    if (!editing) return
    // basic validation
    if (isGrupoCama) {
      if (!editing.id_finca || !editing.id_bloque || !editing.id_variedad || !editing.fecha_siembra) {
        setErrorMsg('Seleccione finca, bloque, variedad y fecha de siembra')
        return
      }
    } else if (isEstadosFenologicos) {
      if (!editing.id_finca || !editing.id_bloque || !editing.id_variedad) {
        setErrorMsg('Seleccione finca, bloque y variedad')
        return
      }
    } else if (isObservacion) {
      if (!editing.id_finca || !editing.id_bloque || !editing.id_variedad || !editing.id_cama || !editing.tipo_observacion) {
        setErrorMsg('Seleccione finca, bloque, variedad, cama y estado')
        return
      }
    }
    setSaving(true)
    setErrorMsg(null)
    try {
      if (isGrupoCama) {
        if (editing.id_grupo) {
          const id = editing.id_grupo
          const patch: any = { ...editing }
          delete patch.id_grupo
          delete patch.id_finca
          const { data, error } = await grupoCamaService.updateById(id, patch)
          if (error) throw error
          const updated = (data as any)
          if (updated) await getStore('grupo_cama').put(updated as any)
        } else {
          const payload: any = { ...editing }
          delete payload.id_finca
          const { data, error } = await grupoCamaService.insert(payload)
          if (error) throw error
          const created = (data as any)
          if (created) await getStore('grupo_cama').put(created as any)
        }
      } else if (isEstadosFenologicos) {
        if (editing.id_estado_fenologico) {
          const id = editing.id_estado_fenologico
          const patch: any = { ...editing }
          delete patch.id_estado_fenologico
          const { data, error } = await estadosFenologicosService.updateById(id, patch)
          if (error) throw error
          const updated = (data as any)
          if (updated) await getStore('estados_fenologicos').put(updated as any)
        } else {
          const payload: any = { ...editing }
          const { data, error } = await estadosFenologicosService.insert(payload)
          if (error) throw error
          const created = (data as any)
          if (created) await getStore('estados_fenologicos').put(created as any)
        }
      } else if (isObservacion) {
        // Create only
        const payload: any = {
          id_cama: editing.id_cama,
          tipo_observacion: editing.tipo_observacion,
          cantidad: editing.cantidad,
          ubicacion_seccion: editing.ubicacion_seccion,
          id_usuario: editing.id_usuario || null,
        }
        const { data, error } = await observacionService.insert(payload)
        if (error) throw error
        const created = (data as any)
        if (created) await getStore('observacion').put(created as any)
      }
      setEditorOpen(false)
      setEditing(null)
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const deleteEditing = async () => {
    setSaving(true)
    setErrorMsg(null)
    try {
      if (isGrupoCama && editing?.id_grupo) {
        const id = editing.id_grupo
        const { error } = await grupoCamaService.deleteById(id)
        if (error) throw error
        await getStore('grupo_cama').delete(id)
      } else if (isEstadosFenologicos && editing?.id_estado_fenologico) {
        const id = editing.id_estado_fenologico
        const { error } = await estadosFenologicosService.deleteById(id)
        if (error) throw error
        await getStore('estados_fenologicos').delete(id)
      } else if (isObservacion) {
        // no delete for observacion from this UI
      }
      setEditorOpen(false)
      setEditing(null)
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">{getTableConfig(table)?.title ?? table}</div>
        {isGrupoCama && (
          <Button size="sm" onClick={openCreate}>Nuevo grupo</Button>
        )}
        {isEstadosFenologicos && (
          <Button size="sm" onClick={openCreateEstado}>Nuevo estado</Button>
        )}
        {isObservacion && (
          <Button size="sm" onClick={openCreateObservacion}>Nueva observación</Button>
        )}
      </div>
      {!!error && (
        <div className="mb-2 text-sm text-red-600">{error}</div>
      )}
      {finalLoading ? (
        <DataTableSkeleton columns={columns as any} rows={8} />
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <DataTable
            caption={`${filtered.length}`}
            columns={columns as any}
            rows={filtered}
            getRowKey={(row: any) => (row[SERVICE_PK[table]] ?? row.id ?? row.__key)}
            onRowClick={isGrupoCama ? (row: any) => openEdit(row) : isEstadosFenologicos ? (row: any) => openEditEstado(row) : undefined}
          />
        </div>
      )}

      {isGrupoCama && (
        <Dialog open={editorOpen} onOpenChange={(o: boolean) => { if (!saving) setEditorOpen(o) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id_grupo ? 'Editar grupo' : 'Nuevo grupo'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Finca</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_finca ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const nextFinca = e.target.value
                    // If current bloque doesn't belong to the selected finca, clear it
                    const blk = bloques.find((b: any) => String(b.id_bloque) === String(prev?.id_bloque))
                    const sameFinca = blk ? String(blk.id_finca) === String(nextFinca) : true
                    return { ...prev, id_finca: nextFinca, id_bloque: sameFinca ? prev?.id_bloque ?? '' : '' }
                  })}
                >
                  <option value="">Seleccione finca</option>
                  {fincas.map((f) => (
                    <option key={(f as any).id_finca} value={(f as any).id_finca}>{String((f as any).nombre)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bloque</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_bloque ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const newBloque = e.target.value
                    const blk = bloques.find((b: any) => String(b.id_bloque) === String(newBloque))
                    const blkFinca = blk ? (blk as any).id_finca : ''
                    return { ...prev, id_bloque: newBloque, id_finca: blkFinca || prev?.id_finca || '' }
                  })}
                >
                  <option value="">Seleccione bloque</option>
                  {bloques
                    .filter((b: any) => !editing?.id_finca || String((b as any).id_finca) === String(editing?.id_finca))
                    .map((b) => (
                      <option key={(b as any).id_bloque} value={(b as any).id_bloque}>{bloqueLabel((b as any).id_bloque)}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Variedad</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_variedad ?? ''}
                  onChange={(e) => setEditing((prev: any) => ({ ...prev, id_variedad: e.target.value }))}
                >
                  <option value="">Seleccione variedad</option>
                  {variedades.map((v) => (
                    <option key={(v as any).id_variedad} value={(v as any).id_variedad}>{variedadLabel((v as any).id_variedad)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Fecha siembra</label>
                <Input type="date" value={editing?.fecha_siembra ?? ''} onChange={(e) => setEditing((p: any) => ({ ...p, fecha_siembra: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Patrón</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.patron ?? ''}
                  onChange={(e) => setEditing((prev: any) => ({ ...prev, patron: e.target.value }))}
                >
                  <option value="">Seleccione patrón</option>
                  {patrones.map((p) => (
                    <option key={(p as any).codigo} value={(p as any).codigo}>{String((p as any).codigo)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Estado</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.estado ?? ''}
                  onChange={(e) => setEditing((prev: any) => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="">Seleccione estado</option>
                  {estados.map((s) => (
                    <option key={(s as any).codigo} value={(s as any).codigo}>{String((s as any).codigo)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tipo planta</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.tipo_planta ?? ''}
                  onChange={(e) => setEditing((prev: any) => ({ ...prev, tipo_planta: e.target.value }))}
                >
                  <option value="">Seleccione tipo</option>
                  {tiposPlanta.map((t) => (
                    <option key={(t as any).codigo} value={(t as any).codigo}>{String((t as any).codigo)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Número de camas</label>
                <Input type="number" value={editing?.numero_camas ?? ''} onChange={(e) => setEditing((p: any) => ({ ...p, numero_camas: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Total plantas</label>
                <Input type="number" value={editing?.total_plantas ?? ''} onChange={(e) => setEditing((p: any) => ({ ...p, total_plantas: e.target.value }))} />
              </div>
            </div>
            {errorMsg ? <div className="text-sm text-red-600 mt-2">{errorMsg}</div> : null}
            <div className="flex justify-between items-center pt-3">
              {editing?.id_grupo ? (
                <Button variant="destructive" onClick={deleteEditing} disabled={saving}>Eliminar</Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeEditor} disabled={saving}>Cancelar</Button>
                <Button onClick={saveEditing} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isEstadosFenologicos && (
        <Dialog open={editorOpen} onOpenChange={(o: boolean) => { if (!saving) setEditorOpen(o) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id_estado_fenologico ? 'Editar estado fenológico' : 'Nuevo estado fenológico'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Finca</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_finca ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const nextFinca = e.target.value
                    const blk = bloques.find((b: any) => String(b.id_bloque) === String(prev?.id_bloque))
                    const sameFinca = blk ? String(blk.id_finca) === String(nextFinca) : true
                    return { ...prev, id_finca: nextFinca, id_bloque: sameFinca ? prev?.id_bloque ?? '' : '' }
                  })}
                >
                  <option value="">Seleccione finca</option>
                  {fincas.map((f) => (
                    <option key={(f as any).id_finca} value={(f as any).id_finca}>{String((f as any).nombre)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bloque</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_bloque ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const newBloque = e.target.value
                    const blk = bloques.find((b: any) => String(b.id_bloque) === String(newBloque))
                    const blkFinca = blk ? (blk as any).id_finca : ''
                    return { ...prev, id_bloque: newBloque, id_finca: blkFinca || prev?.id_finca || '' }
                  })}
                >
                  <option value="">Seleccione bloque</option>
                  {bloques
                    .filter((b: any) => !editing?.id_finca || String((b as any).id_finca) === String(editing?.id_finca))
                    .map((b) => (
                      <option key={(b as any).id_bloque} value={(b as any).id_bloque}>{bloqueLabel((b as any).id_bloque)}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Variedad</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_variedad ?? ''}
                  onChange={(e) => setEditing((prev: any) => ({ ...prev, id_variedad: e.target.value }))}
                >
                  <option value="">Seleccione variedad</option>
                  {variedades.map((v) => (
                    <option key={(v as any).id_variedad} value={(v as any).id_variedad}>{variedadLabel((v as any).id_variedad)}</option>
                  ))}
                </select>
              </div>
              {['dias_brotacion', 'dias_cincuenta_mm', 'dias_quince_cm', 'dias_veinte_cm', 'dias_primera_hoja', 'dias_espiga', 'dias_arroz', 'dias_arveja', 'dias_garbanzo', 'dias_uva', 'dias_rayando_color', 'dias_sepalos_abiertos', 'dias_cosecha'].map((k) => (
                <div key={k}>
                  <label className="block text-xs text-muted-foreground mb-1">{k.replace(/_/g, ' ')}</label>
                  <Input type="number" value={editing?.[k] ?? ''} onChange={(e) => setEditing((p: any) => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            {errorMsg ? <div className="text-sm text-red-600 mt-2">{errorMsg}</div> : null}
            <div className="flex justify-between items-center pt-3">
              {editing?.id_estado_fenologico ? (
                <Button variant="destructive" onClick={deleteEditing} disabled={saving}>Eliminar</Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeEditor} disabled={saving}>Cancelar</Button>
                <Button onClick={saveEditing} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isObservacion && (
        <Dialog open={editorOpen} onOpenChange={(o: boolean) => { if (!saving) setEditorOpen(o) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva observación</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Finca</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_finca ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const nextFinca = e.target.value
                    // Clear cama if inconsistent
                    const camaOk = (() => {
                      if (!prev?.id_cama) return true
                      const cm = camas.find((c: any) => String(c.id_cama) === String(prev.id_cama))
                      if (!cm) return false
                      const gr = grupos.find((g: any) => String(g.id_grupo) === String(cm.id_grupo))
                      if (!gr) return false
                      const bl = bloques.find((b: any) => String(b.id_bloque) === String(gr.id_bloque))
                      return bl && String(bl.id_finca) === String(nextFinca)
                    })()
                    return { ...prev, id_finca: nextFinca, id_bloque: '', id_variedad: '', id_cama: camaOk ? prev?.id_cama ?? '' : '' }
                  })}
                >
                  <option value="">Seleccione finca</option>
                  {fincas.map((f) => (
                    <option key={(f as any).id_finca} value={(f as any).id_finca}>{String((f as any).nombre)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bloque</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_bloque ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const newBloque = e.target.value
                    // Clear cama if inconsistent
                    const camaOk = (() => {
                      if (!prev?.id_cama) return true
                      const cm = camas.find((c: any) => String(c.id_cama) === String(prev.id_cama))
                      if (!cm) return false
                      const gr = grupos.find((g: any) => String(g.id_grupo) === String(cm.id_grupo))
                      return gr && String(gr.id_bloque) === String(newBloque)
                    })()
                    const blk = bloques.find((b: any) => String(b.id_bloque) === String(newBloque))
                    const blkFinca = blk ? (blk as any).id_finca : ''
                    return { ...prev, id_bloque: newBloque, id_finca: blkFinca || prev?.id_finca || '', id_cama: camaOk ? prev?.id_cama ?? '' : '' }
                  })}
                >
                  <option value="">Seleccione bloque</option>
                  {bloques
                    .filter((b: any) => !editing?.id_finca || String((b as any).id_finca) === String(editing?.id_finca))
                    .map((b) => (
                      <option key={(b as any).id_bloque} value={(b as any).id_bloque}>{bloqueLabel((b as any).id_bloque)}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Variedad</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_variedad ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const v = e.target.value
                    // Clear cama if inconsistent
                    const camaOk = (() => {
                      if (!prev?.id_cama) return true
                      const cm = camas.find((c: any) => String(c.id_cama) === String(prev.id_cama))
                      if (!cm) return false
                      const gr = grupos.find((g: any) => String(g.id_grupo) === String(cm.id_grupo))
                      return gr && String(gr.id_variedad) === String(v)
                    })()
                    return { ...prev, id_variedad: v, id_cama: camaOk ? prev?.id_cama ?? '' : '' }
                  })}
                >
                  <option value="">Seleccione variedad</option>
                  {variedades.map((v) => (
                    <option key={(v as any).id_variedad} value={(v as any).id_variedad}>{variedadLabel((v as any).id_variedad)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cama</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_cama ?? ''}
                  onChange={(e) => setEditing((prev: any) => {
                    const id_cama = e.target.value
                    const cm = camas.find((c: any) => String(c.id_cama) === String(id_cama))
                    if (!cm) return { ...prev, id_cama }
                    const gr = grupos.find((g: any) => String(g.id_grupo) === String((cm as any).id_grupo))
                    const blk = gr ? bloques.find((b: any) => String(b.id_bloque) === String((gr as any).id_bloque)) : undefined
                    const id_finca = blk ? (blk as any).id_finca : prev?.id_finca || ''
                    const id_bloque = gr ? (gr as any).id_bloque : prev?.id_bloque || ''
                    const id_variedad = gr ? (gr as any).id_variedad : prev?.id_variedad || ''
                    return { ...prev, id_cama, id_finca, id_bloque, id_variedad }
                  })}
                >
                  <option value="">Seleccione cama</option>
                  {camas
                    .filter((c: any) => {
                      const gr = grupos.find((g: any) => String(g.id_grupo) === String((c as any).id_grupo))
                      if (!gr) return false
                      const bl = bloques.find((b: any) => String(b.id_bloque) === String((gr as any).id_bloque))
                      if (editing?.id_finca && (!bl || String((bl as any).id_finca) !== String(editing.id_finca))) return false
                      if (editing?.id_bloque && String((gr as any).id_bloque) !== String(editing.id_bloque)) return false
                      if (editing?.id_variedad && String((gr as any).id_variedad) !== String(editing.id_variedad)) return false
                      return true
                    })
                    .map((c) => (
                      <option key={(c as any).id_cama} value={(c as any).id_cama}>{String((c as any).nombre ?? (c as any).id_cama)}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Estado (tipo observación)</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.tipo_observacion ?? ''}
                  onChange={(e) => setEditing((prev: any) => ({ ...prev, tipo_observacion: e.target.value }))}
                >
                  <option value="">Seleccione estado</option>
                  {estadoTipos.map((t) => (
                    <option key={(t as any).codigo} value={(t as any).codigo}>{String((t as any).codigo)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cantidad</label>
                <Input type="number" value={editing?.cantidad ?? ''} onChange={(e) => setEditing((p: any) => ({ ...p, cantidad: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ubicación sección</label>
                <Input type="text" value={editing?.ubicacion_seccion ?? ''} onChange={(e) => setEditing((p: any) => ({ ...p, ubicacion_seccion: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Usuario</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2"
                  value={editing?.id_usuario ?? ''}
                  onChange={(e) => setEditing((prev: any) => ({ ...prev, id_usuario: e.target.value }))}
                >
                  <option value="">Seleccione usuario</option>
                  {usuarios.map((u) => (
                    <option key={(u as any).id_usuario} value={(u as any).id_usuario}>{String((u as any).nombres ?? '')} {String((u as any).apellidos ?? '')}</option>
                  ))}
                </select>
              </div>
            </div>
            {errorMsg ? <div className="text-sm text-red-600 mt-2">{errorMsg}</div> : null}
            <div className="flex justify-between items-center pt-3">
              <span />
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeEditor} disabled={saving}>Cancelar</Button>
                <Button onClick={saveEditing} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}





