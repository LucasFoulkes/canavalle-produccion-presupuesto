// Configuration for which observation types to show in mobile input
// Controls filtering of estado_fenologico_tipo options

export type ObservationTypeConfig = {
  // Start showing options from this type (inclusive)
  // Set to null to show all options
  startFromType: string | null

  // End showing options at this type (inclusive)
  // Set to null to show until the end
  endAtType: string | null

  // Alternative: specify exact types to include/exclude
  includeOnly?: string[]
  exclude?: string[]
}

export const OBSERVATION_TYPE_CONFIG: ObservationTypeConfig = {
  startFromType: 'arroz',
  endAtType: null,
  // includeOnly: ['arroz', 'arveja', 'garbanzo', 'uva', 'rayando_color', 'sepalos_abiertos', 'cosecha'],
  // exclude: ['brotacion', 'cincuenta_mm'],
}

/**
 * Filters observation types based on configuration
 * @param allTypes - All available observation types from database
 * @returns Filtered array of observation types
 */
export function filterObservationTypes(allTypes: any[]): any[] {
  const config = OBSERVATION_TYPE_CONFIG

  // If using includeOnly, return only those types
  if (config.includeOnly) {
    return allTypes.filter(type => config.includeOnly!.includes(type.codigo))
  }

  // If using exclude, filter out those types
  if (config.exclude) {
    return allTypes.filter(type => !config.exclude!.includes(type.codigo))
  }

  // Use startFromType and endAtType logic
  if (!config.startFromType && !config.endAtType) {
    return allTypes // Show all if no restrictions
  }

  // Sort by orden first
  const sortedTypes = allTypes.sort((a, b) => {
    const aOrden = Number(a.orden) || 0
    const bOrden = Number(b.orden) || 0
    return aOrden - bOrden
  })

  let startIndex = 0
  let endIndex = sortedTypes.length - 1

  // Find start index
  if (config.startFromType) {
    const startIdx = sortedTypes.findIndex(type => type.codigo === config.startFromType)
    if (startIdx !== -1) {
      startIndex = startIdx
    }
  }

  // Find end index
  if (config.endAtType) {
    const endIdx = sortedTypes.findIndex(type => type.codigo === config.endAtType)
    if (endIdx !== -1) {
      endIndex = endIdx
    }
  }

  return sortedTypes.slice(startIndex, endIndex + 1)
}