import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { fetchTable } from '@/services/tables'
import type { Bloque, Finca, Variedad } from '@/types/tables'
import { insertProduccion } from '@/services/mutations'

type ProduccionOptions = {
    fincas: Finca[]
    bloques: Bloque[]
    variedades: Variedad[]
}

function toDateTimeLocalValue(date: Date) {
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60_000)
    return local.toISOString().slice(0, 16)
}

export function ProduccionCard() {
    const [open, setOpen] = React.useState(false)
    const [options, setOptions] = React.useState<ProduccionOptions>({ fincas: [], bloques: [], variedades: [] })
    const [optionsLoaded, setOptionsLoaded] = React.useState(false)
    const [optionsError, setOptionsError] = React.useState<string | null>(null)
    const [loadingOptions, setLoadingOptions] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)
    const [submitError, setSubmitError] = React.useState<string | null>(null)
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
    const [fincaId, setFincaId] = React.useState('')
    const [bloqueId, setBloqueId] = React.useState('')
    const [variedadId, setVariedadId] = React.useState('')
    const [cantidad, setCantidad] = React.useState('')
    const [createdAt, setCreatedAt] = React.useState(() => toDateTimeLocalValue(new Date()))
    const [fincaComboKey, setFincaComboKey] = React.useState(0)
    const [bloqueComboKey, setBloqueComboKey] = React.useState(0)
    const [variedadComboKey, setVariedadComboKey] = React.useState(0)

    React.useEffect(() => {
        if (!open || optionsLoaded || loadingOptions) return
        setLoadingOptions(true)
        setOptionsError(null)
            ; (async () => {
                try {
                    const [fincaRes, bloqueRes, variedadRes] = await Promise.all([
                        fetchTable('finca'),
                        fetchTable('bloque'),
                        fetchTable('variedad'),
                    ])
                    setOptions({
                        fincas: fincaRes.rows as Finca[],
                        bloques: bloqueRes.rows as Bloque[],
                        variedades: variedadRes.rows as Variedad[],
                    })
                    setOptionsLoaded(true)
                } catch (err: any) {
                    setOptionsError(err?.message ?? 'No se pudieron cargar las opciones')
                } finally {
                    setLoadingOptions(false)
                }
            })()
    }, [open, optionsLoaded, loadingOptions])

    const fincaOptions = React.useMemo<ComboOption[]>(() =>
        options.fincas
            .map((finca) => ({
                value: String(finca.id_finca),
                label: finca.nombre ?? `Finca ${finca.id_finca}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        , [options.fincas])

    const bloqueOptions = React.useMemo<ComboOption[]>(() => {
        const filtered = fincaId
            ? options.bloques.filter((bloque) => String(bloque.id_finca ?? '') === fincaId)
            : options.bloques
        return filtered
            .map((bloque) => ({
                value: String(bloque.id_bloque),
                label: bloque.nombre ?? `Bloque ${bloque.id_bloque}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
    }, [options.bloques, fincaId])

    const variedadOptions = React.useMemo<ComboOption[]>(() =>
        options.variedades
            .map((variedad) => ({
                value: String(variedad.id_variedad),
                label: variedad.nombre ?? `Variedad ${variedad.id_variedad}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        , [options.variedades])

    const resetForm = React.useCallback(() => {
        setFincaId('')
        setBloqueId('')
        setVariedadId('')
        setCantidad('')
        setCreatedAt(toDateTimeLocalValue(new Date()))
        setSubmitError(null)
        setFincaComboKey((key) => key + 1)
        setBloqueComboKey((key) => key + 1)
        setVariedadComboKey((key) => key + 1)
    }, [])

    const handleOpenChange = (value: boolean) => {
        setOpen(value)
        if (!value) {
            resetForm()
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSubmitError(null)
        setStatusMessage(null)

        const fincaNum = Number(fincaId)
        const bloqueNum = Number(bloqueId)
        const variedadNum = Number(variedadId)
        const cantidadNum = Number(cantidad)

        if (!fincaId || Number.isNaN(fincaNum)) {
            setSubmitError('Selecciona una finca')
            return
        }
        if (!bloqueId || Number.isNaN(bloqueNum)) {
            setSubmitError('Selecciona un bloque')
            return
        }
        if (!variedadId || Number.isNaN(variedadNum)) {
            setSubmitError('Selecciona una variedad')
            return
        }
        if (!cantidad || Number.isNaN(cantidadNum)) {
            setSubmitError('Ingresa una cantidad válida')
            return
        }

        setSubmitting(true)
        try {
            const createdAtIso = createdAt ? new Date(createdAt).toISOString() : undefined
            await insertProduccion({
                fincaId: fincaNum,
                bloqueId: bloqueNum,
                variedadId: variedadNum,
                cantidad: cantidadNum,
                createdAt: createdAtIso,
            })
            setStatusMessage('Producción registrada correctamente')
            handleOpenChange(false)
        } catch (err: any) {
            setSubmitError(err?.message ?? 'No se pudo registrar la producción')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card className="flex flex-col min-h-0">
            <CardHeader className="flex flex-row items-center justify-between border-b flex-shrink-0 gap-3">
                <CardTitle>Producción</CardTitle>
                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button size="sm">Ingresar producción hoy</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Registrar producción</DialogTitle>
                        </DialogHeader>
                        {optionsError ? (
                            <p className="text-sm text-red-600">{optionsError}</p>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Finca</label>
                                    <Combobox
                                        key={`finca-${fincaComboKey}`}
                                        options={fincaOptions}
                                        placeholder={loadingOptions ? 'Cargando fincas…' : 'Selecciona una finca'}
                                        onSelect={(opt) => {
                                            setFincaId(opt.value)
                                            if (bloqueId) {
                                                setBloqueId('')
                                                setBloqueComboKey((key) => key + 1)
                                            }
                                            if (variedadId) {
                                                setVariedadId('')
                                                setVariedadComboKey((key) => key + 1)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Bloque</label>
                                    <Combobox
                                        key={`bloque-${bloqueComboKey}`}
                                        options={bloqueOptions}
                                        placeholder={fincaId ? 'Selecciona un bloque' : 'Primero selecciona la finca'}
                                        onSelect={(opt) => setBloqueId(opt.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Variedad</label>
                                    <Combobox
                                        key={`variedad-${variedadComboKey}`}
                                        options={variedadOptions}
                                        placeholder="Selecciona una variedad"
                                        onSelect={(opt) => setVariedadId(opt.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Cantidad</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={cantidad}
                                        onChange={(event) => setCantidad(event.target.value)}
                                        placeholder="Ingresa la cantidad"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Fecha y hora</label>
                                    <Input
                                        type="datetime-local"
                                        value={createdAt}
                                        onChange={(event) => setCreatedAt(event.target.value)}
                                        required
                                    />
                                </div>
                                {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={submitting || loadingOptions}>
                                        {submitting ? 'Guardando…' : 'Guardar'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col p-0">
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    {statusMessage ?? 'Datos de producción'}
                </div>
            </CardContent>
        </Card>
    )
}
