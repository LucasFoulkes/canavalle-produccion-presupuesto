import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { GenericCombobox } from '@/components/generic-combobox'
import { Input } from '@/components/ui/input'
import type { Variedad } from '@/services/variedades.service'
import { useState } from 'react'

export function CamaGroupForm({
    variedades,
    onSubmit,
}: {
    variedades: Variedad[]
    onSubmit: (params: { from: number; to: number; variedadId: number; area: number }) => Promise<void>
}) {
    const [fromCama, setFromCama] = useState('')
    const [toCama, setToCama] = useState('')
    const [selectedVariety, setSelectedVariety] = useState<number | null>(null)
    const [area, setArea] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        const fromNum = parseInt(fromCama)
        const toNum = parseInt(toCama)
        const areaNum = parseFloat(area)
        if (!selectedVariety || !fromNum || !toNum || fromNum > toNum || isNaN(areaNum) || areaNum <= 0) {
            setError('Datos inválidos')
            return
        }
        setError(null)
        await onSubmit({ from: fromNum, to: toNum, variedadId: selectedVariety, area: areaNum })
        setFromCama('')
        setToCama('')
        setSelectedVariety(null)
        setArea('')
    }

    return (
        <Card>
            <CardTitle className="text-lg font-medium">Configurar grupo</CardTitle>
            <CardContent className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 w-16">Camas</label>
                    <div className="flex gap-3 flex-1">
                        <Input type="number" min="1" placeholder="Desde" value={fromCama} onChange={e => setFromCama(e.target.value)} className="flex-1" />
                        <Input type="number" min="1" placeholder="Hasta" value={toCama} onChange={e => setToCama(e.target.value)} className="flex-1" />
                    </div>
                </div>
                <GenericCombobox
                    value={selectedVariety?.toString() ?? ''}
                    onValueChange={v => setSelectedVariety(v ? Number(v) : null)}
                    items={variedades.map(v => ({ id: v.id_variedad as unknown as number, nombre: v.nombre })) as any}
                    placeholder="Variedad..."
                    searchPlaceholder="Buscar variedad..."
                    emptyMessage="No se encontró variedad."
                />
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 w-16">Área (m²)</label>
                    <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={area} onChange={e => setArea(e.target.value)} className="flex-1" />
                </div>
                <Button onClick={handleSubmit} className="w-full">+ Agregar Grupo</Button>
            </CardContent>
        </Card>
    )
}




