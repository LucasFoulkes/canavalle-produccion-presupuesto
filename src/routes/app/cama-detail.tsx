import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ChevronLeft, BarChart3, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { camaService } from '@/services/cama.service'
import { bloqueVariedadService } from '@/services/bloque-variedad.service'
import { accionService } from '@/services/accion.service'
import { offlineAccionService } from '@/services/offline-accion.service'
import { runOfflineActionTest } from '@/lib/test-offline-accion'
import { estadosFenologicosService } from '@/services/estados-fenologicos.service'
import { supabase } from '@/lib/supabase'

type CamaDetailSearch = {
  fincaId: number
  fincaName: string
  bloqueId: number
  bloqueName: string
  camaId: number
  camaName: string
}

export const Route = createFileRoute('/app/cama-detail')({
  component: CamaDetailComponent,
  validateSearch: (search): CamaDetailSearch => ({
    fincaId: Number(search.fincaId),
    fincaName: String(search.fincaName || ''),
    bloqueId: Number(search.bloqueId),
    bloqueName: String(search.bloqueName || ''),
    camaId: Number(search.camaId),
    camaName: String(search.camaName || '')
  })
})

// Action type mapping
const actionTypeMap: Record<string, string> = {
  'Producción Real': 'produccion_real',
  'Pinche Apertura': 'pinche_apertura',
  'Pinche Sanitario': 'pinche_sanitario',
  'Pinche Tierno': 'pinche_tierno',
  'Temperatura': 'temperatura',
  'Humedad': 'humedad',
  'Arveja': 'arveja',
  'Garbanzo': 'garbanzo',
  'Uva': 'uva',
  'Arroz': 'arroz',
  'Rayando Color': 'rayando_color',
  'Sépalos Abiertos': 'sepalos_abiertos',
  'Cosecha': 'cosecha'
}

const ActionButton = ({
  title,
  onActionSubmit,
  currentValue
}: {
  title: string
  onActionSubmit: (actionType: string, value: number) => Promise<void>
  currentValue?: number
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const value = parseInt(inputValue)
    if (isNaN(value) || value < 0) return

    setIsSubmitting(true)
    try {
      const actionType = actionTypeMap[title]
      await onActionSubmit(actionType, value)

      // Reset and close
      setInputValue('')
      setIsConfirmOpen(false)
      setIsDrawerOpen(false)
    } catch (error) {
      console.error('Error submitting action:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDrawerSubmit = () => {
    const value = parseInt(inputValue)
    if (isNaN(value) || value < 0) return

    setIsDrawerOpen(false)
    setIsConfirmOpen(true)
  }

  return (
    <>
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            className={`h-16 text-sm font-medium flex flex-col items-center justify-center gap-1 ${currentValue !== undefined ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''
              }`}
          >
            <span>{title}</span>
            {currentValue !== undefined && (
              <span className="text-xs font-normal opacity-90">
                {currentValue}
              </span>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>
              Ingrese el valor para {title.toLowerCase()}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <Label htmlFor="actionValue">Valor</Label>
            <Input
              id="actionValue"
              type="number"
              inputMode="numeric"
              min="0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentValue !== undefined ? `Valor actual: ${currentValue}` : "Ingrese un número"}
              className="mt-2"
            />
          </div>
          <DrawerFooter>
            <Button
              onClick={handleDrawerSubmit}
              disabled={!inputValue || parseInt(inputValue) < 0}
            >
              Continuar
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar acción</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea registrar {inputValue} para {title.toLowerCase()}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper functions for chart data transformation
const getProductionOverTimeData = (historialData: any[]) => {
  return historialData
    .filter(accion => accion.produccion_real !== null && accion.produccion_real !== undefined)
    .map(accion => ({
      fecha: new Date(accion.created_at).toLocaleDateString('es-ES'),
      produccion: accion.produccion_real
    }))
    .sort((a, b) => {
      const dateA = new Date(a.fecha.split('/').reverse().join('-'))
      const dateB = new Date(b.fecha.split('/').reverse().join('-'))
      return dateA.getTime() - dateB.getTime()
    })
}

const getPhenologicalStagesData = (historialData: any[]) => {
  const stageKeys = ['arveja', 'garbanzo', 'uva', 'arroz', 'rayando_color', 'sepalos_abiertos']

  return historialData
    .filter(accion => stageKeys.some(key => (accion as any)[key] !== null && (accion as any)[key] !== undefined))
    .map(accion => {
      const data: any = {
        fecha: new Date(accion.created_at).toLocaleDateString('es-ES')
      }

      stageKeys.forEach(key => {
        if ((accion as any)[key] !== null && (accion as any)[key] !== undefined) {
          data[key] = (accion as any)[key]
        }
      })

      return data
    })
    .sort((a, b) => {
      const dateA = new Date(a.fecha.split('/').reverse().join('-'))
      const dateB = new Date(b.fecha.split('/').reverse().join('-'))
      return dateA.getTime() - dateB.getTime()
    })
}

const HistorialButton = ({ camaId }: { camaId: number }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [historialData, setHistorialData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  const loadHistorial = async () => {
    if (historialData.length > 0) return // Already loaded

    setLoading(true)
    try {
      // Get the local cama details to find the server cama
      const { db } = await import('@/lib/dexie')
      const localCama = await db.camas.get(camaId)

      if (!localCama) {
        console.error('Local cama not found')
        return
      }

      // Find the corresponding cama on the server
      const { data: serverCama, error: findError } = await supabase
        .from('camas')
        .select('id')
        .eq('bloque_id', localCama.bloque_id)
        .eq('nombre', localCama.nombre)
        .single()

      if (findError || !serverCama) {
        console.log('No server cama found, no history available')
        setHistorialData([])
        return
      }

      const acciones = await accionService.getAccionesByCama(serverCama.id)
      setHistorialData(acciones)
    } catch (error) {
      console.error('Error loading historial:', error)
      setHistorialData([])
    } finally {
      setLoading(false)
    }
  }

  const handleDrawerOpen = (open: boolean) => {
    setIsDrawerOpen(open)
    if (open) {
      loadHistorial()
    }
  }

  // Action type display names
  const actionDisplayNames: Record<string, string> = {
    'produccion_real': 'Producción Real',
    'pinche_apertura': 'Pinche Apertura',
    'pinche_sanitario': 'Pinche Sanitario',
    'pinche_tierno': 'Pinche Tierno',
    'temperatura': 'Temperatura',
    'humedad': 'Humedad',
    'arveja': 'Arveja',
    'garbanzo': 'Garbanzo',
    'uva': 'Uva',
    'arroz': 'Arroz',
    'rayando_color': 'Rayando Color',
    'sepalos_abiertos': 'Sépalos Abiertos',
    'cosecha': 'Cosecha'
  }

  // Transform data for table display
  const tableData = historialData.flatMap(accion => {
    const date = new Date(accion.created_at).toLocaleDateString('es-ES')
    const actions: Array<{ fecha: string, accion: string, valor: number }> = []

    Object.keys(actionDisplayNames).forEach(key => {
      if (accion[key] !== null && accion[key] !== undefined) {
        actions.push({
          fecha: date,
          accion: actionDisplayNames[key],
          valor: accion[key]
        })
      }
    })

    return actions
  })

  return (
    <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpen}>
      <DrawerTrigger asChild>
        <Button className="h-16 text-sm font-medium flex flex-col items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white">
          <span>Historial</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Historial de Acciones</DrawerTitle>
          <DrawerDescription>
            Historial completo de todas las acciones registradas para esta cama
          </DrawerDescription>
          <div className="flex gap-2 pt-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex items-center gap-2"
            >
              <TableIcon className="h-4 w-4" />
              Tabla
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </Button>
          </div>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto flex-1">
          {/* Debug view mode */}
          <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 text-sm rounded">
            Current view mode: {viewMode}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>Cargando historial...</p>
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No hay historial disponible</p>
            </div>
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.fecha}</TableCell>
                    <TableCell>{row.accion}</TableCell>
                    <TableCell className="text-right">{row.valor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-6">
              {/* Chart mode indicator */}
              <div className="mb-4 p-2 bg-green-100 text-green-800 text-sm rounded">
                ✅ Chart mode is active! You should see charts below.
              </div>

              {/* Debug info */}
              <div className="text-sm text-gray-500 mb-4">
                <p>Datos disponibles: {historialData.length} registros</p>
                <p>Datos de producción: {getProductionOverTimeData(historialData).length} puntos</p>
                <p>Datos fenológicos: {getPhenologicalStagesData(historialData).length} puntos</p>
              </div>

              {/* Simple HTML test */}
              <div className="mb-4">
                <div className="h-[100px] w-full bg-red-200 border-2 border-red-500 rounded flex items-center justify-center">
                  <p className="text-red-800 font-bold">🔴 RED BOX TEST - If you see this, the chart section is working!</p>
                </div>
              </div>

              {/* Test Chart with hardcoded data */}
              <div>
                <h3 className="text-lg font-medium mb-4">Test Chart (Hardcoded Data)</h3>
                <ChartContainer
                  config={{
                    test: {
                      label: "Test Data",
                      color: "#8884d8",
                    },
                  }}
                  className="h-[200px] w-full"
                >
                  <LineChart
                    data={[
                      { fecha: '2024-01-01', test: 10 },
                      { fecha: '2024-01-02', test: 20 },
                      { fecha: '2024-01-03', test: 15 },
                      { fecha: '2024-01-04', test: 25 }
                    ]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="test"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ fill: "#8884d8" }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Production Over Time Chart */}
              <div>
                <h3 className="text-lg font-medium mb-4">Producción en el Tiempo</h3>
                {getProductionOverTimeData(historialData).length > 0 ? (
                  <ChartContainer
                    config={{
                      produccion: {
                        label: "Producción Real",
                        color: "#8884d8",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <LineChart
                      data={getProductionOverTimeData(historialData)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="produccion"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ fill: "#8884d8" }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center border border-dashed border-gray-300 rounded">
                    <p className="text-gray-500">No hay datos de producción para mostrar</p>
                  </div>
                )}
              </div>

              {/* Phenological Stages Chart */}
              <div>
                <h3 className="text-lg font-medium mb-4">Estados Fenológicos</h3>
                {getPhenologicalStagesData(historialData).length > 0 ? (
                  <ChartContainer
                    config={{
                      arveja: { label: "Arveja", color: "#82ca9d" },
                      garbanzo: { label: "Garbanzo", color: "#ffc658" },
                      uva: { label: "Uva", color: "#ff7300" },
                      arroz: { label: "Arroz", color: "#8dd1e1" },
                      rayando_color: { label: "Rayando Color", color: "#d084d0" },
                      sepalos_abiertos: { label: "Sépalos Abiertos", color: "#87d068" },
                    }}
                    className="h-[300px] w-full"
                  >
                    <BarChart
                      data={getPhenologicalStagesData(historialData)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="arveja" fill="#82ca9d" />
                      <Bar dataKey="garbanzo" fill="#ffc658" />
                      <Bar dataKey="uva" fill="#ff7300" />
                      <Bar dataKey="arroz" fill="#8dd1e1" />
                      <Bar dataKey="rayando_color" fill="#d084d0" />
                      <Bar dataKey="sepalos_abiertos" fill="#87d068" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center border border-dashed border-gray-300 rounded">
                    <p className="text-gray-500">No hay datos fenológicos para mostrar</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const ProyeccionButton = ({ camaId, bloqueId, fincaName, bloqueName, camaName }: {
  camaId: number,
  bloqueId: number,
  fincaName: string,
  bloqueName: string,
  camaName: string
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [proyeccionData, setProyeccionData] = useState<Array<{
    fecha: string,
    finca: string,
    bloque: string,
    cama: string,
    variedad: string,
    etapa: string,
    produccion: number
  }>>([])
  const [loading, setLoading] = useState(false)

  const loadProyeccion = async () => {
    if (proyeccionData.length > 0) return // Already loaded

    setLoading(true)
    try {
      // Get the local cama details to find the server cama and variedad
      const { db } = await import('@/lib/dexie')
      const localCama = await db.camas.get(camaId)

      if (!localCama) {
        console.error('Local cama not found')
        return
      }

      // Find the corresponding cama on the server
      const { data: serverCama, error: findError } = await supabase
        .from('camas')
        .select('id, variedad_id')
        .eq('bloque_id', localCama.bloque_id)
        .eq('nombre', localCama.nombre)
        .single()

      if (findError || !serverCama) {
        console.log('No server cama found, no proyección available')
        setProyeccionData([])
        return
      }

      // Get variety name
      const varieties = await bloqueVariedadService.getVariedadesByBloque(bloqueId)
      const variety = varieties.find(v => v.variedad_id === localCama.variedad_id)
      const varietyName = variety?.variedad?.nombre || 'Variedad no asignada'

      // Get estados fenológicos for this variety
      const estadosFenologicos = await estadosFenologicosService.getAll()
      const estadoForVariety = estadosFenologicos.find((e: any) =>
        e.bloque_variedad_id === localCama.variedad_id
      )

      // Get acciones for this cama
      const acciones = await accionService.getAccionesByCama(serverCama.id)

      // Generate proyección data
      const proyecciones: Array<{
        fecha: string,
        finca: string,
        bloque: string,
        cama: string,
        variedad: string,
        etapa: string,
        produccion: number
      }> = []

      // Map of estado fenológico keys to their display names
      const estadoDisplayNames: Record<string, string> = {
        'arveja': 'Arveja',
        'garbanzo': 'Garbanzo',
        'uva': 'Uva',
        'arroz': 'Arroz',
        'rayando_color': 'Rayando Color',
        'sepalos_abiertos': 'Sépalos Abiertos',
        'cosecha': 'Cosecha'
      }

      // Process each accion
      acciones.forEach(accion => {
        // Check for each estado fenológico
        Object.keys(estadoDisplayNames).forEach(estadoKey => {
          // If this accion has a value for this estado
          if ((accion as any)[estadoKey] !== null && (accion as any)[estadoKey] !== undefined) {
            // Get the days until harvest for this estado
            const daysUntilHarvest = estadoForVariety ? (estadoForVariety as any)[estadoKey.toUpperCase()] : null

            if (daysUntilHarvest && typeof daysUntilHarvest === 'number') {
              // Calculate projected harvest date
              const accionDate = new Date(accion.created_at)
              const harvestDate = new Date(accionDate)
              harvestDate.setDate(accionDate.getDate() + daysUntilHarvest)

              proyecciones.push({
                fecha: harvestDate.toLocaleDateString('es-ES'),
                finca: fincaName,
                bloque: bloqueName,
                cama: camaName,
                variedad: varietyName,
                etapa: estadoDisplayNames[estadoKey],
                produccion: (accion as any)[estadoKey]
              })
            }
          }
        })
      })

      // Sort by date
      proyecciones.sort((a, b) => {
        const dateA = new Date(a.fecha.split('/').reverse().join('-'))
        const dateB = new Date(b.fecha.split('/').reverse().join('-'))
        return dateA.getTime() - dateB.getTime()
      })

      setProyeccionData(proyecciones)
    } catch (error) {
      console.error('Error loading proyección:', error)
      setProyeccionData([])
    } finally {
      setLoading(false)
    }
  }

  const handleDrawerOpen = (open: boolean) => {
    setIsDrawerOpen(open)
    if (open) {
      loadProyeccion()
    }
  }

  return (
    <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpen}>
      <DrawerTrigger asChild>
        <Button className="h-16 text-sm font-medium flex flex-col items-center justify-center gap-1 bg-purple-500 hover:bg-purple-600 text-white">
          <span>Proyección</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Proyección de Cosecha</DrawerTitle>
          <DrawerDescription>
            Proyección de cosecha basada en los estados fenológicos registrados
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>Cargando proyección...</p>
            </div>
          ) : proyeccionData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No hay datos de proyección disponibles</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Finca</TableHead>
                  <TableHead>Bloque</TableHead>
                  <TableHead>Cama</TableHead>
                  <TableHead>Variedad</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Producción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyeccionData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.fecha}</TableCell>
                    <TableCell>{row.finca}</TableCell>
                    <TableCell>{row.bloque}</TableCell>
                    <TableCell>{row.cama}</TableCell>
                    <TableCell>{row.variedad}</TableCell>
                    <TableCell>{row.etapa}</TableCell>
                    <TableCell className="text-right">{row.produccion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function CamaDetailComponent() {
  const { fincaId, fincaName, bloqueId, bloqueName, camaId, camaName } = useSearch({ from: '/app/cama-detail' })
  const navigate = useNavigate()

  const [varietyName, setVarietyName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [todaysValues, setTodaysValues] = useState<Record<string, number>>({})

  const handleActionSubmit = async (actionType: string, value: number) => {
    try {
      // Use offline-first approach
      if (navigator.onLine) {
        // If online, try to save directly to server first
        try {
          await accionService.createAccionForCama(camaId, actionType, value)
          console.log(`Successfully saved ${actionType}: ${value} for cama ${camaId} to server`)
        } catch (serverError) {
          console.warn('Failed to save to server, falling back to offline mode:', serverError)
          // If server save fails, save locally and queue for sync
          await offlineAccionService.createAccionForCama(camaId, actionType, value)
        }
      } else {
        // If offline, save locally and queue for sync
        await offlineAccionService.createAccionForCama(camaId, actionType, value)
        console.log(`Saved ${actionType}: ${value} for cama ${camaId} locally (offline mode)`)
      }

      // Refresh today's values after successful submission
      // Use offline service first to get local values, then try server if online
      let updatedValues: Record<string, number> = {}

      // Always get local values first for immediate feedback
      updatedValues = await offlineAccionService.getTodaysValuesByCama(camaId)

      // If online, try to get server values too and merge them
      if (navigator.onLine) {
        try {
          const serverValues = await accionService.getTodaysValuesByCama(camaId)
          // Merge values, with local values taking precedence
          updatedValues = { ...serverValues, ...updatedValues }
        } catch (error) {
          console.warn('Failed to get server values, using local values only:', error)
        }
      }

      setTodaysValues(updatedValues)
    } catch (error) {
      console.error('Error saving action:', error)
      throw error
    }
  }

  useEffect(() => {
    const fetchCamaDetails = async () => {
      try {
        setLoading(true)

        // Get all camas for this block to find our specific cama
        const camas = await camaService.getCamasByBloque(bloqueId)
        const cama = camas.find(c => c.id === camaId)

        if (!cama) {
          setError('Cama no encontrada')
          return
        }

        // Get variety information
        const varieties = await bloqueVariedadService.getVariedadesByBloque(bloqueId)
        const variety = varieties.find(v => v.variedad_id === cama.variedad_id)

        if (variety && variety.variedad) {
          setVarietyName(variety.variedad.nombre)
        } else {
          setVarietyName('Variedad no asignada')
        }

        // Get today's values for this cama using offline-first approach
        let values: Record<string, number> = {}

        // Always get local values first for immediate feedback
        values = await offlineAccionService.getTodaysValuesByCama(camaId)

        // If online, try to get server values too and merge them
        if (navigator.onLine) {
          try {
            const serverValues = await accionService.getTodaysValuesByCama(camaId)
            // Merge values, with local values taking precedence
            values = { ...serverValues, ...values }
          } catch (error) {
            console.warn('Failed to get server values, using local values only:', error)
          }
        }

        setTodaysValues(values)

      } catch (err) {
        console.error('Error fetching cama details:', err)
        setError('Error al cargar detalles de la cama')
      } finally {
        setLoading(false)
      }
    }

    fetchCamaDetails()
  }, [bloqueId, camaId])

  if (loading) {
    return (
      <div className='w-full h-full flex flex-col gap-2 p-2'>
        <div className="flex items-center justify-center relative">
          <ChevronLeft
            className="h-6 w-6 absolute left-2 cursor-pointer"
            onClick={() => navigate({
              to: '/app/camas',
              search: { fincaId, fincaName, bloqueId, bloqueName }
            })}
          />
          <h1 className="text-2xl text-zinc-500 font-thin">Cargando...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='w-full h-full flex flex-col gap-2 p-2'>
        <div className="flex items-center justify-center relative">
          <ChevronLeft
            className="h-6 w-6 absolute left-2 cursor-pointer"
            onClick={() => navigate({
              to: '/app/camas',
              search: { fincaId, fincaName, bloqueId, bloqueName }
            })}
          />
          <h1 className="text-2xl text-zinc-500 font-thin">Error</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({
            to: '/app/camas',
            search: { fincaId, fincaName, bloqueId, bloqueName }
          })}
        />
        <h1 className="text-2xl text-zinc-500 font-thin text-center">
          {fincaName} / {bloqueName} / Cama {camaName}
        </h1>
      </div>

      {/* Variety name centered */}
      <div className="text-center py-4">
        <h2 className="text-2xl text-zinc-500 font-thin">{varietyName}</h2>
      </div>

      {/* Actions grid - scrollable */}
      <div className='flex-1 overflow-y-auto'>
        <div className="grid grid-cols-2 gap-2 p-2">
          <ActionButton title="Producción Real" onActionSubmit={handleActionSubmit} currentValue={todaysValues.produccion_real} />
          <ActionButton title="Pinche Apertura" onActionSubmit={handleActionSubmit} currentValue={todaysValues.pinche_apertura} />
          <ActionButton title="Pinche Sanitario" onActionSubmit={handleActionSubmit} currentValue={todaysValues.pinche_sanitario} />
          <ActionButton title="Pinche Tierno" onActionSubmit={handleActionSubmit} currentValue={todaysValues.pinche_tierno} />
          <ActionButton title="Temperatura" onActionSubmit={handleActionSubmit} currentValue={todaysValues.temperatura} />
          <ActionButton title="Humedad" onActionSubmit={handleActionSubmit} currentValue={todaysValues.humedad} />
          <ActionButton title="Arveja" onActionSubmit={handleActionSubmit} currentValue={todaysValues.arveja} />
          <ActionButton title="Garbanzo" onActionSubmit={handleActionSubmit} currentValue={todaysValues.garbanzo} />
          <ActionButton title="Uva" onActionSubmit={handleActionSubmit} currentValue={todaysValues.uva} />
          <ActionButton title="Arroz" onActionSubmit={handleActionSubmit} currentValue={todaysValues.arroz} />
          <ActionButton title="Rayando Color" onActionSubmit={handleActionSubmit} currentValue={todaysValues.rayando_color} />
          <ActionButton title="Sépalos Abiertos" onActionSubmit={handleActionSubmit} currentValue={todaysValues.sepalos_abiertos} />
          <ActionButton title="Cosecha" onActionSubmit={handleActionSubmit} currentValue={todaysValues.cosecha} />
          <HistorialButton camaId={camaId} />
          <ProyeccionButton
            camaId={camaId}
            bloqueId={bloqueId}
            fincaName={fincaName}
            bloqueName={bloqueName}
            camaName={camaName}
          />
          {/* Test button for offline functionality */}
          <Button
            className="h-16 text-sm font-medium flex flex-col items-center justify-center gap-1 bg-gray-500 hover:bg-gray-600 text-white"
            onClick={() => runOfflineActionTest(camaId)}
          >
            <span>Test Offline</span>
            <span className="text-xs font-normal opacity-90">
              {navigator.onLine ? '🟢 Online' : '🟡 Offline'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}