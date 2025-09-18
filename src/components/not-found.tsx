export function NotFound() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      <div className="max-w-sm space-y-2 text-center">
        <h2 className="text-lg font-semibold text-foreground">Contenido no encontrado</h2>
        <p>
          La ruta solicitada no esta disponible sin conexion o no existe. Verifica la URL o sincroniza los
          datos cuando tengas conexion.
        </p>
      </div>
    </div>
  )
}
