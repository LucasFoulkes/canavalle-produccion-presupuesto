import { getStore } from '@/lib/dexie'
import { puntosGpsService } from '@/services/db'
import { syncTable } from '@/services/sync'

export type GpsPoint = {
    latitud: number
    longitud: number
    precision?: number | null
    altitud?: number | null
    capturado_en: string
    observacion?: boolean
    usuario_id?: number | null
}

export async function saveGpsPoint(point: GpsPoint): Promise<void> {
    const store = getStore('puntos_gps')
    const tempKey = `${Date.now()}-${Math.random()}`
    const tempRow = { __key: tempKey, ...point, needs_sync: true }
    await store.put(tempRow as any)

    if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
            const { error } = await puntosGpsService.insert({
                latitud: point.latitud,
                longitud: point.longitud,
                precision: point.precision ?? null,
                altitud: point.altitud ?? null,
                capturado_en: point.capturado_en,
                observacion: point.observacion ?? false,
                usuario_id: point.usuario_id ?? null,
            } as any)
            if (!error) {
                try { await store.delete(tempKey) } catch { }
                try { await syncTable('puntos_gps') } catch { }
            }
        } catch { }
    }
}

export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocalización no soportada'))
            return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, options ?? { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
    })
}
