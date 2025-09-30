import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { fetchTable } from '@/services/tables'
import { toNumber } from '@/lib/data-utils'
import { CosechaCard } from '@/components/cosecha-card'
import { ObservacionesHoyCard } from '@/components/observaciones-hoy-card'
import { ProduccionCard } from '@/components/produccion-card'
import { PinchesCard } from '@/components/pinches-card'
import type { Observacion, Cama, GrupoCama, Bloque, Variedad, Usuario } from '@/types/tables'

export const Route = createFileRoute('/')({
  validateSearch: (search: { table?: string }) => search,
  component: RouteComponent,
})

function RouteComponent() {
  // Raw cosecha rows (fecha, variedad, dias_cosecha)
  const [rows, setRows] = React.useState<Array<{ fecha: string; variedad: string; dias_cosecha: number }>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [cosechaSummary, setCosechaSummary] = React.useState<{ today: Map<string, number>; week: Map<string, number> }>({ today: new Map(), week: new Map() })

  // Observaciones today – summarized by cama (one row per cama) with latest user
  const [obsItems, setObsItems] = React.useState<Array<{ bloqueId: number; bloque: string; variedadId: number; variedad: string; camaId: number; cama: string; userId: number | null; userName: string }>>([])
  const [obsError, setObsError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          // Use the cosecha table we already derive (fecha, variedad, dias_cosecha)
          const { rows } = await fetchTable('cosecha')
          const shaped = (rows as Array<Record<string, unknown>>).map(r => ({
            fecha: String((r as any).fecha),
            variedad: String((r as any).variedad ?? ''),
            dias_cosecha: toNumber((r as any).dias_cosecha) || 0,
          }))
          if (!cancelled) {
            setRows(shaped)

            const todayTotals = new Map<string, number>()
            const weekTotals = new Map<string, number>()

            const now = new Date()
            const todayKey = now.toISOString().slice(0, 10)
            const currentDay = (now.getUTCDay() + 6) % 7
            const currentMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - currentDay))
            const currentYear = currentMonday.getUTCFullYear()
            const currentOneJan = new Date(Date.UTC(currentYear, 0, 1))
            const currentWeek = Math.floor(((+currentMonday - +currentOneJan) / 86400000 + ((currentOneJan.getUTCDay() + 6) % 7)) / 7) + 1
            const currentWeekKey = `${currentYear}-W${String(currentWeek).padStart(2, '0')}`

            for (const r of shaped) {
              const base = toNumber(r.dias_cosecha)
              if (!Number.isFinite(base)) continue
              const variety = r.variedad ?? ''

              if (r.fecha === todayKey) {
                todayTotals.set(variety, (todayTotals.get(variety) ?? 0) + base)
                todayTotals.set('', (todayTotals.get('') ?? 0) + base)
              }

              const date = new Date(r.fecha)
              if (Number.isNaN(date.getTime())) continue
              const day = (date.getUTCDay() + 6) % 7
              const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day))
              const year = monday.getUTCFullYear()
              const oneJan = new Date(Date.UTC(year, 0, 1))
              const week = Math.floor(((+monday - +oneJan) / 86400000 + ((oneJan.getUTCDay() + 6) % 7)) / 7) + 1
              const weekKey = `${year}-W${String(week).padStart(2, '0')}`
              if (weekKey === currentWeekKey) {
                weekTotals.set('', (weekTotals.get('') ?? 0) + base)
                weekTotals.set(variety, (weekTotals.get(variety) ?? 0) + base)
              }
            }

            setCosechaSummary({ today: todayTotals, week: weekTotals })
          }
        } catch (e: any) {
          if (!cancelled) setError(e?.message ?? 'Error loading data')
        } finally {
          // no-op
        }
      })()
    return () => {
      cancelled = true
    }
  }, [])

  // Load today's observations and map to cama latest user
  React.useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const [obsRes, camaRes, grupoRes, bloqueRes, variedadRes, usuarioRes] = await Promise.all([
            fetchTable('observacion'),
            fetchTable('cama'),
            fetchTable('grupo_cama'),
            fetchTable('bloque'),
            fetchTable('variedad'),
            fetchTable('usuario'),
          ])

          const obs = obsRes.rows as Observacion[]
          const camas = camaRes.rows as Cama[]
          const grupos = grupoRes.rows as GrupoCama[]
          const bloques = bloqueRes.rows as Bloque[]
          const variedades = variedadRes.rows as Variedad[]
          const usuarios = usuarioRes.rows as Usuario[]

          const camaById = new Map<number, Cama>(camas.map(c => [c.id_cama, c]))
          const grupoById = new Map<number, GrupoCama>(grupos.map(g => [g.id_grupo, g]))
          const bloqueById = new Map<number, Bloque>(bloques.map(b => [b.id_bloque, b]))
          const variedadById = new Map<number, Variedad>(variedades.map(v => [v.id_variedad, v]))
          const usuarioById = new Map<number, Usuario>(usuarios.map(u => [u.id_usuario, u]))

          const today = new Date()
          const y = today.getFullYear(), m = today.getMonth(), d = today.getDate()
          const start = new Date(y, m, d, 0, 0, 0, 0)
          const end = new Date(y, m, d, 23, 59, 59, 999)
          const inToday = (ts: string | null | undefined) => {
            if (!ts) return false
            const t = new Date(ts)
            const time = t.getTime()
            return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime()
          }

          // group by cama; choose latest observation for the user color
          type Key = string
          const latestByKey = new Map<Key, { createdAt: string; bloqueId: number; variedadId: number; camaId: number; userId: number | null }>()
          for (const o of obs) {
            if (!inToday(o.creado_en)) continue
            const cama = camaById.get(o.id_cama)
            if (!cama) continue
            const grupo = grupoById.get(cama.id_grupo)
            if (!grupo) continue
            const bloqueId = grupo.id_bloque
            const variedadId = grupo.id_variedad
            const camaId = cama.id_cama
            const createdAt = o.creado_en ?? ''
            const key = `${camaId}`
            const prev = latestByKey.get(key)
            if (!prev || String(prev.createdAt) < String(createdAt)) {
              latestByKey.set(key, { createdAt, bloqueId, variedadId, camaId, userId: o.id_usuario })
            }
          }

          const items = Array.from(latestByKey.values()).map(v => {
            const bloque = bloqueById.get(v.bloqueId)?.nombre ?? String(v.bloqueId)
            const variedad = variedadById.get(v.variedadId)?.nombre ?? String(v.variedadId)
            const cama = camaById.get(v.camaId)?.nombre ?? String(v.camaId)
            const userName = v.userId != null ? [usuarioById.get(v.userId)?.nombres, usuarioById.get(v.userId)?.apellidos].filter(Boolean).join(' ') : '—'
            return { bloqueId: v.bloqueId, bloque, variedadId: v.variedadId, variedad, camaId: v.camaId, cama, userId: v.userId ?? null, userName }
          }).sort((a, b) => a.bloque.localeCompare(b.bloque) || a.variedad.localeCompare(b.variedad) || a.cama.localeCompare(b.cama))

          if (!cancelled) setObsItems(items)
        } catch (e: any) {
          if (!cancelled) setObsError(e?.message ?? 'Error loading observations')
        }
      })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4 gap-4">
      <div className="grid md:grid-cols-2 flex-1 min-h-0 gap-4">
        <CosechaCard rows={rows} error={error} summary={cosechaSummary} />
        <ObservacionesHoyCard obsItems={obsItems} obsError={obsError} />
      </div>
      <div className="grid md:grid-cols-2 min-h-[300px] gap-4">
        <ProduccionCard />
        <PinchesCard />
      </div>
    </div>
  )
}