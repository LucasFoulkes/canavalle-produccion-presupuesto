import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'

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
        {/* <Route element={<Layout />}></Route> */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  </div>
)
