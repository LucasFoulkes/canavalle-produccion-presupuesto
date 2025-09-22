import * as React from 'react'
import { DatePicker, DateRangePicker, DateRangeValue } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { getStore } from '@/lib/dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { format } from 'date-fns'
import { minutesToDate } from '@/lib/date-helpers'

export type GpsRow = {
    id?: string
    __key?: string
    latitud: number
    longitud: number
    precision?: number | null
    altitud?: number | null
    capturado_en: string // ISO timestamp
    observacion?: boolean
    usuario_id?: number | null
}

export type UserRow = {
    id_usuario: number
    nombres?: string
    apellidos?: string
}

const userColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
]

function colorForUser(id?: number | null): string {
    if (id == null) return '#555'
    const idx = Math.abs(id) % userColors.length
    return userColors[idx]
}

export function AllGpsMapSection() {
    const [range, setRange] = React.useState<DateRangeValue>(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        return { from: today, to: today }
    })
    const [timeCutoff, setTimeCutoff] = React.useState<number>(24 * 60)

    const puntos = useLiveQuery(async () => {
        const store = getStore('puntos_gps')
        const all = await store.toArray()
        return all as GpsRow[]
    }, [])
    const usuarios = useLiveQuery(async () => {
        const store = getStore('usuario')
        const all = await store.toArray()
        return all as UserRow[]
    }, [])

    const usersById = React.useMemo(() => {
        const m = new Map<number, UserRow>()
        for (const u of usuarios || []) m.set(u.id_usuario, u)
        return m
    }, [usuarios])

    const filtered = React.useMemo(() => {
        if (!puntos) return [] as GpsRow[]
        const from = range.from ? new Date(range.from) : null
        const to = range.to ? new Date(range.to) : from
        if (from) from.setHours(0, 0, 0, 0)
        if (to) to.setHours(23, 59, 59, 999)

        const lastDay = to ? new Date(to) : from
        let lastDayEnd: Date | null = null
        if (lastDay) {
            lastDayEnd = new Date(lastDay)
            const hours = Math.floor(timeCutoff / 60)
            const minutes = timeCutoff % 60
            lastDayEnd.setHours(hours, minutes, 59, 999)
        }

        return (puntos as GpsRow[]).filter((p) => {
            const lat = Number(p.latitud)
            const lon = Number(p.longitud)
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
            if (lat === 0 && lon === 0) return false
            const acc = (p as any).precision
            if (Number.isFinite(acc) && (acc as number) > 200) return false

            const ts = new Date(p.capturado_en)
            if (from && ts < from) return false
            if (to && ts > to) return false
            if (lastDay && ts.getUTCFullYear() === lastDay.getUTCFullYear() && ts.getUTCMonth() === lastDay.getUTCMonth() && ts.getUTCDate() === lastDay.getUTCDate()) {
                if (lastDayEnd && ts > lastDayEnd) return false
            }
            return true
        })
    }, [puntos, range, timeCutoff])

    const bounds = React.useMemo(() => {
        const latlngs = filtered.map((p) => [p.latitud, p.longitud] as [number, number])
        if (latlngs.length === 0) return null
        return L.latLngBounds(latlngs)
    }, [filtered])

    return (
        <section className="flex min-h-0 h-full flex-col overflow-hidden">
            <header className="shrink-0 flex flex-wrap items-center gap-2 px-0 pb-2 justify-center">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                        const from = range.from ? new Date(range.from) : new Date()
                        from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
                        setRange({ from, to: from })
                        setTimeCutoff(24 * 60)
                    }}>Día anterior</Button>
                    <DatePicker
                        value={range.from}
                        onChange={(d) => {
                            if (!d) return
                            const day = new Date(d); day.setHours(0, 0, 0, 0)
                            setRange({ from: day, to: day })
                            setTimeCutoff(24 * 60)
                        }}
                        placeholder="Seleccionar día"
                        className="w-[180px]"
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                        const from = range.from ? new Date(range.from) : new Date()
                        from.setDate(from.getDate() + 1); from.setHours(0, 0, 0, 0)
                        setRange({ from, to: from })
                        setTimeCutoff(24 * 60)
                    }}>Día siguiente</Button>
                    <DateRangePicker value={range} onChange={(r) => setRange(r)} placeholder="Rango de fechas" className="w-[240px]" />
                </div>
            </header>

            <div className="flex-1 min-h-0 flex flex-col gap-2">
                <div className="relative w-full h-[55vh] min-h-[320px] md:h-[65vh] md:min-h-[420px] md:flex-none overflow-hidden rounded-md border">
                    <MapContainer center={[4.711, -74.072]} zoom={13} className="h-full w-full">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                            subdomains={["a", "b", "c", "d"]}
                            maxZoom={20}
                        />
                        {filtered.map((p, idx) => {
                            const key = String((p as any).id ?? (p as any).__key ?? idx)
                            const color = colorForUser(p.usuario_id as number)
                            const isObs = Boolean((p as any).observacion)
                            const html = isObs
                                ? `<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style="display:block">
                     <polygon points="6,11 1,2 11,2" fill="${color}" stroke="white" stroke-width="1" />
                   </svg>`
                                : `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:1px solid white;"></div>`
                            return (
                                <Marker
                                    key={key}
                                    position={[Number(p.latitud), Number(p.longitud)] as any}
                                    icon={L.divIcon({ className: 'custom-marker', html, iconSize: [12, 12] as any, iconAnchor: [6, 6] as any })}
                                />
                            )
                        })}
                        <InvalidateSize />
                        <FitBounds bounds={bounds} />
                    </MapContainer>
                </div>

                <div className="shrink-0 flex flex-wrap items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                        {range.from ? `Desde ${format(range.from, 'dd/MM/yyyy')}` : ''}
                        {range.to ? ` hasta ${format(range.to, 'dd/MM/yyyy')}` : ''}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <label className="text-sm">Hora: 00:00</label>
                        <input
                            type="range"
                            min={0}
                            max={24 * 60}
                            step={15}
                            value={timeCutoff}
                            onChange={(e) => setTimeCutoff(Number(e.target.value))}
                            className="w-[220px]"
                        />
                        <label className="text-sm">{format(minutesToDate(timeCutoff), 'HH:mm')}</label>
                    </div>
                </div>
                <div className="shrink-0 flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">Usuarios</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(filtered.map((p) => p.usuario_id ?? -1))).map((id) => {
                            const user = id === -1 ? undefined : usersById.get(id as number)
                            const label = user ? (user.nombres ? `${user.nombres}` : `Usuario ${id}`) : 'Sin usuario'
                            return (
                                <div key={String(id)} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                                    <span className="inline-block size-3 rounded-full" style={{ background: colorForUser(id as number) }} />
                                    <span>{label}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
    const map = useMap()
    React.useEffect(() => {
        if (bounds) {
            try {
                map.invalidateSize()
                map.fitBounds(bounds, { padding: [20, 20] })
                setTimeout(() => { try { map.invalidateSize() } catch { } }, 150)
            } catch { }
        }
    }, [bounds, map])
    return null
}

function InvalidateSize() {
    const map = useMap()
    React.useEffect(() => {
        try { map.invalidateSize() } catch { }
        const t = setTimeout(() => { try { map.invalidateSize() } catch { } }, 200)
        const onVisibility = () => { try { map.invalidateSize() } catch { } }
        document.addEventListener('visibilitychange', onVisibility)
        const onResize = () => { try { map.invalidateSize() } catch { } }
        window.addEventListener('resize', onResize)
        return () => { clearTimeout(t); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisibility) }
    }, [map])
    return null
}
