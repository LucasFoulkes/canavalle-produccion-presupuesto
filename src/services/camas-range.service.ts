import { db } from '@/lib/dexie'

/**
 * Returns the cama name range (min–max) for a given bloque and variedad.
 * Returns null if no camas found.
 */
export async function getCamaRangeForBloqueVariedad(bloqueId: number, variedad: string): Promise<string | null> {
    // Find all grupos for this bloque and variedad
    const hasGrupoCama = db.tables.some(t => t.name === 'grupo_cama')
    let grupoIds: number[] = []
    if (hasGrupoCama) {
        const grupos = await (db as any).grupoCama.where('id_bloque').equals(bloqueId).toArray()
        grupoIds = grupos
            .filter((g: any) => !g.eliminado_en && g.id_variedad != null && String(g.nombre_variedad ?? g.variedad ?? '').toLowerCase() === variedad.toLowerCase())
            .map((g: any) => g.id_grupo)
            .filter(Boolean)
    }
    if (!grupoIds.length) return null
    // Find all camas for these grupos
    const camas = (await db.cama.toArray()).filter((c: any) => c.id_grupo != null && grupoIds.includes(c.id_grupo) && !c.eliminado_en)
    if (!camas.length) return null
    // Get numeric names
    const nums = camas.map(c => parseInt(c.nombre ?? '0', 10)).filter(n => !isNaN(n))
    if (!nums.length) return null
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    return min === max ? String(min) : `${min}-${max}`
}
