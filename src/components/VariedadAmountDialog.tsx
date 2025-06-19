import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Finca {
    id: number;
    nombre: string;
}

interface Bloque {
    id: number;
    nombre: string;
    finca_id: number;
}

interface Variedad {
    id: number;
    nombre: string;
}

interface VariedadAmountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    finca: Finca;
    bloque: Bloque;
    variedad: Variedad | null;
    accion: string;
    onConfirm: (data: {
        finca: string;
        bloque: string;
        variedad: string;
        accion: string;
        amount: number;
    }) => void;
}

export function VariedadAmountDialog({
    open,
    onOpenChange,
    finca,
    bloque,
    variedad,
    accion,
    onConfirm
}: VariedadAmountDialogProps) {
    const [amount, setAmount] = useState('')

    const handleConfirm = () => {
        if (!variedad || !amount || parseFloat(amount) < 0) {
            return
        } const data = {
            finca: finca.nombre,
            bloque: bloque.nombre,
            variedad: variedad.nombre,
            accion: accion,
            amount: parseFloat(amount)
        }

        onConfirm(data)
        handleClose()
    }

    const handleClose = () => {
        setAmount('')
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent >
                <DialogHeader>
                    <DialogTitle className="text-center capitalize text-xl font-bold ">
                        {finca.nombre} • {bloque.nombre} • {variedad?.nombre}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Button className='bg-blue-600 text-white capitalize font-semibold w-full h-14 text-lg'>
                        {accion.replace(/_/g, ' ')}
                    </Button>
                    <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-lg h-14 text-center"
                        placeholder='Ingrese la cantidad'
                        autoFocus
                    />
                </div>

                <DialogFooter className="flex-col space-y-2">
                    <Button
                        onClick={handleConfirm}
                        disabled={!amount || parseFloat(amount) < 0}
                        className="w-full h-14 text-lg"
                    >
                        Confirmar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleClose}
                        className="w-full h-14 text-lg"
                    >
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
