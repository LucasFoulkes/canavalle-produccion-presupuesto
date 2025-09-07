import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { authService } from '@/services/usuarios.service'

export const Route = createFileRoute('/logout')({
    component: Logout,
})

function Logout() {
    const navigate = useNavigate()
    useEffect(() => {
        (async () => {
            await authService.logout()
            navigate({ to: '/' })
        })()
    }, [navigate])
    return null
}
