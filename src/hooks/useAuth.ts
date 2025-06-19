import { useState } from 'react'
import { AuthService, type Usuario } from '@/services/auth.service'

export const useAuth = () => {
    const [user, setUser] = useState<Usuario | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const authenticateWithPin = async (pin: string) => {
        if (pin.length !== 6) {
            setError('El PIN debe tener 6 caracteres')
            return { success: false, user: null }
        }

        setIsLoading(true)
        setError(null)

        try {
            const { data, error: authError } = await AuthService.authenticateWithPin(pin)

            if (authError) {
                setError(authError)
                setUser(null)
                return { success: false, user: null }
            }

            setUser(data)
            return { success: true, user: data }
        } catch (err) {
            setError('Error inesperado')
            return { success: false, user: null }
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        setUser(null)
        setError(null)
    }

    return {
        user,
        isLoading,
        error,
        authenticateWithPin,
        logout,
        isAuthenticated: !!user
    }
}
