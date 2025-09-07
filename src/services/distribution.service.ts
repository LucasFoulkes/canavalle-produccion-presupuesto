import { supabase } from '@/lib/supabase'

export interface BlockVarietyDistributionRow {
    finca: string
    bloque: string
    variedad: string
    planting_date: string | null
    status: string | null
    beds: number
    plants: number
    area_m2: string | number
}

export interface BloqueVariedadResumenRow {
    id_bloque: number
    nombre_bloque?: string | null
    id_variedad: number
    nombre_variedad: string
    numero_camas: number
    total_plantas: number
}

export const distributionService = {
    async getByBloqueName(fincaName: string, bloqueName: string): Promise<BlockVarietyDistributionRow[]> {
        try {
            // Expect a PostgREST RPC or view. Try view name first.
            const { data, error } = await supabase
                .from('block_variety_distribution')
                .select('*')
                .eq('finca', fincaName)
                .eq('bloque', bloqueName)

            if (error) {
                console.warn('[distribution] fetch error', error)
                return []
            }
            if (!data) return []
            // Normalize numeric area
            return data.map((r: any) => ({ ...r, area_m2: typeof r.area_m2 === 'string' ? parseFloat(r.area_m2) : r.area_m2 }))
        } catch (e) {
            console.error('[distribution] unexpected error', e)
            return []
        }
    }
    ,
    async getVariedadesByBloqueId(bloqueId: number): Promise<BloqueVariedadResumenRow[]> {
        try {
            // New view with Spanish columns. Adjust name here if different on server.
            const VIEW = 'bloque_variedad_resumen'
            const { data, error } = await supabase
                .from(VIEW)
                .select('*')
                .eq('id_bloque', bloqueId)

            if (error) {
                console.warn('[distribution] resumen fetch error', error)
                return []
            }
            if (!data) return []
            return (data as any[]).map(r => ({
                id_bloque: Number(r.id_bloque),
                nombre_bloque: r.nombre_bloque ?? null,
                id_variedad: Number(r.id_variedad),
                nombre_variedad: String(r.nombre_variedad ?? ''),
                numero_camas: Number(r.numero_camas ?? 0),
                total_plantas: Number(r.total_plantas ?? 0),
            }))
        } catch (e) {
            console.error('[distribution] resumen unexpected error', e)
            return []
        }
    }
}
