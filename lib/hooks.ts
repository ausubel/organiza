'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export const VIEWS = [
  'resumen',
  'tablero',
  'horario',
  'notas',
  'asistencia',
  'pomodoro',
  'flashcards',
  'examen',
  'datos',
] as const
export type ViewId = (typeof VIEWS)[number]

function readHash(): ViewId {
  const hash = window.location.hash.replace('#', '') as ViewId
  return VIEWS.includes(hash) ? hash : 'resumen'
}

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useView(): ViewId {
  return useSyncExternalStore(subscribeHash, readHash, () => 'resumen')
}

export function navigate(view: ViewId) {
  window.location.hash = view
}

type Theme = 'light' | 'dark'
const themeListeners = new Set<() => void>()

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      themeListeners.add(cb)
      return () => themeListeners.delete(cb)
    },
    readTheme,
    () => 'light' as Theme,
  )
  const toggle = () => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(next)
    try {
      localStorage.setItem('misemestre:theme', next)
    } catch {}
    for (const l of themeListeners) l()
  }
  return [theme, toggle]
}
