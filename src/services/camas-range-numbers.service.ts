import { db } from '@/lib/dexie'

/**
 * Returns the [min, max] cama numbers for a given bloque and variedad name, or null if none.
 */
export async function getCamaNumberRangeForBloqueVariedad(bloqueId: number, variedad: string): Promise<[number, number] | null> {
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
    const camas = (await db.cama.toArray()).filter((c: any) => c.id_grupo != null && grupoIds.includes(c.id_grupo) && !c.eliminado_en)
    if (!camas.length) return null
    const nums = camas.map(c => parseInt(c.nombre ?? '0', 10)).filter(n => !isNaN(n))
    if (!nums.length) return null
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    return [min, max]
}
