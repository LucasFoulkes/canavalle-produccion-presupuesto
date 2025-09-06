import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { distributionService, BlockVarietyDistributionRow } from '@/services/distribution.service'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/dexie'

interface SearchShape {
    bloqueId: number
    bloqueName: string
    fincaId: number
    fincaName: string
}

export const Route = createFileRoute('/app/monitoreo/bloque')({
    component: BloqueDetailPage,
    validateSearch: (s): SearchShape => ({
        bloqueId: Number(s.bloqueId),
        bloqueName: String(s.bloqueName || 'Bloque'),
        fincaId: Number(s.fincaId),
        fincaName: String(s.fincaName || 'Finca')
    })
})

function aggregateVarieties(rows: BlockVarietyDistributionRow[]) {
    const map = new Map<string, { variedad: string; beds: number; plants: number; area_m2: number }>()
    for (const r of rows) {
        const key = (r.variedad || 'N/D').trim()
        const area = Number(r.area_m2) || 0
        if (!map.has(key)) {
            map.set(key, { variedad: key, beds: r.beds || 0, plants: r.plants || 0, area_m2: area })
        } else {
            const agg = map.get(key)!
            agg.beds += r.beds || 0
            agg.plants += r.plants || 0
            agg.area_m2 += area
        }
    }
    return Array.from(map.values()).sort((a, b) => a.variedad.localeCompare(b.variedad, 'es', { sensitivity: 'base' }))
}

function BloqueDetailPage() {
    const navigate = useNavigate()
    const { bloqueId, bloqueName, fincaId, fincaName } = Route.useSearch()
    const [distribution, setDistribution] = useState<BlockVarietyDistributionRow[]>([])
    const [loadingDist, setLoadingDist] = useState(false)
    const [ranges, setRanges] = useState<Record<string, { min: number; max: number }>>({})

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bloqueId])

    const load = async () => {
        try {
            setLoadingDist(true)
            const dist = await distributionService.getByBloqueName(fincaName, bloqueName)
            setDistribution(dist)
            // After distribution, compute ranges per variety
            computeRanges(dist)
        } catch (e) {
            console.warn('Error loading distribution', e)
        } finally {
            setLoadingDist(false)
        }
    }

    const computeRanges = async (dist: BlockVarietyDistributionRow[]) => {
        const result: Record<string, { min: number; max: number }> = {}
        try {
            const variedadNames = Array.from(new Set(dist.map(d => d.variedad).filter(Boolean)))
            if (!variedadNames.length) { setRanges(result); return }

            const variedades = await db.variedad.where('nombre').anyOf(variedadNames).toArray()
            const nameToIds = new Map<string, number[]>(variedadNames.map(n => [n, []]))
            for (const v of variedades) if (v.nombre) nameToIds.get(v.nombre)?.push(v.id)

            // Fetch camas with alias tolerance
            const camaRows = await db.cama.filter(c => {
                const bId = (c as any).bloque_id ?? (c as any).id_bloque
                const deleted = (c as any).deleted_at || (c as any).eliminado_en
                return bId === bloqueId && !deleted
            }).toArray()

            // Decide group table name
            const hasGrupoCama = db.tables.some(t => t.name === 'grupo_cama')
            const groupTable: any = hasGrupoCama ? (db as any).grupoCama : (db as any).grupoPlantacion
            const groups = await groupTable.filter((g: any) => {
                const bId = g.bloque_id ?? g.id_bloque
                const deleted = g.deleted_at || g.eliminado_en
                return bId === bloqueId && !deleted
            }).toArray()

            // Map group id -> camas
            const camasByGrupo = new Map<number, any[]>()
            for (const c of camaRows) {
                const gId = (c as any).grupo_id ?? (c as any).id_grupo
                if (gId != null) {
                    if (!camasByGrupo.has(gId)) camasByGrupo.set(gId, [])
                    camasByGrupo.get(gId)!.push(c)
                }
            }

            for (const distRow of dist) {
                const name = distRow.variedad
                if (!name || result[name]) continue
                const ids = nameToIds.get(name) || []
                if (!ids.length) continue
                const relatedGroups = groups.filter((g: any) => ids.includes(g.variedad_id ?? g.id_variedad))
                if (!relatedGroups.length) continue
                const camasForVar: any[] = []
                for (const g of relatedGroups) {
                    const gId = g.grupo_id ?? g.id_grupo ?? g.id
                    if (gId != null) {
                        const list = camasByGrupo.get(gId)
                        if (list?.length) camasForVar.push(...list)
                    }
                }
                if (!camasForVar.length) continue
                const nums: number[] = []
                for (const c of camasForVar) {
                    let n: number | null = null
                    if ((c as any).nombre) {
                        const match = /^(\d+)/.exec(String((c as any).nombre).trim())
                        if (match) n = parseInt(match[1], 10)
                    }
                    if (n == null) n = (c as any).id
                    if (typeof n === 'number' && !isNaN(n)) nums.push(n)
                }
                if (!nums.length) continue
                nums.sort((a, b) => a - b)
                result[name] = { min: nums[0], max: nums[nums.length - 1] }
            }

            if (Object.keys(result).length === 0) {
                console.debug('[bloque] ranges empty debug', {
                    distCount: dist.length,
                    variedadNames,
                    nameToIds: Array.from(nameToIds.entries()),
                    sampleCamas: camaRows.slice(0, 3),
                    sampleGroups: groups.slice(0, 3)
                })
            }
        } catch (e) {
            console.warn('[bloque] computeRanges error', e)
        }
        setRanges(result)
    }

    return (
        <div className='flex flex-col h-full p-4 gap-6'>
            <div className='flex items-center justify-center relative'>
                <ChevronLeft
                    className='h-6 w-6 absolute left-0 cursor-pointer'
                    onClick={() => navigate({ to: '/app/monitoreo/bloques', search: { fincaId, fincaName } })}
                />
                <div className='text-center'>
                    <h1 className='text-2xl font-thin'>{bloqueName}</h1>
                    <p className='text-sm text-gray-500'>{fincaName}</p>
                </div>
            </div>
            {/* Search input removed per request */}
            <div className='flex-1 flex flex-col'>
                {loadingDist && <p className='text-xs text-muted-foreground text-center mt-4'>Cargando...</p>}
                {!loadingDist && distribution.length === 0 && (
                    <div className='flex flex-1 items-center justify-center'>
                        <p className='text-xs text-muted-foreground'>Sin datos</p>
                    </div>
                )}
                {!loadingDist && distribution.length > 0 && (
                    <div className='flex-1 grid grid-cols-1 gap-3 content-center'>
                        {aggregateVarieties(distribution).map(v => (
                            <Button
                                key={v.variedad}
                                className='h-14 w-full text-lg bg-black text-white hover:bg-black/90 flex items-center justify-between px-4'
                                onClick={() => navigate({
                                    to: '/app/monitoreo/camas',
                                    search: { bloqueId, bloqueName, fincaId, fincaName, variety: v.variedad }
                                })}
                            >
                                <span className='font-medium truncate'>{v.variedad}</span>
                                <span className='text-xs font-normal'>
                                    {(() => {
                                        const r = ranges[v.variedad]
                                        if (r) return `${r.min}-${r.max}`
                                        if (v.beds && v.beds > 0) return `${v.beds}`
                                        return ''
                                    })()}
                                </span>
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default BloqueDetailPage
