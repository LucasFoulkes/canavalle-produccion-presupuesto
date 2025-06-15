import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import Authentication from "./pages/Authentication"
import RootLayout from "./layouts/RootLayout"
import Fincas from "./pages/Fincas"
import Bloques from "./pages/Bloques"
import Acciones from "./pages/Acciones"
import Variedades from "./pages/Variedades"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { ReactElement } from "react"

// Protected route component
function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <RootLayout>
      <Routes>
        <Route path="/" element={<Authentication />} />
        <Route
          path="/fincas"
          element={
            <ProtectedRoute>
              <Fincas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bloques/:fincaId"
          element={
            <ProtectedRoute>
              <Bloques />
            </ProtectedRoute>
          }
        />
        <Route
          path="/acciones/:bloqueId"
          element={
            <ProtectedRoute>
              <Acciones />
            </ProtectedRoute>
          }
        />
        <Route
          path="/variedades/:bloqueId"
          element={
            <ProtectedRoute>
              <Variedades />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RootLayout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App