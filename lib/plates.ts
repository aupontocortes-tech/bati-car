export type Location = 'Loja' | 'Lava-jato'
export type PlateStatus = 'Lida' | 'Manual'

export type Plate = {
  id: number
  value: string
  location: Location
  status: PlateStatus
  time: string
  date: string
}

export const LOCATIONS: Location[] = ['Loja', 'Lava-jato']

export function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

export function isLocation(value: string): value is Location {
  return LOCATIONS.includes(value as Location)
}

export function emptyPlates(): Record<Location, Plate[]> {
  return { Loja: [], 'Lava-jato': [] }
}

export function groupPlates(plates: Plate[]): Record<Location, Plate[]> {
  const grouped = emptyPlates()
  for (const plate of plates) grouped[plate.location].push(plate)
  return grouped
}

export function formatReadTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}
