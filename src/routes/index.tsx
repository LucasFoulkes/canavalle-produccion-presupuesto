import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore } from '@/lib/dexie'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SummaryMetrics = {
  totalCamas: number
  totalVariedades: number
  totalObservaciones: number
  porcentajeOffline: number
}

type TopVariedad = {
  nombre: string
  total: number
}

type RecentChange = {
  id: string
  title: string
  subtitle: string
  timestamp: string
  href: string
}

type DashboardData = {
  metrics: SummaryMetrics
  topVariedades: TopVariedad[]
  recientes: RecentChange[]
}

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const online = useOnlineStatus()

  const { data, loading } = useDeferredLiveQuery<DashboardData | undefined>(async () => {
    const [camas, variedades, observaciones, grupos, bloques, fincas] = await Promise.all([
      getStore('cama').toArray(),
      getStore('variedad').toArray(),
      getStore('observacion').toArray(),
      getStore('grupo_cama').toArray(),
      getStore('bloque').toArray(),
      getStore('finca').toArray(),
    ])

    const metrics: SummaryMetrics = {
      totalCamas: camas.length,
      totalVariedades: variedades.length,
      totalObservaciones: observaciones.length,
      porcentajeOffline: computeOfflinePercentage(observaciones as any[]),
    }

    const gruposPorVariedad = new Map<string, number>()
    for (const grupo of grupos as any[]) {
      const variedadId = String(grupo?.id_variedad ?? '')
      if (!variedadId) continue
      gruposPorVariedad.set(variedadId, (gruposPorVariedad.get(variedadId) ?? 0) + 1)
    }

    const topVariedades: TopVariedad[] = (variedades as any[])
      .map((variedad) => ({
        nombre: String(variedad?.nombre ?? 'Variedad sin nombre'),
        total: gruposPorVariedad.get(String(variedad?.id_variedad ?? '')) ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    const bloquesById = new Map<string, any>()
    for (const bloque of bloques as any[]) bloquesById.set(String(bloque?.id_bloque ?? ''), bloque)
    const fincasById = new Map<string, any>()
    for (const finca of fincas as any[]) fincasById.set(String(finca?.id_finca ?? ''), finca)
    const camasById = new Map<string, any>()
    for (const cama of camas as any[]) camasById.set(String(cama?.id_cama ?? ''), cama)

    const recientes: RecentChange[] = [...(observaciones as any[])]
      .sort((a, b) => toDate(b?.creado_en ?? b?.fecha).getTime() - toDate(a?.creado_en ?? a?.fecha).getTime())
      .slice(0, 6)
      .map((obs, index) => {
        const cryptoApi = (globalThis as any)?.crypto
        const fallbackId = typeof cryptoApi?.randomUUID === 'function'
          ? cryptoApi.randomUUID()
          : `tmp-${index}`
        const cama = camasById.get(String(obs?.id_cama ?? ''))
        const bloque = bloquesById.get(String(obs?.id_bloque ?? ''))
        const finca = fincasById.get(String(obs?.id_finca ?? ''))
        const subtitle = [finca?.nombre, bloque?.nombre, cama?.nombre].filter(Boolean).join(' · ')
        return {
          id: String(obs?.id_observacion ?? obs?.id ?? obs?.creado_en ?? fallbackId),
          title: `${obs?.tipo_observacion ?? 'Observación'} · ${obs?.cantidad ?? 0}`,
          subtitle: subtitle || 'Ubicación desconocida',
          timestamp: formatRelative(obs?.creado_en ?? obs?.fecha),
          href: '/db/observacion',
        }
      })

    return { metrics, topVariedades, recientes }
  }, [], { defer: false })

  const metrics = data?.metrics
  const topVariedades = data?.topVariedades ?? []
  const recientes = data?.recientes ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Canavalle Producción</h1>
          <p className="text-muted-foreground text-sm">Resumen de tablas y observaciones recientes.</p>
        </div>
        {!online && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1 text-sm text-destructive shadow-sm">
            Sin conexión · trabajando con datos locales
          </div>
        )}
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {loading && <StatSkeleton />}
        {!loading && metrics && (
          <>
            <StatCard label="Camas" value={metrics.totalCamas.toLocaleString()} href="/db/cama" />
            <StatCard label="Variedades" value={metrics.totalVariedades.toLocaleString()} href="/db/variedad" />
            <StatCard label="Observaciones" value={metrics.totalObservaciones.toLocaleString()} href="/db/observacion" />
            <StatCard
              label="Observaciones sin sincronizar"
              value={`${metrics.porcentajeOffline}%`}
              tone={metrics.porcentajeOffline > 0 ? 'alert' : 'default'}
              href="/db/observacion"
            />
          </>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="min-h-[260px]">
          <CardHeader>
            <CardTitle className="text-base">Últimas observaciones</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            {loading && <DataTableSkeleton columns={[{ key: 'observacion' }]} rows={6} />}
            {!loading && recientes.length > 0 && (
              <ul className="flex flex-col divide-y">
                {recientes.map((obs) => (
                  <li key={obs.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{obs.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{obs.subtitle}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">{obs.timestamp}</span>
                      <Button asChild size="sm" variant="ghost" className="text-xs">
                        <Link to={obs.href}>Abrir</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!loading && recientes.length === 0 && <EmptyState message="Sin observaciones recientes" />}
          </CardContent>
        </Card>

        <Card className="min-h-[260px]">
          <CardHeader>
            <CardTitle className="text-base">Variedades con más camas asociadas</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            {loading && <DataTableSkeleton columns={[{ key: 'variedad' }]} rows={5} />}
            {!loading && topVariedades.length > 0 && (
              <DataTable
                columns={[
                  { key: 'nombre', header: 'Variedad' },
                  { key: 'total', header: 'Camas', render: (value) => Number(value ?? 0).toLocaleString() },
                ]}
                rows={topVariedades}
              />
            )}
            {!loading && topVariedades.length === 0 && <EmptyState message="Sin datos de variedades" />}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StatCard({ label, value, href, tone = 'default' }: { label: string; value: React.ReactNode; href: string; tone?: 'default' | 'alert' }) {
  return (
    <Card className={cn('border border-border/60 shadow-sm', tone === 'alert' && 'border-destructive/40 bg-destructive/5')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Button asChild size="sm" variant="ghost" className="text-xs">
          <Link to={href}>Ver tabla</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function StatSkeleton() {
  return (
    <Card className="animate-pulse border-dashed">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Cargando métricas…</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">···</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed py-8 text-sm text-muted-foreground">
      <span>{message}</span>
    </div>
  )
}

function computeOfflinePercentage(observaciones: any[]): number {
  if (!observaciones.length) return 0
  const offline = observaciones.filter((obs) => isPendingObservation(obs)).length
  return Math.round((offline / observaciones.length) * 100)
}

function isPendingObservation(obs: any): boolean {
  const flags = [obs?._status, obs?.status, obs?.pendiente, obs?.pending, obs?._synced, obs?.synced]
  if (flags.includes('pending') || flags.includes('pendiente')) return true
  if (flags.includes(false)) return true
  if (obs?._synced_at === null || obs?._synced_at === undefined) return true
  return false
}

function formatRelative(value: any): string {
  if (!value) return 'Hace un momento'
  const date = toDate(value)
  if (!Number.isFinite(date.getTime())) return 'Fecha desconocida'
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 1) return 'Hace un momento'
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `Hace ${diffHours} h`
  const diffDays = Math.round(diffHours / 24)
  return `Hace ${diffDays} d`
}

function toDate(value: any): Date {
  if (value instanceof Date) return value
  const parsed = new Date(value)
  if (Number.isFinite(parsed.getTime())) return parsed
  return new Date(0)
}
