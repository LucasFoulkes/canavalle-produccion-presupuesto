import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getStore, type AnyRow } from '@/lib/dexie'
import { DataTable, type Column } from '@/components/data-table'

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
        const [camas, grupos, bloques, fincas, variedades] = await Promise.all<[
            AnyRow[],
            AnyRow[],
            AnyRow[],
            AnyRow[],
            AnyRow[],
        ]>([
            getStore('cama').toArray(),
            getStore('grupo_cama').toArray(),
            getStore('bloque').toArray(),
            getStore('finca').toArray(),
            getStore('variedad').toArray(),
        ])

        const mapBy = <T extends Record<string, unknown>>(arr: T[], key: string) => {
            const m = new Map<string, T>()
            for (const it of arr) {
                const id = it?.[key]
                if (id == null) continue
                m.set(String(id), it)
            }
            return m
        }

        const gruposById = mapBy(grupos, 'id_grupo')
        const bloquesById = mapBy(bloques, 'id_bloque')
        const fincasById = mapBy(fincas, 'id_finca')
        const variedadesById = mapBy(variedades, 'id_variedad')

        // Group accumulator by finca|bloque|variedad
        const acc = new Map<string, ReportRow>()

        for (const cama of camas) {
            const g = gruposById.get(String(cama?.['id_grupo']))
            if (!g) continue
            const estado = String(g?.['estado'] ?? '').toLowerCase()
            if (estado !== ESTADO_PRODUCTIVO) continue
            const b = bloquesById.get(String(g?.['id_bloque']))
            if (!b) continue
            const f = fincasById.get(String(b?.['id_finca']))
            const v = variedadesById.get(String(g?.['id_variedad']))
            const fincaNombre = String(f?.['nombre'] ?? '—')
            const bloqueNombre = String(b?.['nombre'] ?? '—')
            const variedadNombre = String(v?.['nombre'] ?? '—')
            const key = `${String(f?.['id_finca'] ?? 'x')}|${String(b?.['id_bloque'] ?? 'x')}|${String(v?.['id_variedad'] ?? 'x')}`
            const largo = Number(cama?.['largo_metros']) || 0
            const ancho = Number(cama?.['ancho_metros']) || 0
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
        return res
    }, [])

    const columns = React.useMemo<Column<ReportRow>[]>(
        () => [
            { key: 'finca', header: 'Finca' },
            { key: 'bloque', header: 'Bloque' },
            { key: 'variedad', header: 'Variedad' },
            {
                key: 'area',
                header: 'Área (m²)',
                render: (value) => (Number(value ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            },
        ],
        [],
    )

    return (
        <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            <DataTable caption={`${rows?.length ?? 0}`} columns={columns} rows={rows ?? []} />
        </div>
    )
}
