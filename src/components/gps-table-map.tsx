import * as React from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type GpsTableRow = {
    id?: string
    __key?: string
    latitud?: number | string
    longitud?: number | string
    precision?: number | string | null
    altitud?: number | string | null
    capturado_en?: string
    observacion?: boolean
    usuario_id?: number | string | null
    [k: string]: unknown
}

const userColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
]

function colorForUser(id?: number | string | null): string {
    if (id == null) return '#555'
    const n = Number(id)
    const idx = Number.isFinite(n) ? Math.abs(n) % userColors.length : 0
    return userColors[idx]
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
    const map = useMap()
    React.useEffect(() => {
        if (!bounds) return
        try {
            map.invalidateSize()
            map.fitBounds(bounds, { padding: [20, 20] })
            const t = setTimeout(() => { try { map.invalidateSize() } catch { /* noop */ } }, 150)
            return () => clearTimeout(t)
        } catch { /* noop */ }
    }, [bounds, map])
    return null
}

function InvalidateSize() {
    const map = useMap()
    React.useEffect(() => {
        try { map.invalidateSize() } catch { /* noop */ }
        const t = setTimeout(() => { try { map.invalidateSize() } catch { /* noop */ } }, 200)
        const onResize = () => { try { map.invalidateSize() } catch { /* noop */ } }
        const onVisibility = () => { try { map.invalidateSize() } catch { /* noop */ } }
        window.addEventListener('resize', onResize)
        document.addEventListener('visibilitychange', onVisibility)
        return () => { clearTimeout(t); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisibility) }
    }, [map])
    return null
}

export function GpsTableMap({ rows, className = "relative w-full h-[50vh] min-h-[320px] overflow-hidden rounded-md border" }: { rows: GpsTableRow[]; className?: string }) {
    const points = React.useMemo(() => {
        return (rows || []).map((r, i) => {
            const lat = Number((r as any).latitud)
            const lon = Number((r as any).longitud)
            const acc = (r as any).precision
            const id = String((r as any).id ?? (r as any).__key ?? i)
            return { id, lat, lon, acc, row: r }
        }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && !(p.lat === 0 && p.lon === 0))
    }, [rows])

    const filtered = React.useMemo(() => {
        // Filter very low-accuracy points (>200m) like the home map
        return points.filter(p => !(Number.isFinite(Number(p.acc)) && Number(p.acc) > 200))
    }, [points])

    const bounds = React.useMemo(() => {
        const latlngs = filtered.map(p => [p.lat, p.lon] as [number, number])
        if (!latlngs.length) return null
        return L.latLngBounds(latlngs)
    }, [filtered])

    return (
        <div className={className}>
            <MapContainer center={[4.711, -74.072]} zoom={12} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    subdomains={["a", "b", "c", "d"]}
                    maxZoom={20}
                />
                {filtered.map((p) => {
                    const color = colorForUser((p.row as any)?.usuario_id ?? null)
                    const isObs = Boolean((p.row as any)?.observacion)
                    const html = isObs
                        ? `<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style="display:block"><polygon points="6,11 1,2 11,2" fill="${color}" stroke="white" stroke-width="1" /></svg>`
                        : `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:1px solid white;"></div>`
                    return (
                        <Marker
                            key={p.id}
                            position={[p.lat, p.lon] as any}
                            icon={L.divIcon({ className: 'custom-marker', html, iconSize: [12, 12] as any, iconAnchor: [6, 6] as any })}
                        />
                    )
                })}
                <InvalidateSize />
                <FitBounds bounds={bounds} />
            </MapContainer>
        </div>
    )
}
