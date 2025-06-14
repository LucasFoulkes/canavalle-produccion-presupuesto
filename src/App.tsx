import { Routes, Route } from "react-router-dom"
import Authentication from "./pages/Authentication"
import RootLayout from "./layouts/RootLayout"
import Acciones from "./pages/Acciones"
import Configuracion from "./pages/Configuracion"

function App() {
  return (
    <RootLayout>
      <Routes>
        <Route path="/" element={<Authentication />} />
        <Route path="/acciones" element={<Acciones />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Routes>
    </RootLayout>
  )
}

export default App