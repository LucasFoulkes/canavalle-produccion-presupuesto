// Deprecated route kept temporarily to avoid regeneration side-effects.
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/app/monitoreo/grupos')({
    component: DeprecatedGruposRedirect,
})

function DeprecatedGruposRedirect() {
    const navigate = useNavigate()
    useEffect(() => {
        try {
            // Attempt to go back first (user likely came from bloques)
            if (window.history.length > 1) {
                window.history.back()
                return
            }
        } catch { /* ignore */ }
        // Fallback: navigate to monitoreo root (which lists fincas)
        navigate({ to: '/app/monitoreo', replace: true })
    }, [navigate])
    return null
}
