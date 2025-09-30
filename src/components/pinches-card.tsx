import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { fetchTable } from '@/services/tables'
import type { Bloque, Cama, GrupoCama, PincheTipo, Variedad } from '@/types/tables'
import { insertPinche } from '@/services/mutations'

type PincheOptions = {
    bloques: Bloque[]
    camas: Cama[]
    variedades: Variedad[]
    tipos: PincheTipo[]
    grupos: GrupoCama[]
}

function toDateTimeLocalValue(date: Date) {
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60_000)
    return local.toISOString().slice(0, 16)
}

export function PinchesCard() {
    const [open, setOpen] = React.useState(false)
    const [options, setOptions] = React.useState<PincheOptions>({ bloques: [], camas: [], variedades: [], tipos: [], grupos: [] })
    const [optionsLoaded, setOptionsLoaded] = React.useState(false)
    const [optionsError, setOptionsError] = React.useState<string | null>(null)
    const [loadingOptions, setLoadingOptions] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)
    const [submitError, setSubmitError] = React.useState<string | null>(null)
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
    const [bloqueId, setBloqueId] = React.useState('')
    const [camaId, setCamaId] = React.useState('')
    const [variedadId, setVariedadId] = React.useState('')
    const [tipo, setTipo] = React.useState('')
    const [cantidad, setCantidad] = React.useState('')
    const [createdAt, setCreatedAt] = React.useState(() => toDateTimeLocalValue(new Date()))
    const [bloqueComboKey, setBloqueComboKey] = React.useState(0)
    const [variedadComboKey, setVariedadComboKey] = React.useState(0)
    const [camaComboKey, setCamaComboKey] = React.useState(0)
    const [tipoComboKey, setTipoComboKey] = React.useState(0)

    React.useEffect(() => {
        if (!open || optionsLoaded || loadingOptions) return
        setLoadingOptions(true)
        setOptionsError(null)
            ; (async () => {
                try {
                    const [bloqueRes, camaRes, variedadRes, tiposRes, gruposRes] = await Promise.all([
                        fetchTable('bloque'),
                        fetchTable('cama'),
                        fetchTable('variedad'),
                        fetchTable('pinche_tipo'),
                        fetchTable('grupo_cama'),
                    ])
                    setOptions({
                        bloques: bloqueRes.rows as Bloque[],
                        camas: camaRes.rows as Cama[],
                        variedades: variedadRes.rows as Variedad[],
                        tipos: tiposRes.rows as PincheTipo[],
                        grupos: gruposRes.rows as GrupoCama[],
                    })
                    setOptionsLoaded(true)
                } catch (err: any) {
                    setOptionsError(err?.message ?? 'No se pudieron cargar las opciones')
                } finally {
                    setLoadingOptions(false)
                }
            })()
    }, [open, optionsLoaded, loadingOptions])

    const bloqueOptions = React.useMemo<ComboOption[]>(() =>
        options.bloques
            .map((bloque) => ({
                value: String(bloque.id_bloque),
                label: bloque.nombre ?? `Bloque ${bloque.id_bloque}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        , [options.bloques])

    const grupoById = React.useMemo(() => {
        const map = new Map<number, GrupoCama>()
        for (const grupo of options.grupos) {
            map.set(grupo.id_grupo, grupo)
        }
        return map
    }, [options.grupos])

    const camaOptions = React.useMemo<ComboOption[]>(() => {
        const filtered = options.camas.filter((cama) => {
            const grupo = grupoById.get(cama.id_grupo)
            if (!grupo) return false
            if (bloqueId && String(grupo.id_bloque) !== bloqueId) return false
            if (variedadId && String(grupo.id_variedad) !== variedadId) return false
            return true
        })
        return filtered
            .map((cama) => ({
                value: String(cama.id_cama),
                label: cama.nombre ?? `Cama ${cama.id_cama}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
    }, [options.camas, grupoById, bloqueId, variedadId])

    const variedadOptions = React.useMemo<ComboOption[]>(() =>
        options.variedades
            .map((variedad) => ({
                value: String(variedad.id_variedad),
                label: variedad.nombre ?? `Variedad ${variedad.id_variedad}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        , [options.variedades])

    const tipoOptions = React.useMemo<ComboOption[]>(() =>
        options.tipos
            .map((tipo) => ({ value: String(tipo.codigo), label: tipo.codigo }))
            .sort((a, b) => a.label.localeCompare(b.label))
        , [options.tipos])

    const resetForm = React.useCallback(() => {
        setBloqueId('')
        setCamaId('')
        setVariedadId('')
        setTipo('')
        setCantidad('')
        setCreatedAt(toDateTimeLocalValue(new Date()))
        setSubmitError(null)
        setBloqueComboKey((key) => key + 1)
        setVariedadComboKey((key) => key + 1)
        setCamaComboKey((key) => key + 1)
        setTipoComboKey((key) => key + 1)
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

        const bloqueNum = Number(bloqueId)
        const camaNum = Number(camaId)
        const variedadNum = Number(variedadId)
        const cantidadNum = Number(cantidad)

        if (!bloqueId || Number.isNaN(bloqueNum)) {
            setSubmitError('Selecciona un bloque')
            return
        }
        if (!camaId || Number.isNaN(camaNum)) {
            setSubmitError('Selecciona una cama')
            return
        }
        if (!variedadId || Number.isNaN(variedadNum)) {
            setSubmitError('Selecciona una variedad')
            return
        }
        if (!tipo) {
            setSubmitError('Selecciona un tipo de pinche')
            return
        }
        if (!cantidad || Number.isNaN(cantidadNum)) {
            setSubmitError('Ingresa una cantidad válida')
            return
        }

        setSubmitting(true)
        try {
            const createdAtIso = createdAt ? new Date(createdAt).toISOString() : undefined
            await insertPinche({
                bloqueId: bloqueNum,
                camaId: camaNum,
                variedadId: variedadNum,
                tipo,
                cantidad: cantidadNum,
                createdAt: createdAtIso,
            })
            setStatusMessage('Pinche registrado correctamente')
            handleOpenChange(false)
        } catch (err: any) {
            setSubmitError(err?.message ?? 'No se pudo registrar el pinche')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card className="flex flex-col min-h-0">
            <CardHeader className="flex flex-row items-center justify-between border-b flex-shrink-0 gap-3">
                <CardTitle>Pinches</CardTitle>
                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button size="sm">Ingresar pinches hoy</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Registrar pinches</DialogTitle>
                        </DialogHeader>
                        {optionsError ? (
                            <p className="text-sm text-red-600">{optionsError}</p>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Bloque</label>
                                    <Combobox
                                        key={`bloque-${bloqueComboKey}`}
                                        options={bloqueOptions}
                                        placeholder={loadingOptions ? 'Cargando bloques…' : 'Selecciona un bloque'}
                                        onSelect={(opt) => {
                                            setBloqueId(opt.value)
                                            if (variedadId) {
                                                setVariedadId('')
                                                setVariedadComboKey((key) => key + 1)
                                            }
                                            if (camaId) {
                                                setCamaId('')
                                                setCamaComboKey((key) => key + 1)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Variedad</label>
                                    <Combobox
                                        key={`variedad-${variedadComboKey}`}
                                        options={variedadOptions}
                                        placeholder="Selecciona una variedad"
                                        onSelect={(opt) => {
                                            setVariedadId(opt.value)
                                            if (camaId) {
                                                setCamaId('')
                                                setCamaComboKey((key) => key + 1)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Cama</label>
                                    <Combobox
                                        key={`cama-${camaComboKey}`}
                                        options={camaOptions}
                                        placeholder={bloqueId ? (camaOptions.length ? 'Selecciona una cama' : 'No hay camas para el bloque seleccionado') : 'Selecciona primero un bloque'}
                                        onSelect={(opt) => setCamaId(opt.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Tipo</label>
                                    <Combobox
                                        key={`tipo-${tipoComboKey}`}
                                        options={tipoOptions}
                                        placeholder="Selecciona un tipo"
                                        onSelect={(opt) => setTipo(opt.value)}
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
                    {statusMessage ?? 'Datos de pinches'}
                </div>
            </CardContent>
        </Card>
    )
}
