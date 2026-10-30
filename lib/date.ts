export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const pad = (n: number) => String(n).padStart(2, '0')

export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toLocalDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseLocal(value: string): Date {
  return new Date(value)
}

/** Monday-based weekday index (0 = Lunes). */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

const dueFormatter = new Intl.DateTimeFormat('es', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDue(value: string): string {
  return dueFormatter.format(parseLocal(value))
}

export function relativeDue(value: string, now = new Date()): string {
  const diffMs = parseLocal(value).getTime() - now.getTime()
  const hours = diffMs / 36e5
  if (hours < 0) {
    const days = Math.floor(-hours / 24)
    return days === 0 ? 'Vencida hoy' : `Vencida hace ${days} d`
  }
  if (hours < 24) return `En ${Math.max(1, Math.round(hours))} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Mañana' : `En ${days} días`
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
