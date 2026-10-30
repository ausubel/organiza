import { mondayIndex, parseLocal } from './date'
import type { Course, ScheduleBlock, Task } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

function utcStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function floatingStamp(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** RFC 5545: lines must be folded at 75 octets. */
function fold(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74
    if (encoder.encode(current + char).length > limit) {
      parts.push(current)
      current = char
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts.join('\r\n ')
}

interface ExportOptions {
  tasks: Task[]
  courses: Course[]
  blocks?: ScheduleBlock[]
  blocksFrom?: Date
  blocksUntil?: Date
  reminderHours?: number
}

export function buildCalendar({
  tasks,
  courses,
  blocks = [],
  blocksFrom = new Date(),
  blocksUntil,
  reminderHours = 24,
}: ExportOptions): string {
  const courseName = (id: string | null) => courses.find((c) => c.id === id)?.name ?? 'General'
  const now = utcStamp(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MiSemestre//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MiSemestre',
  ]

  for (const task of tasks) {
    const start = parseLocal(task.dueDate)
    const end = new Date(start.getTime() + (task.kind === 'examen' ? 2 : 1) * 36e5)
    const prefix = task.kind === 'examen' ? 'Examen' : 'Entrega'
    lines.push(
      'BEGIN:VEVENT',
      `UID:${task.id}@misemestre.app`,
      `DTSTAMP:${now}`,
      `DTSTART:${utcStamp(start)}`,
      `DTEND:${utcStamp(end)}`,
      `SUMMARY:${escapeText(`${prefix}: ${task.title}`)}`,
      `DESCRIPTION:${escapeText(`Asignatura: ${courseName(task.courseId)}\nPeso: ${task.weight}%`)}`,
      `CATEGORIES:${escapeText(courseName(task.courseId))}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(task.title)}`,
      `TRIGGER:-PT${reminderHours}H`,
      'END:VALARM',
      'END:VEVENT',
    )
  }

  if (blocks.length && blocksUntil) {
    const until = new Date(blocksUntil)
    until.setHours(23, 59, 59)
    for (const block of blocks) {
      const first = new Date(blocksFrom)
      first.setDate(first.getDate() + ((block.day - mondayIndex(first) + 7) % 7))
      const [sh, sm] = block.start.split(':').map(Number)
      const [eh, em] = block.end.split(':').map(Number)
      const start = new Date(first)
      start.setHours(sh, sm, 0, 0)
      const end = new Date(first)
      end.setHours(eh, em, 0, 0)
      lines.push(
        'BEGIN:VEVENT',
        `UID:${block.id}@misemestre.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${floatingStamp(start)}`,
        `DTEND:${floatingStamp(end)}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${utcStamp(until)}`,
        `SUMMARY:${escapeText(`${block.kind === 'clase' ? 'Clase' : 'Estudio'}: ${block.title}`)}`,
        ...(block.location ? [`LOCATION:${escapeText(block.location)}`] : []),
        'END:VEVENT',
      )
    }
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
