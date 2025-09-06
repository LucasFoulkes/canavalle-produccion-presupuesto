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
}
