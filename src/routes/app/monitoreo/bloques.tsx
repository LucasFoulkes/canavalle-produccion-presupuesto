import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { bloquesService, Bloque } from '@/services/bloques.service'
import { ChevronLeft } from 'lucide-react'

type BloquesSearch = {
    fincaId: number
    fincaName: string
}

export const Route = createFileRoute('/app/monitoreo/bloques')({
    component: BloquesComponent,
    validateSearch: (search): BloquesSearch => {
        return {
            fincaId: Number(search.fincaId),
            fincaName: String(search.fincaName || 'Finca')
        }
    }
})

function BloqueCard({ bloque }: { bloque: Bloque | any }) {
    const navigate = useNavigate()
    const { fincaId, fincaName } = Route.useSearch()
    const bloqueId = bloque.id ?? bloque.bloque_id
    const displayName = bloque.nombre ?? bloque.codigo ?? `Bloque ${bloqueId}`

    return (
        <Button
            className='aspect-square w-full h-full capitalize text-lg'
            key={bloqueId}
            onClick={() => {
                console.log('Selected bloque:', bloque)
                navigate({
                    to: '/app/monitoreo/bloque',
                    search: {
                        bloqueId: bloqueId,
                        bloqueName: displayName,
                        fincaId: fincaId,
                        fincaName: fincaName,
                    }
                })
            }}
        >
            {displayName}
        </Button>
    )
}

function BloquesComponent() {
    const [bloques, setBloques] = useState<Bloque[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { fincaId, fincaName } = Route.useSearch()
    const navigate = useNavigate()

    useEffect(() => {
        if (fincaId) {
            loadBloques()
        }
    }, [fincaId])

    const loadBloques = async () => {
        try {
            setIsLoading(true)
            const bloquesData = await bloquesService.getBloquesByFincaId(fincaId)
            setBloques(bloquesData)
        } catch (error) {
            console.error('Error loading bloques:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-full flex-col p-2 gap-2 pb-0  ">
            <div className="flex items-center justify-center relative">
                <ChevronLeft
                    className="h-6 w-6 absolute left-2 cursor-pointer"
                    onClick={() => navigate({
                        to: '/app/monitoreo',
                    })}
                />
                <div>
                    <h1 className='text-2xl font-thin capitalize'>
                        {fincaName}
                    </h1>
                    <p className='text-sm text-gray-500'>Seleccione un bloque</p>
                </div>
            </div>
            {isLoading && <p>Cargando bloques...</p>}
            {!isLoading && (
                <div className='flex-1 overflow-y-auto'>
                    {bloques.length > 0 ? (
                        <div className='grid grid-cols-4 gap-2 min-h-full content-center place-items-center'>
                            {[
                                // sort bloques by natural order: 1,2,3,3a,3b,4 ... considering nombre or codigo
                                ...bloques
                                    .slice()
                                    .sort((a: any, b: any) => {
                                        const getKey = (x: any) => (x.nombre ?? x.codigo ?? '').toString().trim()
                                        const ak = getKey(a)
                                        const bk = getKey(b)
                                        // Extract leading integer and optional alpha suffix
                                        const parse = (s: string) => {
                                            const m = s.match(/^(\d+)([a-zA-Z])?$/)
                                            if (m) return { n: parseInt(m[1], 10), suf: m[2] || '' }
                                            const m2 = s.match(/^(\d+)/)
                                            if (m2) return { n: parseInt(m2[1], 10), suf: s.slice(m2[1].length) }
                                            return { n: Number.MAX_SAFE_INTEGER, suf: s }
                                        }
                                        const A = parse(ak)
                                        const B = parse(bk)
                                        if (A.n !== B.n) return A.n - B.n
                                        // same base number: empty suffix first, then alphabetically
                                        if (A.suf === B.suf) return 0
                                        if (A.suf === '') return -1
                                        if (B.suf === '') return 1
                                        return A.suf.localeCompare(B.suf, 'es', { sensitivity: 'base' })
                                    })
                            ].map((bloque: any) => (
                                <BloqueCard key={bloque.id ?? bloque.bloque_id} bloque={bloque} />
                            ))}
                        </div>
                    ) : (
                        <div className='flex h-full w-full items-center justify-center'>
                            <p className="text-gray-500 font-thin">No se encontraron bloques para esta finca</p>
                        </div>
                    )}
                </div>
            )
            }
        </div >
    )
}
