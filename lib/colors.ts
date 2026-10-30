import type { Course, CourseColor } from './types'

export const COURSE_COLORS: Record<CourseColor, { label: string; value: string }> = {
  indigo: { label: 'Índigo', value: 'oklch(0.58 0.17 268)' },
  teal: { label: 'Turquesa', value: 'oklch(0.62 0.11 185)' },
  amber: { label: 'Ámbar', value: 'oklch(0.74 0.15 70)' },
  rose: { label: 'Rosa', value: 'oklch(0.63 0.19 10)' },
  sky: { label: 'Cielo', value: 'oklch(0.66 0.13 235)' },
  lime: { label: 'Lima', value: 'oklch(0.7 0.16 135)' },
  violet: { label: 'Violeta', value: 'oklch(0.58 0.19 305)' },
  orange: { label: 'Naranja', value: 'oklch(0.68 0.17 45)' },
}

export const NEUTRAL_COLOR = 'oklch(0.6 0.01 260)'

export function courseColor(course: Course | undefined | null): string {
  return course ? COURSE_COLORS[course.color]?.value ?? NEUTRAL_COLOR : NEUTRAL_COLOR
}
