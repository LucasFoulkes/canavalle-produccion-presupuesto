import * as React from 'react'
import { saveGpsPoint } from '@/services/gps'

function toRad(x: number) { return (x * Math.PI) / 180 }
function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
    const R = 6371000 // meters
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lon - a.lon)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const sinDLat = Math.sin(dLat / 2)
    const sinDLon = Math.sin(dLon / 2)
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
    return 2 * R * Math.asin(Math.sqrt(h))
}

export function useGpsTracker(opts?: { minDistanceMeters?: number; usuarioId?: number | null }) {
    const minDist = opts?.minDistanceMeters ?? 1
    const usuarioId = opts?.usuarioId ?? null
    const watchIdRef = React.useRef<number | null>(null)
    const lastPosRef = React.useRef<{ lat: number; lon: number } | null>(null)

    const start = React.useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return
        if (watchIdRef.current != null) return
        watchIdRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude
                const lon = pos.coords.longitude
                const acc = pos.coords.accuracy
                const alt = Number.isFinite(pos.coords.altitude as any) ? (pos.coords.altitude as number) : null
                const nowIso = new Date().toISOString()
                const current = { lat, lon }
                const last = lastPosRef.current
                const moved = last ? haversineMeters(last, current) : Infinity
                if (!last || moved >= minDist) {
                    lastPosRef.current = current
                    await saveGpsPoint({
                        latitud: lat,
                        longitud: lon,
                        precision: Number.isFinite(acc) ? acc : null,
                        altitud: alt,
                        capturado_en: nowIso,
                        observacion: false,
                        usuario_id: usuarioId ?? null,
                    })
                }
            },
            (err) => {
                // Silently ignore errors; tracker keeps trying
                console.debug('[gps] error', err)
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        )
    }, [minDist, usuarioId])

    const stop = React.useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
    }, [])

    React.useEffect(() => {
        return () => { stop() }
    }, [stop])

    return { start, stop }
}
