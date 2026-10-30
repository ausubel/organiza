import { parseLocal } from './date'
import type { Priority, Task } from './types'

export interface PriorityResult {
  level: Priority
  score: number
  daysLeft: number
  overdue: boolean
}

const HORIZON_DAYS = 21
const MAX_WEIGHT = 40

/**
 * Semáforo de priorización.
 * score = 65% proximidad (0 a 21 días) + 35% peso (saturado al 40% de la nota).
 * Urgente: < 2 días o score ≥ 0.7 · Moderado: < 7 días o score ≥ 0.45 · Planificado: resto.
 */
export function getPriority(task: Task, now = new Date()): PriorityResult | null {
  if (task.status === 'done') return null
  const daysLeft = (parseLocal(task.dueDate).getTime() - now.getTime()) / 864e5
  const proximity = Math.min(1, Math.max(0, 1 - daysLeft / HORIZON_DAYS))
  const weightFactor = Math.min(1, Math.max(0, task.weight / MAX_WEIGHT))
  const score = proximity * 0.65 + weightFactor * 0.35

  let level: Priority = 'planned'
  if (daysLeft < 2 || score >= 0.7) level = 'urgent'
  else if (daysLeft < 7 || score >= 0.45) level = 'moderate'

  return { level, score, daysLeft, overdue: daysLeft < 0 }
}

export const PRIORITY_META: Record<Priority, { label: string; className: string; dot: string }> = {
  urgent: {
    label: 'Urgente',
    className: 'bg-urgent/12 text-urgent border-urgent/25',
    dot: 'bg-urgent',
  },
  moderate: {
    label: 'Moderado',
    className: 'bg-moderate/15 text-moderate-foreground border-moderate/30',
    dot: 'bg-moderate',
  },
  planned: {
    label: 'Planificado',
    className: 'bg-planned/12 text-planned border-planned/25',
    dot: 'bg-planned',
  },
}
