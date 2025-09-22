import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import * as React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const { createUser } = useAuth()
  const router = useRouter()
  const [nombres, setNombres] = React.useState('')
  const [apellidos, setApellidos] = React.useState('')
  const [rol, setRol] = React.useState('')
  const [cedula, setCedula] = React.useState('')
  const [pin, setPin] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createUser({ nombres, apellidos, rol, clave_pin: pin, cedula })
      router.navigate({ to: '/' })
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Crear usuario</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground">Nombres</label>
          <Input value={nombres} onChange={(e) => setNombres(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Apellidos</label>
          <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Rol</label>
          <Input value={rol} onChange={(e) => setRol(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Cédula</label>
          <Input value={cedula} onChange={(e) => setCedula(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">PIN</label>
          <Input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" />
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <Button type="submit" disabled={loading || !pin} className="w-full">{loading ? 'Creando…' : 'Crear'}</Button>
      </form>
      <div className="mt-4 text-sm">
        ¿Ya tienes usuario? <Link to="/login" className="underline">Iniciar sesión</Link>
      </div>
    </div>
  )
}

