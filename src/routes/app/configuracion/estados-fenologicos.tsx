import { Button } from '@/components/ui/button'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, CheckSquare, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { observacionesService } from '@/services/observaciones.service'
import { getTrackedEstados, setTrackedEstados, isEstadoTracked } from '@/lib/preferences'

export const Route = createFileRoute('/app/configuracion/estados-fenologicos')({
    component: EstadosFenologicosComponent,
})

function EstadosFenologicosComponent() {
    const [tipos, setTipos] = useState<any[]>([])
    const [selected, setSelected] = useState<string[]>(() => getTrackedEstados())
    const navigate = useNavigate()

    useEffect(() => {
        load()
    }, [])

    async function load() {
        const list = await observacionesService.listTipos()
        const filtered = (list || []).filter((t: any) => t.activo !== false)
        setTipos(filtered)
        // Ensure selected contains only valid codes
        const validSet = new Set(filtered.map((t: any) => String(t.codigo)))
        setSelected((prev) => prev.filter((c) => validSet.has(String(c))))
    }

    function toggle(codigo: string) {
        setSelected((prev) => {
            const set = new Set(prev)
            const key = String(codigo)
            if (set.has(key)) set.delete(key)
            else set.add(key)
            return Array.from(set)
        })
    }

    function selectAll() {
        setSelected(tipos.map((t: any) => String(t.codigo)))
    }
    function clearAll() {
        setSelected([])
    }
    function save() {
        setTrackedEstados(selected)
        navigate({ to: '/app/configuracion' })
    }

    return (
        <div className="flex h-full flex-col p-2 pb-0 gap-2">
            <div className="flex items-center justify-center relative">
                <ChevronLeft
                    className="h-6 w-6 absolute left-2 cursor-pointer"
                    onClick={() => navigate({ to: '/app/configuracion' })}
                />
                <div>
                    <h1 className='text-2xl font-thin'>
                        Estados Fenológicos
                    </h1>
                </div>
            </div>

            <div className='flex-1 overflow-y-auto'>
                <div className='space-y-2'>
                    {tipos.map((t) => {
                        const checked = selected.includes(String(t.codigo)) || (selected.length === 0 && isEstadoTracked(String(t.codigo), true))
                        return (
                            <button
                                type='button'
                                key={t.codigo}
                                onClick={() => toggle(String(t.codigo))}
                                className='w-full flex items-center justify-between p-3 border rounded-lg bg-white text-left'
                            >
                                <div>
                                    <span className='font-medium'>{t.nombre}</span>
                                    {t.descripcion ? <p className='text-sm text-gray-500'>{t.descripcion}</p> : null}
                                </div>
                                {checked ? <CheckSquare className='text-black' /> : <Square className='text-gray-400' />}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className='flex gap-2 pt-2'>
                <Button variant='outline' className='flex-1' onClick={clearAll}>Limpiar</Button>
                <Button variant='outline' className='flex-1' onClick={selectAll}>Seleccionar todo</Button>
                <Button className='flex-[2] bg-black text-white hover:bg-black/90' onClick={save}>Guardar</Button>
            </div>
        </div>
    )
}
