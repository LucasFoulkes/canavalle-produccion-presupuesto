import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import ScrollContainer from '@/components/ui/scroll'

type ObservacionItem = {
    bloqueId: number
    bloque: string
    variedadId: number
    variedad: string
    camaId: number
    cama: string
    userId: number | null
    userName: string
}

type ObservacionesHoyCardProps = {
    obsItems: ObservacionItem[]
    obsError: string | null
}

export function ObservacionesHoyCard({ obsItems, obsError }: ObservacionesHoyCardProps) {
    const [selectedUser, setSelectedUser] = React.useState<number | null>(null) // null = all

    // Filter observations by selected user
    const filteredObsItems = React.useMemo(() => {
        if (selectedUser === null) return obsItems
        return obsItems.filter(item => item.userId === selectedUser)
    }, [obsItems, selectedUser])

    // User options for combobox
    const userOptions = React.useMemo<ComboOption[]>(() => {
        const userMap = new Map<number, string>()
        for (const it of obsItems) {
            if (it.userId != null && it.userName) {
                userMap.set(it.userId, it.userName)
            }
        }
        const opts = Array.from(userMap.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, name]) => ({ label: name, value: String(id) }))
        return [{ label: 'Todos', value: '' }, ...opts]
    }, [obsItems])

    // Build legend colors per user encountered
    const userColors = React.useMemo(() => {
        const palette = [
            '#ef4444', // red-500
            '#22c55e', // green-500
            '#3b82f6', // blue-500
            '#eab308', // yellow-500
            '#a855f7', // purple-500
            '#06b6d4', // cyan-500
            '#f97316', // orange-500
            '#84cc16', // lime-500
            '#ec4899', // pink-500
        ]
        const map = new Map<number, string>()
        const seen: number[] = []
        for (const it of obsItems) {
            if (it.userId == null) continue
            if (!map.has(it.userId)) {
                const idx = seen.length % palette.length
                map.set(it.userId, palette[idx])
                seen.push(it.userId)
            }
        }
        return map
    }, [obsItems])

    type BloqueSummary = {
        bloqueId: number
        bloque: string
        variedades: Array<{
            variedadId: number
            variedad: string
            camas: Array<{ camaId: number; cama: string; userId: number | null; userName: string }>
        }>
    }

    const obsByBloque = React.useMemo<BloqueSummary[]>(() => {
        const byBloque = new Map<number, { bloqueId: number; bloque: string; variedades: Map<number, BloqueSummary['variedades'][number]> }>()
        for (const item of filteredObsItems) {
            let bloqueEntry = byBloque.get(item.bloqueId)
            if (!bloqueEntry) {
                bloqueEntry = {
                    bloqueId: item.bloqueId,
                    bloque: item.bloque,
                    variedades: new Map(),
                }
                byBloque.set(item.bloqueId, bloqueEntry)
            }

            let variedadEntry = bloqueEntry.variedades.get(item.variedadId)
            if (!variedadEntry) {
                variedadEntry = {
                    variedadId: item.variedadId,
                    variedad: item.variedad,
                    camas: [],
                }
                bloqueEntry.variedades.set(item.variedadId, variedadEntry)
            }

            variedadEntry.camas.push({
                camaId: item.camaId,
                cama: item.cama,
                userId: item.userId,
                userName: item.userName,
            })
        }

        const rows: BloqueSummary[] = Array.from(byBloque.values()).map(({ bloqueId, bloque, variedades }) => ({
            bloqueId,
            bloque,
            variedades: Array.from(variedades.values())
                .map(v => ({
                    variedadId: v.variedadId,
                    variedad: v.variedad,
                    camas: v.camas.slice().sort((a, b) => a.cama.localeCompare(b.cama)),
                }))
                .sort((a, b) => a.variedad.localeCompare(b.variedad)),
        }))

        return rows.sort((a, b) => a.bloque.localeCompare(b.bloque))
    }, [filteredObsItems])

    const bloqueCount = obsByBloque.length
    const camaCount = React.useMemo(() =>
        obsByBloque.reduce((total, bloque) =>
            total + bloque.variedades.reduce((varTotal, variedad) => varTotal + variedad.camas.length, 0)
            , 0)
        , [obsByBloque])

    const bloqueLabel = `${bloqueCount} ${bloqueCount === 1 ? 'bloque' : 'bloques'}`
    const camaLabel = `${camaCount} ${camaCount === 1 ? 'cama' : 'camas'}`

    const legend = React.useMemo(() => {
        const unique = new Map<number, string>()
        for (const it of obsItems) {
            if (it.userId != null && it.userName) unique.set(it.userId, it.userName)
        }
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name, color: userColors.get(id) ?? '#9ca3af' }))
    }, [obsItems, userColors])

    return (
        <Card className="flex flex-col min-h-0">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b flex-shrink-0 gap-3">
                <CardTitle className="flex flex-col gap-1">
                    <span>Observacions</span>
                    <span className="text-xs font-normal text-muted-foreground">
                        {bloqueLabel} · {camaLabel}
                    </span>
                </CardTitle>
                <Combobox
                    className="w-[180px]"
                    options={userOptions}
                    placeholder="Usuario (todos)"
                    onSelect={(opt) => setSelectedUser(opt.value ? Number(opt.value) : null)}
                />
            </CardHeader>
            <div className="flex flex-1 min-h-0">
                <ScrollContainer className="flex-1 min-h-0 overflow-x-hidden">
                    <CardContent className="p-0">
                        {obsError ? (
                            <div className="text-red-600">{obsError}</div>
                        ) : filteredObsItems.length === 0 ? (
                            <div className="text-muted-foreground">No hay observaciones hoy.</div>
                        ) : (
                            <ul className="flex flex-col">
                                {obsByBloque.map(row => {
                                    // Check if all varieties in this bloque have the same user
                                    const allCamasInBloque = row.variedades.flatMap(v => v.camas)
                                    const bloqueUserIds = new Set(allCamasInBloque.map(c => c.userId))
                                    const bloqueSingleUser = bloqueUserIds.size === 1 ? allCamasInBloque[0]?.userId : null
                                    const bloqueUserName = bloqueSingleUser != null ? allCamasInBloque[0]?.userName : null

                                    return (
                                        <li key={row.bloqueId} className="border-b last:border-b-0 p-3 flex items-center">
                                            <div className="font-semibold text-sm w-12 flex-shrink-0 border-r pr-3 flex items-center justify-center self-stretch">
                                                {bloqueSingleUser != null && (
                                                    <span
                                                        className="inline-block size-2 rounded-full flex-shrink-0"
                                                        title={bloqueUserName ?? ''}
                                                        style={{ backgroundColor: userColors.get(bloqueSingleUser) ?? '#9ca3af' }}
                                                    />
                                                )}
                                                <span>{row.bloque}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center flex-1 pl-3">
                                                {row.variedades.map(variedad => {
                                                    // Check if all camas in this variedad have the same user
                                                    const variedadUserIds = new Set(variedad.camas.map(c => c.userId))
                                                    const variedadSingleUser = variedadUserIds.size === 1 ? variedad.camas[0]?.userId : null
                                                    const variedadUserName = variedadSingleUser != null ? variedad.camas[0]?.userName : null
                                                    const showUserOnVariedad = variedadSingleUser != null && bloqueSingleUser == null

                                                    return (
                                                        <div key={variedad.variedadId} className="flex items-center">
                                                            <span className="font-medium text-muted-foreground text-xs flex items-center">
                                                                {showUserOnVariedad && (
                                                                    <span
                                                                        className="inline-block size-2 rounded-full"
                                                                        title={variedadUserName ?? ''}
                                                                        style={{ backgroundColor: userColors.get(variedadSingleUser) ?? '#9ca3af' }}
                                                                    />
                                                                )}
                                                                {variedad.variedad}
                                                            </span>
                                                            <div className="flex flex-wrap">
                                                                {variedad.camas.map(cama => (
                                                                    <span key={cama.camaId} className="inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-xs">
                                                                        {!showUserOnVariedad && bloqueSingleUser == null && (
                                                                            <span
                                                                                className="inline-block size-2 rounded-full"
                                                                                title={cama.userName}
                                                                                style={{ backgroundColor: cama.userId != null ? (userColors.get(cama.userId) ?? '#9ca3af') : '#9ca3af' }}
                                                                            />
                                                                        )}
                                                                        <span>{cama.cama}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </CardContent>
                </ScrollContainer>
                {legend.length > 0 && (
                    <div className="hidden lg:flex flex-col border-l min-w-[140px] flex-shrink-0">
                        <div className="p-3 border-b">
                            <div className="text-sm font-medium">Usuario</div>
                        </div>
                        <div className="p-3 flex flex-col">
                            {legend.map(l => (
                                <div key={l.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-muted/50">
                                    <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                                    <span className="text-muted-foreground">{l.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
