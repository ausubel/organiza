import type { Course, Settings } from './types'

export interface CourseSummary {
  totalWeight: number
  gradedWeight: number
  remainingWeight: number
  /** Promedio ponderado sobre lo ya evaluado. */
  currentAverage: number | null
  /** Nota final si se obtiene la mínima de la escala en lo restante. */
  guaranteedFinal: number
  /** Nota final proyectada asumiendo el promedio actual en lo restante. */
  projectedFinal: number | null
  neededToPass: number | null
  neededForGoal: number | null
}

export function summarizeCourse(course: Course, settings: Settings): CourseSummary {
  const totalWeight = course.components.reduce((sum, c) => sum + (c.weight || 0), 0)
  const graded = course.components.filter((c) => c.grade !== null)
  const gradedWeight = graded.reduce((sum, c) => sum + c.weight, 0)
  const earned = graded.reduce((sum, c) => sum + c.weight * (c.grade ?? 0), 0)
  const remainingWeight = totalWeight - gradedWeight

  const currentAverage = gradedWeight > 0 ? earned / gradedWeight : null
  const guaranteedFinal =
    totalWeight > 0 ? (earned + remainingWeight * settings.gradeScaleMin) / totalWeight : 0
  const projectedFinal =
    currentAverage !== null && totalWeight > 0
      ? (earned + remainingWeight * currentAverage) / totalWeight
      : null

  const needed = (target: number) =>
    remainingWeight > 0 ? (target * totalWeight - earned) / remainingWeight : null

  return {
    totalWeight,
    gradedWeight,
    remainingWeight,
    currentAverage,
    guaranteedFinal,
    projectedFinal,
    neededToPass: needed(course.passingGrade),
    neededForGoal: needed(course.goalGrade),
  }
}

export type NeedStatus = 'secured' | 'reachable' | 'hard' | 'impossible' | 'closed'

export function needStatus(
  needed: number | null,
  finalIfClosed: number,
  target: number,
  settings: Settings,
): NeedStatus {
  if (needed === null) return finalIfClosed >= target ? 'secured' : 'closed'
  if (needed <= settings.gradeScaleMin) return 'secured'
  if (needed > settings.gradeScaleMax) return 'impossible'
  const range = settings.gradeScaleMax - settings.gradeScaleMin
  if (needed > settings.gradeScaleMin + range * 0.8) return 'hard'
  return 'reachable'
}

export function formatGrade(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return '—'
  return value.toFixed(digits).replace(/\.?0+$/, '') || '0'
}

export type AttendanceLevel = 'ok' | 'warning' | 'danger' | 'dpi'

export function attendanceLevel(course: Course): { ratio: number; level: AttendanceLevel } {
  const ratio = course.maxAbsences > 0 ? course.absences / course.maxAbsences : 0
  let level: AttendanceLevel = 'ok'
  if (ratio >= 1) level = 'dpi'
  else if (ratio >= 0.8) level = 'danger'
  else if (ratio >= 0.7) level = 'warning'
  return { ratio, level }
}
