import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useState, useEffect, ReactElement } from "react"
import Authentication from "./pages/Authentication"
import RootLayout from "./layouts/RootLayout"
import Fincas from "./pages/Fincas"
import Bloques from "./pages/Bloques"
import Acciones from "./pages/Acciones"
import Variedades from "./pages/Variedades"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { useInstallStatus } from "./hooks/useInstallStatus"
import InstallDialog from "./components/InstallDialog"

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
          path="/variedades/:bloqueId/:accionId"
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
  const { isInstalled, isIOS, canShowInstallButton, deferredPrompt } = useInstallStatus();
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    // Show install dialog only if not installed
    if (!isInstalled) {
      // Small delay to let the app initialize
      const timer = setTimeout(() => {
        setShowInstallDialog(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleInstallComplete = () => {
    setShowInstallDialog(false);
  };

  const handleCloseInstallDialog = () => {
    setShowInstallDialog(false);
  };

  return (
    <AuthProvider>
      {/* Install Dialog - shown only when not installed */}
      {!isInstalled && showInstallDialog && (
        <InstallDialog
          isOpen={showInstallDialog}
          isIOS={isIOS}
          canShowInstallButton={canShowInstallButton}
          deferredPrompt={deferredPrompt}
          onInstall={handleInstallComplete}
          onClose={handleCloseInstallDialog}
        />
      )}

      {/* Main App */}
      <AppRoutes />
    </AuthProvider>
  )
}

export default App