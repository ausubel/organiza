import type { Flashcard } from './types'

export type Rating = 'again' | 'hard' | 'good' | 'easy'

const MIN_EASE = 1.3

/** Variante simplificada de SM-2: el intervalo se mide en días. */
export function schedule(card: Flashcard, rating: Rating, now = new Date()): Flashcard {
  let { interval, ease, reps } = card

  switch (rating) {
    case 'again':
      reps = 0
      interval = 0
      ease = Math.max(MIN_EASE, ease - 0.2)
      break
    case 'hard':
      reps += 1
      interval = Math.max(1, Math.round(interval * 1.2))
      ease = Math.max(MIN_EASE, ease - 0.15)
      break
    case 'good':
      reps += 1
      interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease)
      break
    case 'easy':
      reps += 1
      interval = Math.round((reps === 1 ? 3 : Math.max(4, interval * ease)) * 1.3)
      ease += 0.15
      break
  }

  const due =
    interval === 0
      ? new Date(now.getTime() + 10 * 60 * 1000)
      : new Date(now.getTime() + interval * 864e5)

  return { ...card, interval, ease, reps, due: due.toISOString() }
}

export function previewInterval(card: Flashcard, rating: Rating): string {
  const next = schedule(card, rating)
  if (next.interval === 0) return '10 min'
  return next.interval === 1 ? '1 día' : `${next.interval} días`
}

export function isDue(card: Flashcard, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime()
}
