import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Define the user type
export interface User {
    id: string;
    nombre?: string;
    role: string;
    pin: string;
}

// Define navigation context types
export interface Finca {
    id: string;
    nombre: string;
    ubicacion?: string;
    hectareas?: number;
}

export interface Bloque {
    id: string;
    nombre: string;
    finca_id: string;
    hectareas?: number;
}

// Define the auth context type
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (user: User) => void;
    logout: () => void;

    // Navigation context
    currentFinca: Finca | null;
    currentBloque: Bloque | null;
    setCurrentFinca: (finca: Finca | null) => void;
    setCurrentBloque: (bloque: Bloque | null) => void;
    clearNavigation: () => void;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },

    // Navigation context defaults
    currentFinca: null,
    currentBloque: null,
    setCurrentFinca: () => { },
    setCurrentBloque: () => { },
    clearNavigation: () => { },
});

// Auth provider props
interface AuthProviderProps {
    children: ReactNode;
}

// Create an auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Navigation state
    const [currentFinca, setCurrentFinca] = useState<Finca | null>(null);
    const [currentBloque, setCurrentBloque] = useState<Bloque | null>(null);

    // Check for existing user session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);    // Clear navigation context
    const clearNavigation = useCallback(() => {
        setCurrentFinca(null);
        setCurrentBloque(null);
    }, []);

    // Login function
    const login = useCallback((userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    }, []);

    // Logout function
    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
        clearNavigation(); // Clear navigation context on logout
    }, [clearNavigation]); return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,

                // Navigation context
                currentFinca,
                currentBloque,
                setCurrentFinca,
                setCurrentBloque,
                clearNavigation
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to use the auth context
export function useAuth() {
    return useContext(AuthContext);
}
