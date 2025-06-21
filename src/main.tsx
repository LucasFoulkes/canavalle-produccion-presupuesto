import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.tsx'
import Fincas from './pages/Fincas.tsx'
import Bloques from './pages/Bloques.tsx'
import Acciones from './pages/Acciones.tsx'
import Variedades from './pages/Variedades.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />          <Route path="/fincas" element={<Fincas />} />
          <Route path="/acciones/:fincaId/:fincaNombre" element={<Acciones />} />
          <Route path="/bloques/:fincaId/:fincaNombre/:accion" element={<Bloques />} />
          <Route path="/variedades/:fincaId/:fincaNombre/:accion/:bloqueId" element={<Variedades />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
)
