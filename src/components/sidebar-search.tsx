"use client"

import { useMemo } from 'react'
import Combobox, { type ComboOption } from '@/components/ui/combobox'
import { useRouter } from '@tanstack/react-router'
import type { NavGroup } from '@/lib/navigation'

export function SidebarSearch({ items }: { items: NavGroup[] }) {
    const router = useRouter()

    const options: ComboOption[] = useMemo(() => {
        const out: ComboOption[] = []
        for (const g of items) {
            if (g.items?.length) {
                for (const s of g.items) {
                    const value = s.url.replace(/^\//, '')
                    out.push({
                        label: s.title,
                        value,
                        group: g.title,
                        keywords: [g.title, s.title, value],
                        url: s.url,
                    })
                }
            } else {
                const value = g.url.replace(/^\//, '')
                out.push({
                    label: g.title,
                    value,
                    group: undefined,
                    keywords: [g.title, value],
                    url: g.url,
                })
            }
        }
        return out
    }, [items])

    return (
        <Combobox
            options={options}
            onSelect={(opt) => {
                const to: string = (opt.url ?? `/${opt.value}`)
                router.navigate({ to })
            }}
            placeholder="Buscar..."
            emptyText="No hay coincidencias"
            className="font-normal"
        />
    )
}

export default SidebarSearch
