import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db } from '@/lib/dexie'
import { observacionesService } from '@/services/observaciones.service'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Toggle } from '@/components/ui/toggle'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table as TableIcon, LayoutList } from 'lucide-react'
import { getTrackedEstados } from '@/lib/preferences'

export const Route = createFileRoute('/app/reportes')({
  component: RouteComponent,
})

function RouteComponent() {
  const [tipos, setTipos] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [tracked, setTracked] = useState<string[]>([])
  const [camaNames, setCamaNames] = useState<Record<number, string>>({})
  const [bloqueNames, setBloqueNames] = useState<Record<number, string>>({})
  const [fincaNames, setFincaNames] = useState<Record<number, string>>({})
  const [camaToBloqueMap, setCamaToBloqueMap] = useState<Record<number, number>>({})
  const [bloqueToFincaMap, setBloqueToFincaMap] = useState<Record<number, number>>({})
  const [view, setView] = useState<'table' | 'badges'>('table')

  useEffect(() => {
    ; (async () => {
      const [t, obs] = await Promise.all([
        observacionesService.listTipos(),
        db.observacion.toArray(),
      ])
      const activeTipos = (t || [])
        .filter((x: any) => x.activo !== false)
        .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
      setTipos(activeTipos)
      setRows(obs)
      setTracked(getTrackedEstados())
    })()
  }, [])

  // Build table columns once tipos are loaded

  // Helpers
  function inc(map: Record<string, number>, key: string, val: number) {
    map[key] = (map[key] ?? 0) + (val || 0)
  }
  // Column headers are derived from tipos; no need for prettyEstado formatter now

  // Aggregations
  const bySeccion = useMemo(() => {
    // key: `${camaId}::${ubicacion_seccion}::${fecha}`
    const agg = new Map<string, { camaId: number; seccion: string; fecha: string; estados: Record<string, number> }>()
    for (const r of rows) {
      const fecha = String(r.creado_en ?? '').slice(0, 10)
      const key = `${r.id_cama}::${r.ubicacion_seccion ?? ''}::${fecha}`
      let obj = agg.get(key)
      if (!obj) {
        obj = { camaId: r.id_cama, seccion: String(r.ubicacion_seccion ?? ''), fecha, estados: {} }
        agg.set(key, obj)
      }
      inc(obj.estados, String((r as any).tipo_observacion ?? (r as any).estado_fenologico), r.cantidad || 0)
    }
    return Array.from(agg.values())
  }, [rows])

  const byCama = useMemo(() => {
    const agg = new Map<string, { camaId: number; fecha: string; estados: Record<string, number> }>()
    for (const r of rows) {
      const fecha = String(r.creado_en ?? '').slice(0, 10)
      const key = `${r.id_cama}::${fecha}`
      let obj = agg.get(key)
      if (!obj) { obj = { camaId: r.id_cama, fecha, estados: {} }; agg.set(key, obj) }
      inc(obj.estados, String((r as any).tipo_observacion ?? (r as any).estado_fenologico), r.cantidad || 0)
    }
    return Array.from(agg.values())
  }, [rows])

  // bloque and finca aggregations are computed in the effect below (requires async joins)

  // Because joining requires async Dexie reads, compute joins in a small effect after rows loaded.
  const [bloqueAgg, setBloqueAgg] = useState<any[]>([])
  const [fincaAgg, setFincaAgg] = useState<any[]>([])
  useEffect(() => {
    ; (async () => {
      // Build lookups
      const [camas, bloques, fincas] = await Promise.all([
        db.cama.toArray(),
        db.bloque.toArray(),
        db.finca.toArray(),
      ])
      const camaToBloque = new Map<number, number>()
      for (const c of camas) camaToBloque.set(Number((c as any).id_cama), Number((c as any).id_bloque ?? (c as any).bloque_id))
      const bloqueToFinca = new Map<number, number>()
      for (const b of bloques) bloqueToFinca.set(Number((b as any).id_bloque ?? (b as any).bloque_id ?? (b as any).id), Number((b as any).id_finca ?? (b as any).finca_id))

      // expose maps for rendering hierarchical columns
      const ctb: Record<number, number> = {}
      camaToBloque.forEach((v, k) => { ctb[k] = v })
      setCamaToBloqueMap(ctb)
      const btf: Record<number, number> = {}
      bloqueToFinca.forEach((v, k) => { btf[k] = v })
      setBloqueToFincaMap(btf)

      // Human-readable names
      const cn: Record<number, string> = {}
      for (const c of camas) {
        const name = (c.nombre != null && c.nombre !== '') ? String(c.nombre) : String((c as any).id_cama)
        cn[Number((c as any).id_cama)] = name
      }
      setCamaNames(cn)
      const bn: Record<number, string> = {}
      for (const b of bloques) {
        const code = (b as any).codigo ?? (b as any).nombre
        const name = (code != null && code !== '') ? String(code) : String((b as any).id_bloque ?? (b as any).bloque_id ?? (b as any).id)
        bn[Number((b as any).id_bloque ?? (b as any).bloque_id ?? (b as any).id)] = name
      }
      setBloqueNames(bn)
      const fn: Record<number, string> = {}
      for (const f of fincas) {
        const name = (f.nombre != null && f.nombre !== '') ? String(f.nombre) : String((f as any).id_finca ?? (f as any).finca_id ?? (f as any).id)
        fn[Number((f as any).id_finca ?? (f as any).finca_id ?? (f as any).id)] = name
      }
      setFincaNames(fn)

      // Aggregate by bloque
      const bAgg = new Map<string, { bloqueId: number; fecha: string; estados: Record<string, number> }>()
      for (const r of rows) {
        const bloqueId = camaToBloque.get(Number(r.id_cama))
        if (bloqueId == null) continue
        const fecha = String(r.creado_en ?? '').slice(0, 10)
        const key = `${bloqueId}::${fecha}`
        let obj = bAgg.get(key)
        if (!obj) { obj = { bloqueId, fecha, estados: {} }; bAgg.set(key, obj) }
        inc(obj.estados, String((r as any).tipo_observacion ?? (r as any).estado_fenologico), r.cantidad || 0)
      }
      setBloqueAgg(Array.from(bAgg.values()))

      // Aggregate by finca
      const fAgg = new Map<string, { fincaId: number; fecha: string; estados: Record<string, number> }>()
      for (const r of rows) {
        const bloqueId = camaToBloque.get(Number(r.id_cama))
        if (bloqueId == null) continue
        const fincaId = bloqueToFinca.get(Number(bloqueId))
        if (fincaId == null) continue
        const fecha = String(r.creado_en ?? '').slice(0, 10)
        const key = `${fincaId}::${fecha}`
        let obj = fAgg.get(key)
        if (!obj) { obj = { fincaId, fecha, estados: {} }; fAgg.set(key, obj) }
        inc(obj.estados, String((r as any).tipo_observacion ?? (r as any).estado_fenologico), r.cantidad || 0)
      }
      setFincaAgg(Array.from(fAgg.values()))
    })()
  }, [rows])

  // totals are computed per visible columns via rowTotal

  const estadoCols = useMemo(() => {
    const all = tipos.map((t: any) => ({ code: String(t.codigo), name: String(t.nombre) }))
    if (!tracked || tracked.length === 0) return all
    const set = new Set(tracked.map(String))
    return all.filter((c) => set.has(c.code))
  }, [tipos, tracked])
  const cell = (estados: Record<string, number>, code: string) => estados?.[code] ?? 0
  const BadgesFor = ({ estados, cols }: { estados: Record<string, number>, cols: { code: string; name: string }[] }) => {
    const entries = cols
      .map((c) => [c.name, estados?.[c.code] ?? 0, c.code] as const)
      .filter(([, qty]) => qty > 0)
    if (entries.length === 0) return <span className='text-sm text-muted-foreground'>Sin datos</span>
    return (
      <div className='flex flex-wrap gap-1'>
        {entries.map(([name, qty, code]) => (
          <Badge key={code} variant='secondary' className='gap-1'>
            <span>{name}</span>
            <Separator orientation='vertical' className='mx-1 h-4' />
            <span className='font-semibold'>{qty}</span>
          </Badge>
        ))}
      </div>
    )
  }
  // Per-tab: hide columns that are all zeros across the tab's rows
  const nonZeroCols = (cols: { code: string; name: string }[], rowsAgg: { estados: Record<string, number> }[]) =>
    cols.filter((c) => rowsAgg.some((r) => (r.estados?.[c.code] ?? 0) > 0))
  const visColsSeccion = useMemo(() => nonZeroCols(estadoCols, bySeccion), [estadoCols, bySeccion])
  const visColsCama = useMemo(() => nonZeroCols(estadoCols, byCama), [estadoCols, byCama])
  const visColsBloque = useMemo(() => nonZeroCols(estadoCols, bloqueAgg), [estadoCols, bloqueAgg])
  const visColsFinca = useMemo(() => nonZeroCols(estadoCols, fincaAgg), [estadoCols, fincaAgg])

  return (
    <div className='flex flex-col h-full p-3 gap-3'>
      <h1 className='text-2xl font-thin text-center'>Reportes</h1>
      <div className='flex items-center justify-end gap-3'>
        <Toggle
          variant='outline'
          pressed={view === 'table'}
          onPressedChange={(p) => setView(p ? 'table' : 'badges')}
          aria-label='Cambiar vista'
        >
          {view === 'table' ? <TableIcon className='mr-1 h-4 w-4' /> : <LayoutList className='mr-1 h-4 w-4' />}
          {view === 'table' ? 'Tabla' : 'Badges'}
        </Toggle>
      </div>
      <Tabs defaultValue='seccion' className='flex-1 mt-2'>
        <TabsList className='mx-auto'>
          <TabsTrigger value='seccion'>Sección</TabsTrigger>
          <TabsTrigger value='cama'>Cama</TabsTrigger>
          <TabsTrigger value='bloque'>Bloque</TabsTrigger>
          <TabsTrigger value='finca'>Finca</TabsTrigger>
        </TabsList>

        <TabsContent value='seccion' className='flex-1 overflow-y-auto'>
          {estadoCols.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin estados seleccionados. Configura en Configuración → Estados Fenológicos.</div>
          ) : bySeccion.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin observaciones</div>
          ) : visColsSeccion.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin datos en las columnas seleccionadas</div>
          ) : view === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finca</TableHead>
                  <TableHead>Bloque</TableHead>
                  <TableHead>Cama</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Fecha</TableHead>
                  {visColsSeccion.map((c) => (
                    <TableHead key={c.code}>{c.name}</TableHead>
                  ))}
                  {/* No total column */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySeccion.map((r) => (
                  <TableRow key={`${r.camaId}-${r.seccion}-${r.fecha}`}>
                    {(() => {
                      const bloqueId = camaToBloqueMap[r.camaId]
                      const fincaId = bloqueId != null ? bloqueToFincaMap[bloqueId] : undefined
                      return (
                        <>
                          <TableCell>{fincaId != null ? (fincaNames[fincaId] ?? String(fincaId)) : '—'}</TableCell>
                          <TableCell>{bloqueId != null ? (bloqueNames[bloqueId] ?? String(bloqueId)) : '—'}</TableCell>
                          <TableCell>{camaNames[r.camaId] ?? String(r.camaId)}</TableCell>
                          <TableCell>{r.seccion || '—'}</TableCell>
                          <TableCell>{r.fecha || '—'}</TableCell>
                        </>
                      )
                    })()}
                    {visColsSeccion.map((c) => (
                      <TableCell key={c.code}>{cell(r.estados, c.code)}</TableCell>
                    ))}
                    {/* No total cell */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='space-y-3'>
              {bySeccion.map((r) => {
                const bloqueId = camaToBloqueMap[r.camaId]
                const fincaId = bloqueId != null ? bloqueToFincaMap[bloqueId] : undefined
                return (
                  <div key={`${r.camaId}-${r.seccion}-${r.fecha}`} className='p-3 border rounded-md bg-white'>
                    <div className='text-sm text-muted-foreground mb-2'>
                      {fincaId != null ? (fincaNames[fincaId] ?? String(fincaId)) : '—'} • {bloqueId != null ? (bloqueNames[bloqueId] ?? String(bloqueId)) : '—'} • {camaNames[r.camaId] ?? String(r.camaId)} • {r.seccion || '—'} • {r.fecha || '—'}
                    </div>
                    <BadgesFor estados={r.estados} cols={visColsSeccion} />
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value='cama' className='flex-1 overflow-y-auto'>
          {estadoCols.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin estados seleccionados. Configura en Configuración → Estados Fenológicos.</div>
          ) : byCama.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin observaciones</div>
          ) : visColsCama.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin datos en las columnas seleccionadas</div>
          ) : view === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finca</TableHead>
                  <TableHead>Bloque</TableHead>
                  <TableHead>Cama</TableHead>
                  <TableHead>Fecha</TableHead>
                  {visColsCama.map((c) => (
                    <TableHead key={c.code}>{c.name}</TableHead>
                  ))}
                  {/* No total column */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCama.map((r) => (
                  <TableRow key={`${r.camaId}-${r.fecha}`}>
                    {(() => {
                      const bloqueId = camaToBloqueMap[r.camaId]
                      const fincaId = bloqueId != null ? bloqueToFincaMap[bloqueId] : undefined
                      return (
                        <>
                          <TableCell>{fincaId != null ? (fincaNames[fincaId] ?? String(fincaId)) : '—'}</TableCell>
                          <TableCell>{bloqueId != null ? (bloqueNames[bloqueId] ?? String(bloqueId)) : '—'}</TableCell>
                          <TableCell>{camaNames[r.camaId] ?? String(r.camaId)}</TableCell>
                          <TableCell>{r.fecha || '—'}</TableCell>
                        </>
                      )
                    })()}
                    {visColsCama.map((c) => (
                      <TableCell key={c.code}>{cell(r.estados, c.code)}</TableCell>
                    ))}
                    {/* No total cell */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='space-y-3'>
              {byCama.map((r) => {
                const bloqueId = camaToBloqueMap[r.camaId]
                const fincaId = bloqueId != null ? bloqueToFincaMap[bloqueId] : undefined
                return (
                  <div key={`${r.camaId}-${r.fecha}`} className='p-3 border rounded-md bg-white'>
                    <div className='text-sm text-muted-foreground mb-2'>
                      {fincaId != null ? (fincaNames[fincaId] ?? String(fincaId)) : '—'} • {bloqueId != null ? (bloqueNames[bloqueId] ?? String(bloqueId)) : '—'} • {camaNames[r.camaId] ?? String(r.camaId)} • {r.fecha || '—'}
                    </div>
                    <BadgesFor estados={r.estados} cols={visColsCama} />
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value='bloque' className='flex-1 overflow-y-auto'>
          {estadoCols.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin estados seleccionados. Configura en Configuración → Estados Fenológicos.</div>
          ) : bloqueAgg.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin observaciones</div>
          ) : visColsBloque.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin datos en las columnas seleccionadas</div>
          ) : view === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finca</TableHead>
                  <TableHead>Bloque</TableHead>
                  <TableHead>Fecha</TableHead>
                  {visColsBloque.map((c) => (
                    <TableHead key={c.code}>{c.name}</TableHead>
                  ))}
                  {/* No total column */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bloqueAgg.map((r) => (
                  <TableRow key={`${r.bloqueId}-${r.fecha}`}>
                    {(() => {
                      const fincaId = bloqueToFincaMap[r.bloqueId]
                      return (
                        <>
                          <TableCell>{fincaId != null ? (fincaNames[fincaId] ?? String(fincaId)) : '—'}</TableCell>
                          <TableCell>{bloqueNames[r.bloqueId] ?? String(r.bloqueId)}</TableCell>
                          <TableCell>{r.fecha || '—'}</TableCell>
                        </>
                      )
                    })()}
                    {visColsBloque.map((c) => (
                      <TableCell key={c.code}>{cell(r.estados, c.code)}</TableCell>
                    ))}
                    {/* No total cell */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='space-y-3'>
              {bloqueAgg.map((r) => {
                const fincaId = bloqueToFincaMap[r.bloqueId]
                return (
                  <div key={`${r.bloqueId}-${r.fecha}`} className='p-3 border rounded-md bg-white'>
                    <div className='text-sm text-muted-foreground mb-2'>
                      {fincaId != null ? (fincaNames[fincaId] ?? String(fincaId)) : '—'} • {bloqueNames[r.bloqueId] ?? String(r.bloqueId)} • {r.fecha || '—'}
                    </div>
                    <BadgesFor estados={r.estados} cols={visColsBloque} />
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value='finca' className='flex-1 overflow-y-auto'>
          {estadoCols.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin estados seleccionados. Configura en Configuración → Estados Fenológicos.</div>
          ) : fincaAgg.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin observaciones</div>
          ) : visColsFinca.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground py-10'>Sin datos en las columnas seleccionadas</div>
          ) : view === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finca</TableHead>
                  <TableHead>Fecha</TableHead>
                  {visColsFinca.map((c) => (
                    <TableHead key={c.code}>{c.name}</TableHead>
                  ))}
                  {/* No total column */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fincaAgg.map((r) => (
                  <TableRow key={`${r.fincaId}-${r.fecha}`}>
                    <TableCell>{fincaNames[r.fincaId] ?? String(r.fincaId)}</TableCell>
                    <TableCell>{r.fecha || '—'}</TableCell>
                    {visColsFinca.map((c) => (
                      <TableCell key={c.code}>{cell(r.estados, c.code)}</TableCell>
                    ))}
                    {/* No total cell */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='space-y-3'>
              {fincaAgg.map((r) => (
                <div key={`${r.fincaId}-${r.fecha}`} className='p-3 border rounded-md bg-white'>
                  <div className='text-sm text-muted-foreground mb-2'>
                    {fincaNames[r.fincaId] ?? String(r.fincaId)} • {r.fecha || '—'}
                  </div>
                  <BadgesFor estados={r.estados} cols={visColsFinca} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
