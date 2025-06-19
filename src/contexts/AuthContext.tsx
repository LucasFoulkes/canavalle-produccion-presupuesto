import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AuthService, type Usuario } from '@/services/auth.service'

interface AuthContextType {
    user: Usuario | null
    isLoading: boolean
    error: string | null
    isAuthenticated: boolean
    authenticateWithPin: (pin: string) => Promise<{ success: boolean; user: Usuario | null }>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
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

    const value = {
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        authenticateWithPin,
        logout,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
