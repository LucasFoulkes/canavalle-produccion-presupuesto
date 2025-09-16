import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getStore } from '@/lib/dexie'
import { DataTable } from '@/components/data-table'

export const Route = createFileRoute('/estimados/area')({
    component: Page,
})

type ReportRow = {
    finca: string
    bloque: string
    variedad: string
    area: number
}

const ESTADO_PRODUCTIVO = 'productivo'

function Page() {
    const rows = useLiveQuery(async () => {
        // Load required tables from Dexie
        const [camas, grupos, bloques, fincas, variedades] = await Promise.all([
            getStore('cama').toArray(),
            getStore('grupo_cama').toArray(),
            getStore('bloque').toArray(),
            getStore('finca').toArray(),
            getStore('variedad').toArray(),
        ])

        const mapBy = <T extends Record<string, any>>(arr: T[], key: string) => {
            const m = new Map<any, T>()
            for (const it of arr) m.set(it[key], it)
            return m
        }

        const gruposById = mapBy(grupos as any[], 'id_grupo')
        const bloquesById = mapBy(bloques as any[], 'id_bloque')
        const fincasById = mapBy(fincas as any[], 'id_finca')
        const variedadesById = mapBy(variedades as any[], 'id_variedad')

        // Group accumulator by finca|bloque|variedad
        const acc = new Map<string, ReportRow>()

        for (const c of camas as any[]) {
            const g = gruposById.get(c.id_grupo)
            if (!g) continue
            if ((g.estado ?? '').toString().toLowerCase() !== ESTADO_PRODUCTIVO) continue
            const b = bloquesById.get(g.id_bloque)
            if (!b) continue
            const f = fincasById.get(b.id_finca)
            const v = variedadesById.get(g.id_variedad)
            const fincaNombre = f?.nombre ?? '—'
            const bloqueNombre = b?.nombre ?? '—'
            const variedadNombre = v?.nombre ?? '—'
            const key = `${f?.id_finca ?? 'x'}|${b?.id_bloque ?? 'x'}|${v?.id_variedad ?? 'x'}`
            const largo = Number(c.largo_metros) || 0
            const ancho = Number(c.ancho_metros) || 0
            const area = largo * ancho
            const existing = acc.get(key)
            if (existing) {
                existing.area += area
            } else {
                acc.set(key, { finca: fincaNombre, bloque: bloqueNombre, variedad: variedadNombre, area })
            }
        }

        // To array sorted by finca, bloque, variedad
        const res = Array.from(acc.values()).sort((a, b) => {
            const fa = a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' })
            if (fa) return fa
            const fb = a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' })
            if (fb) return fb
            return a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' })
        })
        return res as ReportRow[]
    }, [])

    const columns = React.useMemo(() => [
        { key: 'finca', header: 'Finca' },
        { key: 'bloque', header: 'Bloque' },
        { key: 'variedad', header: 'Variedad' },
        { key: 'area', header: 'Área (m²)', render: (v: number) => (Number(v || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    ], []) as any

    return (
        <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            <DataTable caption={`${rows?.length ?? 0}`} columns={columns} rows={rows ?? []} />
        </div>
    )
}
