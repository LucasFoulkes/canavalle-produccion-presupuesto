// import { StrictMode } from 'react' // Temporarily disabled for debugging
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.tsx'
import Fincas from './pages/Fincas.tsx'
import Bloques from './pages/Bloques.tsx'
import Variedades from './pages/Variedades.tsx'
import Configuracion from './pages/Configuracion.tsx'
import Reportes from './pages/Reportes.tsx'
import AccionesSelection from './pages/AccionesSelection.tsx'

// Add global error handlers to catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<App />} />
          <Route element={<Layout />}>
            <Route path="/acciones" element={<AccionesSelection />} />
            <Route path="/fincas/:accion" element={<Fincas />} />
            <Route path="/bloques/:fincaId/:fincaNombre/:accion" element={<Bloques />} />
            <Route path="/variedades/:fincaId/:fincaNombre/:accion/:bloqueId" element={<Variedades />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/reportes" element={<Reportes />} />
          </Route>
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </AuthProvider>
)
