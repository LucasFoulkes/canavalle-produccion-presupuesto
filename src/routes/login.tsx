import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/login')({
    component: LoginPage,
})

function LoginPage() {
    const { loginWithPin } = useAuth()
    const router = useRouter()
    const [pin, setPin] = React.useState('')
    const [error, setError] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(false)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const ok = await loginWithPin(pin)
            if (!ok) {
                setError('PIN inválido o no disponible sin conexión')
            } else {
                router.history.back()
            }
        } catch (err: any) {
            setError(err?.message ?? 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-sm p-4">
            <h1 className="mb-4 text-xl font-semibold">Iniciar sesión</h1>
            <form onSubmit={onSubmit} className="space-y-3">
                <div>
                    <label className="text-sm text-muted-foreground">PIN</label>
                    <Input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" autoFocus />
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <Button type="submit" disabled={loading || !pin} className="w-full">{loading ? 'Entrando…' : 'Entrar'}</Button>
            </form>
            <div className="mt-4 text-sm">
                ¿No tienes usuario? <Link to={"/signup" as any} className="underline">Crear usuario</Link>
            </div>
        </div>
    )
}
