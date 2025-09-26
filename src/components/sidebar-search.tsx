"use client"

import { useMemo } from 'react'
import Combobox, { type ComboOption } from '@/components/ui/combobox'
import { useRouter } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: { title: string; url: string }[]
}

export function SidebarSearch({ items }: { items: NavItem[] }) {
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
            placeholder="Buscar tablas…"
            emptyText="No hay coincidencias"
        />
    )
}

export default SidebarSearch
