import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { accionService } from '@/services/accion.service'
import { estadosFenologicosService, EstadoFenologicoWithRelations } from '@/services/estados-fenologicos.service'
import { ChevronLeft, Check, ChevronsUpDown, RefreshCw, Calendar as CalendarIcon, CalendarDays, Layers, Rows } from 'lucide-react'
import { DynamicTable } from '@/components/DynamicTable'
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TransformedAccion {
  fecha_produccion?: string  // Date + estado_valor days
  finca: string
  bloque: string
  cama: string
  variedad: string
  produccion: number
}

export const Route = createFileRoute('/app/reportes')({
  component: reportes,
})

function reportes() {
  const navigate = useNavigate()
  const [acciones, setAcciones] = useState<TransformedAccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Combobox states
  const [openFinca, setOpenFinca] = useState(false)
  const [openBloque, setOpenBloque] = useState(false)
  const [openVariedad, setOpenVariedad] = useState(false)
  const [selectedFinca, setSelectedFinca] = useState<string>("")
  const [selectedBloque, setSelectedBloque] = useState<string>("")
  const [selectedVariedad, setSelectedVariedad] = useState<string>("")

  // Date picker states
  const [openStartDate, setOpenStartDate] = useState(false)
  const [openEndDate, setOpenEndDate] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  // Aggregation toggles
  const [weeklyAggregation, setWeeklyAggregation] = useState(false)
  const [varietyAggregation, setVarietyAggregation] = useState(false)


  useEffect(() => {
    async function fetchData() {
      try {
        const [accionesData, estadosData] = await Promise.all([
          accionService.getAll(),
          estadosFenologicosService.getAll()
        ])
        const actionColumns = ['arveja', 'garbanzo', 'uva', 'arroz', 'rayando_color', 'sepalos_abiertos', 'cosecha']
        const columns = ['brotacion', '5_cm', '15_cm', '20_cm', 'primera_hoja', 'espiga', 'arroz', 'arveja', 'garbanzo', 'uva', 'rayando_color', 'sepalos_abiertos', 'cosecha']
        const transformedEstados = estadosData.map(estado => {
          const vals = columns.map(col => (estado as any)[col] ?? 0)
          const suffixSums = vals.reduceRight((acc, val) => [val + (acc[0] ?? 0), ...acc], [])
          const newEstado = { ...estado } as any
          columns.forEach((col, idx) => { newEstado[col] = suffixSums[idx] })
          return newEstado as EstadoFenologicoWithRelations
        })

        const transformedAcciones = accionesData.flatMap(accion => {
          const baseRow = {
            finca: accion.finca_nombre || '',
            bloque: accion.bloque_nombre || '',
            cama: accion.cama_nombre || '',
            variedad: accion.variedad_nombre || ''
          }

          const estadoFenologico = transformedEstados.find(estado =>
            estado.bloque_nombre === accion.bloque_nombre &&
            estado.variedad_nombre === accion.variedad_nombre
          )

          return actionColumns
            .filter(col => (accion as any)[col] != null && (accion as any)[col] !== 0)
            .map(col => {
              const estadoValor = estadoFenologico ? (estadoFenologico as any)[col] : undefined
              const baseDate = new Date(accion.created_at || new Date().toISOString())
              const fechaProduccion = estadoValor ?
                new Date(baseDate.getTime() + estadoValor * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                undefined

              return {
                fecha_produccion: fechaProduccion,
                ...baseRow,
                produccion: (accion as any)[col],
              }
            })
        })

        setAcciones(transformedAcciones)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Extract unique fincas, bloques, and variedades for comboboxes
  const { fincas, bloquesByFinca, variedadesByBloque } = useMemo(() => {
    if (!acciones.length) return {
      fincas: [],
      bloquesByFinca: {},
      variedadesByBloque: {}
    };

    const fincaSet = new Set<string>();
    const bloqueMap: Record<string, Set<string>> = {};
    const variedadMap: Record<string, Set<string>> = {};

    acciones.forEach(accion => {
      if (accion.finca) {
        fincaSet.add(accion.finca);

        // Track bloques for each finca
        if (!bloqueMap[accion.finca]) {
          bloqueMap[accion.finca] = new Set<string>();
        }

        if (accion.bloque) {
          bloqueMap[accion.finca].add(accion.bloque);

          // Track variedades for each bloque
          const bloqueKey = `${accion.finca}:${accion.bloque}`;
          if (!variedadMap[bloqueKey]) {
            variedadMap[bloqueKey] = new Set<string>();
          }

          if (accion.variedad) {
            variedadMap[bloqueKey].add(accion.variedad);
          }
        }
      }
    });

    // Convert sets to sorted arrays
    const bloquesByFinca: Record<string, string[]> = {};
    Object.keys(bloqueMap).forEach(finca => {
      bloquesByFinca[finca] = Array.from(bloqueMap[finca]).sort();
    });

    const variedadesByBloque: Record<string, string[]> = {};
    Object.keys(variedadMap).forEach(bloqueKey => {
      variedadesByBloque[bloqueKey] = Array.from(variedadMap[bloqueKey]).sort();
    });

    return {
      fincas: Array.from(fincaSet).sort(),
      bloquesByFinca,
      variedadesByBloque
    };
  }, [acciones]);

  // Get available bloques based on selected finca
  const availableBloques = useMemo(() => {
    if (!selectedFinca) return [];
    return bloquesByFinca[selectedFinca] || [];
  }, [selectedFinca, bloquesByFinca]);

  // Get available variedades based on selected finca and bloque
  const availableVariedades = useMemo(() => {
    if (!selectedFinca || !selectedBloque) return [];
    const bloqueKey = `${selectedFinca}:${selectedBloque}`;
    return variedadesByBloque[bloqueKey] || [];
  }, [selectedFinca, selectedBloque, variedadesByBloque]);

  // Filter data based on search, selected finca, bloque, variedad, and date range
  const filteredData = useMemo(() => {
    if (!selectedFinca && !selectedBloque && !selectedVariedad && !searchQuery && !startDate && !endDate) return acciones;

    return acciones.filter(accion => {
      // Filter by selected finca if any
      if (selectedFinca && accion.finca !== selectedFinca) {
        return false;
      }

      // Filter by selected bloque if any
      if (selectedBloque && accion.bloque !== selectedBloque) {
        return false;
      }

      // Filter by selected variedad if any
      if (selectedVariedad && accion.variedad !== selectedVariedad) {
        return false;
      }

      // Filter by date range if any
      if (startDate || endDate) {
        const fechaProduccion = accion.fecha_produccion ? new Date(accion.fecha_produccion) : undefined;

        if (!fechaProduccion) {
          return false;
        }

        if (startDate && fechaProduccion < startDate) {
          return false;
        }

        if (endDate) {
          // Set end date to end of day for inclusive comparison
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);

          if (fechaProduccion > endOfDay) {
            return false;
          }
        }
      }

      // Filter by search query if any
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          accion.finca?.toLowerCase().includes(query) ||
          accion.bloque?.toLowerCase().includes(query) ||
          accion.cama?.toLowerCase().includes(query) ||
          accion.variedad?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [acciones, selectedFinca, selectedBloque, selectedVariedad, searchQuery, startDate, endDate]);

  // Aggregate data by week and/or variety
  const displayData = useMemo(() => {
    let dataToProcess = filteredData;

    // Step 1: Apply weekly aggregation if enabled
    if (weeklyAggregation) {
      const weeklyData = new Map<string, TransformedAccion>();

      filteredData.forEach(accion => {
        if (!accion.fecha_produccion) return;

        const date = parseISO(accion.fecha_produccion);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday as week start
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

        // Format the date without "Semana" prefix
        const weekDateStr = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;

        // Create a unique key based on aggregation level
        let key: string;

        if (varietyAggregation) {
          // Group by week + variedad only (ignore finca, bloque, cama)
          key = `${format(weekStart, 'yyyy-MM-dd')}_${accion.variedad}`;
        } else {
          // Group by week + all fields
          key = `${format(weekStart, 'yyyy-MM-dd')}_${accion.finca}_${accion.bloque}_${accion.variedad}_${accion.cama}`;
        }

        if (weeklyData.has(key)) {
          // Add to existing week data
          const existingData = weeklyData.get(key)!;
          weeklyData.set(key, {
            ...existingData,
            produccion: existingData.produccion + accion.produccion
          });
        } else {
          // Create new week data
          weeklyData.set(key, {
            fecha_produccion: weekDateStr,
            finca: accion.finca,
            bloque: accion.bloque,
            variedad: accion.variedad,
            cama: varietyAggregation ? 'Todas' : accion.cama,
            produccion: accion.produccion
          });
        }
      });

      dataToProcess = Array.from(weeklyData.values());
    }
    // Step 2: Apply variety aggregation if enabled and weekly aggregation is not
    else if (varietyAggregation) {
      const varietyData = new Map<string, TransformedAccion>();

      filteredData.forEach(accion => {
        if (!accion.fecha_produccion) return;

        // Create a unique key for this date + variedad combination only
        const key = `${accion.fecha_produccion}_${accion.variedad}`;

        if (varietyData.has(key)) {
          // Add to existing data
          const existingData = varietyData.get(key)!;
          varietyData.set(key, {
            ...existingData,
            produccion: existingData.produccion + accion.produccion
          });
        } else {
          // Create new data
          varietyData.set(key, {
            fecha_produccion: accion.fecha_produccion,
            finca: accion.finca,
            bloque: accion.bloque,
            variedad: accion.variedad,
            cama: 'Todas', // Aggregate all camas
            produccion: accion.produccion
          });
        }
      });

      dataToProcess = Array.from(varietyData.values());
    }

    return dataToProcess;
  }, [filteredData, weeklyAggregation, varietyAggregation]);

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error?.message ?? 'Unknown'}</div>

  return (
    <div className='w-full h-full flex flex-col gap-2 p-2'>
      <div className="flex items-center justify-center relative">
        <ChevronLeft
          className="h-6 w-6 absolute left-2 cursor-pointer"
          onClick={() => navigate({ to: '/app' })}
        />
        <h1 className='capitalize text-2xl text-zinc-500 font-thin'>
          Reportes
        </h1>
      </div>

      {/* Filter Controls */}
      <div className="w-full mb-2 grid grid-cols-2 gap-2">
        {/* Row 1: Finca and Bloque */}
        <Popover open={openFinca} onOpenChange={setOpenFinca}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openFinca}
              className="w-full justify-between"
            >
              {selectedFinca ? selectedFinca : "Seleccionar finca..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar finca..." />
              <CommandList>
                <CommandEmpty>No se encontraron fincas.</CommandEmpty>
                <CommandGroup>
                  {fincas.map((finca) => (
                    <CommandItem
                      key={finca}
                      value={finca}
                      onSelect={(currentValue) => {
                        // If selecting the same finca, clear it
                        if (selectedFinca === currentValue) {
                          setSelectedFinca("");
                          setSelectedBloque(""); // Also clear bloque selection
                          setSelectedVariedad(""); // Also clear variedad selection
                        } else {
                          setSelectedFinca(currentValue);
                          setSelectedBloque(""); // Reset bloque when changing finca
                          setSelectedVariedad(""); // Reset variedad when changing finca
                        }
                        setOpenFinca(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedFinca === finca ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {finca}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover
          open={openBloque}
          onOpenChange={selectedFinca ? setOpenBloque : undefined}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openBloque}
              className="w-full justify-between"
              disabled={!selectedFinca}
            >
              {selectedBloque ? selectedBloque : "Seleccionar bloque..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar bloque..." />
              <CommandList>
                <CommandEmpty>No se encontraron bloques.</CommandEmpty>
                <CommandGroup>
                  {availableBloques.map((bloque) => (
                    <CommandItem
                      key={bloque}
                      value={bloque}
                      onSelect={(currentValue) => {
                        if (selectedBloque === currentValue) {
                          setSelectedBloque("");
                          setSelectedVariedad(""); // Also clear variedad when clearing bloque
                        } else {
                          setSelectedBloque(currentValue);
                          setSelectedVariedad(""); // Reset variedad when changing bloque
                        }
                        setOpenBloque(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedBloque === bloque ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {bloque}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Row 2: Variedad */}
        <Popover
          open={openVariedad}
          onOpenChange={selectedBloque ? setOpenVariedad : undefined}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openVariedad}
              className="w-full justify-between"
              disabled={!selectedBloque}
            >
              {selectedVariedad ? selectedVariedad : "Seleccionar variedad..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar variedad..." />
              <CommandList>
                <CommandEmpty>No se encontraron variedades.</CommandEmpty>
                <CommandGroup>
                  {availableVariedades.map((variedad) => (
                    <CommandItem
                      key={variedad}
                      value={variedad}
                      onSelect={(currentValue) => {
                        setSelectedVariedad(selectedVariedad === currentValue ? "" : currentValue);
                        setOpenVariedad(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedVariedad === variedad ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {variedad}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear filters button - circular with refresh icon */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setSelectedFinca("");
            setSelectedBloque("");
            setSelectedVariedad("");
            setSearchQuery("");
            setStartDate(undefined);
            setEndDate(undefined);
          }}
          className="rounded-full h-10 w-10 flex items-center justify-center"
          title="Limpiar filtros"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Row 3: Date Range Pickers */}
        <div className="col-span-2 grid grid-cols-2 gap-2">
          {/* Start Date Picker */}
          <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP", { locale: es }) : "Fecha inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  setOpenStartDate(false);
                }}
              />
            </PopoverContent>
          </Popover>

          {/* End Date Picker */}
          <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: es }) : "Fecha final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  setEndDate(date);
                  setOpenEndDate(false);
                }}
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 4: Aggregation Buttons */}
        <div className="col-span-2 flex justify-center gap-4">
          {/* Time Aggregation Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeeklyAggregation(!weeklyAggregation)}
            className="flex items-center gap-1"
          >
            {weeklyAggregation ? (
              <>
                <CalendarIcon className="h-4 w-4" />
                <span>Mostrar por día</span>
              </>
            ) : (
              <>
                <CalendarDays className="h-4 w-4" />
                <span>Mostrar por semana</span>
              </>
            )}
          </Button>

          {/* Variety Aggregation Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVarietyAggregation(!varietyAggregation)}
            className="flex items-center gap-1"
          >
            {varietyAggregation ? (
              <>
                <Rows className="h-4 w-4" />
                <span>Mostrar detalle</span>
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                <span>Agrupar por variedad</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto relative border rounded-md'>
        <DynamicTable
          data={displayData}
          hiddenColumns={['id', 'cama_id']}
        />
      </div>
    </div>
  )
}