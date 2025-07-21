import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, Search, X, CalendarIcon, BarChart3, Table as TableIcon, TrendingUp } from 'lucide-react'
import { accionService } from '@/services/accion.service'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const Route = createFileRoute('/app/reportes')({
  component: ReportesComponent,
})

interface AccionWithRelations {
  id: number
  created_at: string
  produccion_real?: number
  pinche_apertura?: number
  pinche_sanitario?: number
  pinche_tierno?: number
  temperatura?: number
  humedad?: number
  arveja?: number
  garbanzo?: number
  uva?: number
  arroz?: number
  rayando_color?: number
  sepalos_abiertos?: number
  cosecha?: number
  cama_id?: number
  finca_nombre?: string
  bloque_nombre?: string
  variedad_nombre?: string
  cama_nombre?: string
}

interface Projection {
  fecha: string
  fechaObj: Date
  finca: string
  bloque: string
  cama: string
  variedad: string
  produccion: number
}

type GroupByOption = 'cama' | 'variedad';

function ReportesComponent() {
  const navigate = useNavigate()
  const [acciones, setAcciones] = useState<AccionWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [harvestProjections, setHarvestProjections] = useState<Projection[]>([])
  const [filteredProjections, setFilteredProjections] = useState<Projection[]>([])

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [searchVariedad, setSearchVariedad] = useState<string>('')
  const [selectedFinca, setSelectedFinca] = useState<string>('all')
  const [selectedBloque, setSelectedBloque] = useState<string>('all')
  const [isWeeklyView, setIsWeeklyView] = useState<boolean>(false)
  const [groupBy, setGroupBy] = useState<GroupByOption>('cama')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  // Days to harvest mapping for each phenological stage
  const daysToHarvestMap: Record<string, number> = {
    'arveja': 15,        // Arveja stage takes 15 days to harvest
    'garbanzo': 20,      // Garbanzo stage takes 20 days to harvest
    'uva': 25,           // Uva stage takes 25 days to harvest
    'arroz': 30,         // Arroz stage takes 30 days to harvest
    'rayando_color': 10, // Rayando Color stage takes 10 days to harvest
    'sepalos_abiertos': 5, // Sépalos Abiertos stage takes 5 days to harvest
  }

  useEffect(() => {
    const fetchAcciones = async () => {
      try {
        setLoading(true)
        const data = await accionService.getAllAccionesWithRelations()
        setAcciones(data)

        // Generate harvest projections
        const projections: Projection[] = []

        data.forEach(accion => {
          const baseDate = new Date(accion.created_at)

          // Check each phenological stage that has a value
          Object.keys(daysToHarvestMap).forEach(stage => {
            const value = accion[stage as keyof AccionWithRelations] as number
            if (value && value > 0) {
              const daysToAdd = daysToHarvestMap[stage]
              const harvestDate = new Date(baseDate)
              harvestDate.setDate(harvestDate.getDate() + daysToAdd)

              projections.push({
                fecha: format(harvestDate, 'dd/MM/yyyy', { locale: es }),
                fechaObj: harvestDate,
                finca: accion.finca_nombre || 'N/A',
                bloque: accion.bloque_nombre || 'N/A',
                cama: accion.cama_nombre || 'N/A',
                variedad: accion.variedad_nombre || 'N/A',
                produccion: value
              })
            }
          })
        })

        // Sort by harvest date
        projections.sort((a, b) => a.fechaObj.getTime() - b.fechaObj.getTime())

        setHarvestProjections(projections)
        setFilteredProjections(projections)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    fetchAcciones()
  }, [])

  // Get unique fincas and bloques for filter dropdowns
  const uniqueFincas = useMemo(() => {
    const fincas = [...new Set(harvestProjections.map(p => p.finca))].filter(f => f !== 'N/A');
    return fincas.sort();
  }, [harvestProjections]);

  const uniqueBloques = useMemo(() => {
    let bloques = harvestProjections;

    // Filter by selected finca first if one is selected
    if (selectedFinca && selectedFinca !== 'all') {
      bloques = bloques.filter(p => p.finca === selectedFinca);
    }

    const uniqueBloquesSet = [...new Set(bloques.map(p => p.bloque))].filter(b => b !== 'N/A');
    return uniqueBloquesSet.sort();
  }, [harvestProjections, selectedFinca]);

  // Apply filters when any filter changes
  useEffect(() => {
    let filtered = [...harvestProjections];

    // Apply date range filter
    if (startDate) {
      filtered = filtered.filter(item => item.fechaObj >= startDate);
    }

    if (endDate) {
      // Set time to end of day for inclusive filtering
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => item.fechaObj <= endOfDay);
    }

    // Apply finca filter
    if (selectedFinca && selectedFinca !== 'all') {
      filtered = filtered.filter(item => item.finca === selectedFinca);
    }

    // Apply bloque filter
    if (selectedBloque && selectedBloque !== 'all') {
      filtered = filtered.filter(item => item.bloque === selectedBloque);
    }

    // Apply variedad search filter
    if (searchVariedad) {
      const searchLower = searchVariedad.toLowerCase();
      filtered = filtered.filter(item =>
        item.variedad.toLowerCase().includes(searchLower)
      );
    }

    setFilteredProjections(filtered);
  }, [harvestProjections, startDate, endDate, selectedFinca, selectedBloque, searchVariedad]);

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedFinca('all');
    setSelectedBloque('all');
    setSearchVariedad('');
    setFilteredProjections(harvestProjections);
  };

  // Handle finca change - clear bloque when finca changes
  const handleFincaChange = (value: string) => {
    setSelectedFinca(value);
    setSelectedBloque('all'); // Reset bloque selection when finca changes
  };

  // Process projections based on grouping and weekly view settings
  const processedProjections = useMemo(() => {
    let processed = [...filteredProjections];

    // Group by selected option
    if (groupBy === 'variedad') {
      const grouped: Record<string, Projection> = {};

      processed.forEach(projection => {
        // Create a key based on grouping option
        const key = isWeeklyView
          ? `${format(startOfWeek(projection.fechaObj, { weekStartsOn: 1 }), 'yyyy-MM-dd')}-${projection.finca}-${projection.bloque}-${projection.variedad}`
          : `${projection.fecha}-${projection.finca}-${projection.bloque}-${projection.variedad}`;

        if (grouped[key]) {
          // Add to existing group's production
          grouped[key].produccion += projection.produccion;
        } else {
          // Create new group entry (omit cama for variedad grouping)
          grouped[key] = {
            ...projection,
            cama: 'Todas', // When grouping by variedad, we combine all camas
          };

          // Update date format for weekly view
          if (isWeeklyView) {
            const weekStart = startOfWeek(projection.fechaObj, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(projection.fechaObj, { weekStartsOn: 1 });
            grouped[key].fecha = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
          }
        }
      });

      processed = Object.values(grouped);
    }
    // If grouping by cama (default) and weekly view is enabled
    else if (isWeeklyView) {
      const grouped: Record<string, Projection> = {};

      processed.forEach(projection => {
        const weekStart = startOfWeek(projection.fechaObj, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(projection.fechaObj, { weekStartsOn: 1 });
        const key = `${format(weekStart, 'yyyy-MM-dd')}-${projection.finca}-${projection.bloque}-${projection.cama}-${projection.variedad}`;

        if (grouped[key]) {
          grouped[key].produccion += projection.produccion;
        } else {
          grouped[key] = {
            ...projection,
            fecha: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`,
          };
        }
      });

      processed = Object.values(grouped);
    }

    // Sort by date
    return processed.sort((a, b) => a.fechaObj.getTime() - b.fechaObj.getTime());
  }, [filteredProjections, isWeeklyView, groupBy]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Group data by date for the main production chart
    const dateGroups: Record<string, number> = {};

    processedProjections.forEach(projection => {
      const dateKey = projection.fecha;
      dateGroups[dateKey] = (dateGroups[dateKey] || 0) + projection.produccion;
    });

    const mainChartData = Object.entries(dateGroups).map(([fecha, produccion]) => ({
      fecha,
      produccion
    })).sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.fecha.split('/').reverse().join('-'));
      const dateB = new Date(b.fecha.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });

    // Group data by bloque/variedad for the secondary chart
    const groupKey = groupBy === 'variedad' ? 'variedad' : 'bloque';
    const secondaryGroups: Record<string, Record<string, number>> = {};

    processedProjections.forEach(projection => {
      const dateKey = projection.fecha;
      const groupValue = projection[groupKey];

      if (!secondaryGroups[dateKey]) {
        secondaryGroups[dateKey] = {};
      }

      secondaryGroups[dateKey][groupValue] = (secondaryGroups[dateKey][groupValue] || 0) + projection.produccion;
    });

    // Convert to chart format
    const secondaryChartData = Object.entries(secondaryGroups).map(([fecha, groups]) => ({
      fecha,
      ...groups
    })).sort((a, b) => {
      const dateA = new Date(a.fecha.split('/').reverse().join('-'));
      const dateB = new Date(b.fecha.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });

    // Get unique group values for chart colors
    const uniqueGroups = [...new Set(processedProjections.map(p => p[groupKey]))];

    return {
      mainChartData,
      secondaryChartData,
      uniqueGroups
    };
  }, [processedProjections, groupBy]);

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({ to: '/app' })}
        />
        <h1 className="text-2xl text-zinc-500 font-thin">
          Proyección de Cosecha
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div className="flex items-end gap-2">
          <div>
            <label className="text-sm font-medium block mb-1">Fecha Inicio</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-[180px] justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Fecha Fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-[180px] justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Finca</label>
          <Select value={selectedFinca} onValueChange={handleFincaChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueFincas.map(finca => (
                <SelectItem key={finca} value={finca}>{finca}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Bloque</label>
          <Select value={selectedBloque} onValueChange={setSelectedBloque}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueBloques.map(bloque => (
                <SelectItem key={bloque} value={bloque}>{bloque}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="searchVariedad" className="text-sm font-medium block mb-1">Buscar Variedad</label>
          <div className="relative">
            <Input
              id="searchVariedad"
              type="text"
              placeholder="Buscar por variedad..."
              value={searchVariedad}
              onChange={(e) => setSearchVariedad(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Agrupar por</label>
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cama">Cama</SelectItem>
              <SelectItem value="variedad">Variedad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={isWeeklyView ? "default" : "outline"}
          onClick={() => setIsWeeklyView(!isWeeklyView)}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          {isWeeklyView ? "Vista Semanal" : "Vista Diaria"}
        </Button>

        <Button
          variant={viewMode === 'chart' ? "default" : "outline"}
          onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
          className="flex items-center gap-2"
        >
          {viewMode === 'chart' ? <TableIcon className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
          {viewMode === 'chart' ? "Ver Tabla" : "Ver Gráficos"}
        </Button>

        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Limpiar Filtros
        </Button>
      </div>

      <div className='flex-1 overflow-hidden'>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p>Cargando proyecciones...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && viewMode === 'table' && (
          <div className="h-full overflow-auto border rounded-lg">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 bg-background border-b z-10">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs">
                    Fecha
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs">
                    Finca
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs">
                    Bloque
                  </th>
                  {groupBy === 'cama' && (
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs">
                      Cama
                    </th>
                  )}
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs">
                    Variedad
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap text-xs">
                    Producción
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedProjections.length === 0 ? (
                  <tr>
                    <td colSpan={groupBy === 'cama' ? 6 : 5} className="p-4 text-center py-8">
                      {harvestProjections.length === 0 ?
                        "No hay proyecciones de cosecha disponibles" :
                        "No hay resultados para los filtros seleccionados"}
                    </td>
                  </tr>
                ) : (
                  processedProjections.map((projection, index) => (
                    <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle whitespace-nowrap text-sm">
                        {projection.fecha}
                      </td>
                      <td className="p-4 align-middle whitespace-nowrap text-sm">
                        {projection.finca}
                      </td>
                      <td className="p-4 align-middle whitespace-nowrap text-sm">
                        {projection.bloque}
                      </td>
                      {groupBy === 'cama' && (
                        <td className="p-4 align-middle whitespace-nowrap text-sm">
                          {projection.cama}
                        </td>
                      )}
                      <td className="p-4 align-middle whitespace-nowrap text-sm">
                        {projection.variedad}
                      </td>
                      <td className="p-4 align-middle whitespace-nowrap text-sm">
                        {projection.produccion}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && viewMode === 'chart' && (
          <div className="h-full overflow-auto p-4 space-y-6">
            {processedProjections.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {harvestProjections.length === 0 ?
                    "No hay proyecciones de cosecha disponibles para mostrar en gráficos" :
                    "No hay resultados para los filtros seleccionados"}
                </p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Producción Proyectada en el Tiempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      produccion: {
                        label: "Producción",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                  >
                    <BarChart
                      accessibilityLayer
                      data={chartData.mainChartData}
                      margin={{
                        top: 20,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="fecha"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 5)}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="produccion"
                        fill="var(--color-produccion)"
                        radius={8}
                      >
                        <LabelList
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}