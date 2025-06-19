import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.tsx'
import Home from './pages/Home.tsx'
import Bloques from './pages/Bloques.tsx'
import Acciones from './pages/Acciones.tsx'
import Variedades from './pages/Variedades.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/home" element={<Home />} />
          <Route path="/bloques" element={<Bloques />} />
          <Route path="/variedades/:bloqueId" element={<Variedades />} />
          <Route path="/acciones" element={<Acciones />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
