import * as React from 'react'
import { usuariosService } from '@/services/db'
import { getStore } from '@/lib/dexie'

export type Usuario = {
    id_usuario: number
    creado_en?: string
    nombres?: string | null
    apellidos?: string | null
    rol?: string | null
    clave_pin?: string | null
    cedula?: string | null
}

type AuthContextType = {
    user: Usuario | null
    loginWithPin: (pin: string) => Promise<boolean>
    logout: () => void
    createUser: (input: { nombres?: string; apellidos?: string; rol?: string; clave_pin: string; cedula?: string }) => Promise<Usuario>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const STORAGE_USER_KEY = 'auth.user'
const STORAGE_LAST_PIN_KEY = 'auth.lastPin'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<Usuario | null>(null)

    // Load from localStorage on mount
    React.useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_USER_KEY)
            if (raw) setUser(JSON.parse(raw))
        } catch { /* ignore */ }
    }, [])

    const loginWithPin = React.useCallback(async (pin: string) => {
        // Online: verify against server
        if (typeof navigator === 'undefined' || navigator.onLine) {
            const { data, error } = await usuariosService.findByClavePin(pin)
            if (error) throw error
            if (!data) return false
            setUser(data as unknown as Usuario)
            try {
                localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data))
                localStorage.setItem(STORAGE_LAST_PIN_KEY, pin)
            } catch { }
            return true
        }
        // Offline: try local Dexie lookup by PIN; fallback to lastPin cache
        try {
            const store = getStore('usuario')
            const all = (await store.toArray()) as any[]
            const found = all.find((u) => String(u?.clave_pin ?? '') === String(pin))
            if (found) {
                setUser(found as Usuario)
                try {
                    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(found))
                    localStorage.setItem(STORAGE_LAST_PIN_KEY, pin)
                } catch { }
                return true
            }
        } catch { /* ignore dexie issues */ }
        try {
            const lastPin = localStorage.getItem(STORAGE_LAST_PIN_KEY)
            const raw = localStorage.getItem(STORAGE_USER_KEY)
            if (lastPin && raw && lastPin === pin) {
                const cached = JSON.parse(raw) as Usuario
                setUser(cached)
                return true
            }
        } catch { }
        return false
    }, [])

    const logout = React.useCallback(() => {
        setUser(null)
        try {
            localStorage.removeItem(STORAGE_USER_KEY)
            // Keep lastPin to allow offline re-login with same pin if needed
        } catch { }
    }, [])

    const createUser = React.useCallback(async (input: { nombres?: string; apellidos?: string; rol?: string; clave_pin: string; cedula?: string }) => {
        const payload = {
            nombres: input.nombres ?? null,
            apellidos: input.apellidos ?? null,
            rol: input.rol ?? null,
            clave_pin: input.clave_pin,
            cedula: input.cedula ?? null,
        }

        // If online, try server first
        if (typeof navigator === 'undefined' || navigator.onLine) {
            const { data, error } = await usuariosService.insert(payload as any)
            if (!error && data) {
                const u = data as unknown as Usuario
                // Upsert to Dexie
                try { await getStore('usuario').put(u as any) } catch { }
                setUser(u)
                try {
                    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u))
                    localStorage.setItem(STORAGE_LAST_PIN_KEY, input.clave_pin)
                } catch { }
                return u
            }
            // If server failed for a transient reason, fall through to offline path
        }

        // Offline (or server failed): create a temporary local user to allow immediate usage
        const tempUser: Usuario = {
            id_usuario: (Date.now() + Math.random()) as any, // temporary key (string/number ok for Dexie)
            creado_en: new Date().toISOString(),
            nombres: payload.nombres ?? undefined,
            apellidos: payload.apellidos ?? undefined,
            rol: payload.rol ?? undefined,
            clave_pin: payload.clave_pin,
            cedula: payload.cedula ?? undefined,
        }
        try {
            await getStore('usuario').put({ ...(tempUser as any), needs_sync: true })
        } catch { }
        setUser(tempUser)
        try {
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(tempUser))
            localStorage.setItem(STORAGE_LAST_PIN_KEY, input.clave_pin)
        } catch { }
        return tempUser
    }, [])

    const value: AuthContextType = React.useMemo(() => ({ user, loginWithPin, logout, createUser }), [user, loginWithPin, logout, createUser])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = React.useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
    return ctx
}
