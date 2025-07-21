import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ChevronLeft, Edit, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { estadosFenologicosService, type EstadoFenologicoWithRelations } from '@/services/estados-fenologicos.service'

export const Route = createFileRoute('/app/estados-fenologicos')({
  component: EstadosFenologicosComponent,
})



function EstadosFenologicosComponent() {
  const navigate = useNavigate()
  const [estados, setEstados] = useState<EstadoFenologicoWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<Partial<EstadoFenologicoWithRelations>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchEstados = async () => {
      try {
        setLoading(true)
        const data = await estadosFenologicosService.getAllEstadosFenologicos()
        setEstados(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar estados fenológicos')
      } finally {
        setLoading(false)
      }
    }

    fetchEstados()
  }, [])

  const columns = [
    { key: 'finca_nombre', label: 'Finca', readonly: true },
    { key: 'bloque_nombre', label: 'Bloque', readonly: true },
    { key: 'variedad_nombre', label: 'Variedad', readonly: true },
    { key: 'brotacion', label: 'Brotación', editable: true },
    { key: '5CM', label: '5 CM', editable: true },
    { key: '15 CM', label: '15 CM', editable: true },
    { key: '20 CM', label: '20 CM', editable: true },
    { key: 'PRIMERA HOJA', label: 'Primera Hoja', editable: true },
    { key: 'ESPIGA', label: 'Espiga', editable: true },
    { key: 'ARROZ', label: 'Arroz', editable: true },
    { key: 'ARVEJA', label: 'Arveja', editable: true },
    { key: 'GARBANZO', label: 'Garbanzo', editable: true },
    { key: 'UVA', label: 'Uva', editable: true },
    { key: 'RAYANDO COLOR', label: 'Rayando Color', editable: true },
    { key: 'SEPALOS ABIERTOS', label: 'Sépalos Abiertos', editable: true },
    { key: 'COSECHA', label: 'Cosecha', editable: true },
  ]

  const handleEdit = (estado: EstadoFenologicoWithRelations) => {
    setEditingId(estado.id)
    setEditingData({ ...estado })
  }

  const handleSave = async () => {
    if (!editingId || !editingData) return

    setSaving(true)
    try {
      // Only send editable fields to the server
      const updateData: Partial<EstadoFenologicoWithRelations> = {}
      columns.forEach(col => {
        if (col.editable && editingData[col.key as keyof EstadoFenologicoWithRelations] !== undefined) {
          updateData[col.key as keyof EstadoFenologicoWithRelations] = editingData[col.key as keyof EstadoFenologicoWithRelations]
        }
      })

      await estadosFenologicosService.updateEstadoFenologico(editingId, updateData)

      // Update local state
      setEstados(prev => prev.map(estado =>
        estado.id === editingId ? { ...estado, ...editingData } : estado
      ))

      setEditingId(null)
      setEditingData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleInputChange = (key: string, value: string) => {
    setEditingData(prev => ({
      ...prev,
      [key]: value === '' ? null : Number(value)
    }))
  }

  const handleDoubleClick = (estado: EstadoFenologicoWithRelations) => {
    if (editingId === null) {
      handleEdit(estado)
    }
  }

  // Calculate cumulative sum from right to left for numerical columns
  const calculateCumulativeValue = (row: EstadoFenologicoWithRelations, columnIndex: number) => {
    const numericalColumns = columns.slice(3) // Skip context columns (finca, bloque, variedad)
    const currentColumnIndex = columnIndex - 3 // Adjust for context columns

    if (currentColumnIndex < 0) return row[columns[columnIndex].key as keyof EstadoFenologicoWithRelations] // Return original value for non-numerical columns

    let sum = 0
    // Sum from current column to the end (right to left cumulative)
    for (let i = currentColumnIndex; i < numericalColumns.length; i++) {
      const value = row[numericalColumns[i].key as keyof EstadoFenologicoWithRelations]
      if (value && typeof value === 'number') {
        sum += value
      }
    }

    return sum || row[columns[columnIndex].key as keyof EstadoFenologicoWithRelations] // Return sum or original value if sum is 0
  }

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({ to: '/app/configuracion' })}
        />
        <h1 className="text-2xl text-zinc-500 font-thin">
          Estados Fenológicos
        </h1>
      </div>

      <div className='flex-1 overflow-hidden'>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p>Cargando estados fenológicos...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="h-full overflow-auto border rounded-lg">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 bg-background border-b z-10">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {estados.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-4 text-center py-8">
                      No hay estados fenológicos registrados
                    </td>
                  </tr>
                ) : (
                  estados.map((estado) => (
                    <tr
                      key={estado.id}
                      className={`border-b transition-colors hover:bg-muted/50 ${editingId === estado.id ? 'bg-blue-50' : ''
                        }`}
                      onDoubleClick={() => handleDoubleClick(estado)}
                    >
                      {columns.map((column, index) => (
                        <td
                          key={column.key}
                          className="p-4 align-middle whitespace-nowrap text-sm"
                        >
                          {editingId === estado.id && column.editable ? (
                            <Input
                              type="number"
                              value={editingData[column.key as keyof EstadoFenologicoWithRelations] ?? ''}
                              onChange={(e) => handleInputChange(column.key, e.target.value)}
                              className="w-20 h-8 text-sm"
                              min="0"
                            />
                          ) : (
                            index >= 3 && column.editable // Show cumulative for numerical columns (after finca, bloque, variedad)
                              ? calculateCumulativeValue(estado, index) || '-'
                              : estado[column.key as keyof EstadoFenologicoWithRelations] ?? '-'
                          )}
                        </td>
                      ))}
                      <td className="p-4 align-middle whitespace-nowrap text-sm">
                        {editingId === estado.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(estado)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}