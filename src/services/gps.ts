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
    id?: string // server UUID, if known
}

export async function saveGpsPoint(point: GpsPoint): Promise<void> {
    const store = getStore('puntos_gps')
    const tempId = `temp:${Date.now()}-${Math.random()}`
    const tempRow = { id: tempId, ...point, needs_sync: true }
    await store.put(tempRow as any)

    if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
            const { data, error } = await puntosGpsService.insert({
                latitud: point.latitud,
                longitud: point.longitud,
                precision: point.precision ?? null,
                altitud: point.altitud ?? null,
                capturado_en: point.capturado_en,
                observacion: point.observacion ?? false,
                usuario_id: point.usuario_id ?? null,
            } as any)
            if (!error) {
                try { await store.delete(tempId) } catch (err) { console.debug('[gps] ignore delete tempId error', err) }
                // Upsert the returned row to Dexie to have the UUID available immediately
                if (data) {
                    await store.put({ ...(data as any), needs_sync: false })
                } else {
                    try { await syncTable('puntos_gps') } catch (err) { console.debug('[gps] ignore background sync error', err) }
                }
            }
        } catch (err) {
            console.debug('[gps] ignore online insert error', err)
        }
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
