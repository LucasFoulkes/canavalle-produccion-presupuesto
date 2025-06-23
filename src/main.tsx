import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Fincas from './pages/Fincas'
import Bloques from './pages/Bloques'
import Variedades from './pages/Variedades'
import Acciones from './pages/Acciones'
import Config from './pages/Config'
import Reportes from './pages/Reportes'

window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <div className='h-screen w-screen bg-zinc-100'>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/acciones" element={<Acciones />} />
        <Route path="/fincas" element={<Fincas />} />
        <Route path="/bloques" element={<Bloques />} />
        <Route path="/variedades" element={<Variedades />} />
        <Route path="/config" element={<Config />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  </div>
)
