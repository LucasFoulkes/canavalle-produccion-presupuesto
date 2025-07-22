import { useState } from 'react'
import { useOfflineForm } from '@/hooks/useOfflineForm'
import { Finca } from '@/types/database'

interface FincaFormProps {
    onSuccess?: () => void;
    initialData?: Partial<Finca>;
}

export function FincaForm({ onSuccess, initialData }: FincaFormProps) {
    const [nombre, setNombre] = useState(initialData?.nombre || '')
    const { saving, error, saveData } = useOfflineForm<Finca>('fincas')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        try {
            const fincaData: Partial<Finca> = {
                ...initialData,
                nombre
            }

            await saveData(fincaData as Finca)

            // Reset form
            setNombre('')

            // Call success callback if provided
            if (onSuccess) {
                onSuccess()
            }

            // Show success message
            alert(
                'Finca guardada correctamente' +
                (!navigator.onLine ? ' (se sincronizará cuando haya conexión)' : '')
            )
        } catch (err) {
            console.error('Error saving finca:', err)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Nombre de la Finca
                </label>
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={saving}
                />
            </div>

            {error && (
                <div className="text-red-500 text-sm">
                    Error: {error.message}
                </div>
            )}

            {!navigator.onLine && (
                <div className="text-yellow-600 text-sm bg-yellow-50 p-2 rounded">
                    ⚠️ Sin conexión: Los cambios se guardarán localmente y se sincronizarán cuando haya conexión
                </div>
            )}

            <button
                type="submit"
                className={`px-4 py-2 rounded ${saving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                disabled={saving}
            >
                {saving ? 'Guardando...' : 'Guardar Finca'}
            </button>
        </form>
    )
}