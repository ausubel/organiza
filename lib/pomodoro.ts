'use client'

import { useSyncExternalStore } from 'react'
import { notify, playAlarm, requestNotificationPermission, unlockAudio } from './sound'
import { actions, uid } from './store'

export type PomodoroPreset = '25/5' | '50/10'
export type PomodoroPhase = 'focus' | 'break'
export type PomodoroStatus = 'idle' | 'running' | 'paused'

export const PRESETS: Record<PomodoroPreset, { focus: number; break: number }> = {
  '25/5': { focus: 25, break: 5 },
  '50/10': { focus: 50, break: 10 },
}

export interface PomodoroState {
  preset: PomodoroPreset
  phase: PomodoroPhase
  status: PomodoroStatus
  remainingMs: number
  endsAt: number | null
  runningSince: number | null
  focusAccumMs: number
  focusStartedAt: string | null
  courseId: string | null
  taskId: string | null
  completedCycles: number
  alarmAt: number | null
  now: number
}

const phaseMs = (preset: PomodoroPreset, phase: PomodoroPhase) => PRESETS[preset][phase] * 60_000

const initialState: PomodoroState = {
  preset: '25/5',
  phase: 'focus',
  status: 'idle',
  remainingMs: phaseMs('25/5', 'focus'),
  endsAt: null,
  runningSince: null,
  focusAccumMs: 0,
  focusStartedAt: null,
  courseId: null,
  taskId: null,
  completedCycles: 0,
  alarmAt: null,
  now: 0,
}

let state = initialState
let interval: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

function set(patch: Partial<PomodoroState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

function logFocus(extraMs: number) {
  const minutes = Math.round((state.focusAccumMs + extraMs) / 60_000)
  if (minutes >= 1) {
    actions.logSession({
      id: uid(),
      startedAt: state.focusStartedAt ?? new Date().toISOString(),
      minutes,
      courseId: state.courseId,
      taskId: state.taskId,
    })
  }
}

function startTicking() {
  if (interval) return
  interval = setInterval(tick, 250)
}

function stopTicking() {
  if (interval) clearInterval(interval)
  interval = null
}

function tick() {
  const now = Date.now()
  if (state.status !== 'running' || state.endsAt === null) return
  if (now < state.endsAt) {
    set({ remainingMs: state.endsAt - now, now })
    return
  }
  finishPhase(state.endsAt)
}

function finishPhase(at: number) {
  playAlarm()
  if (state.phase === 'focus') {
    logFocus(at - (state.runningSince ?? at))
    notify('¡Bloque de enfoque completado!', 'Toma un descanso breve.')
    const duration = phaseMs(state.preset, 'break')
    const now = Date.now()
    set({
      phase: 'break',
      status: 'running',
      remainingMs: duration,
      endsAt: now + duration,
      runningSince: now,
      focusAccumMs: 0,
      focusStartedAt: null,
      completedCycles: state.completedCycles + 1,
      alarmAt: now,
      now,
    })
  } else {
    notify('Descanso terminado', 'Listo para el siguiente bloque.')
    stopTicking()
    set({
      phase: 'focus',
      status: 'idle',
      remainingMs: phaseMs(state.preset, 'focus'),
      endsAt: null,
      runningSince: null,
      alarmAt: Date.now(),
    })
  }
}

export const pomodoro = {
  start() {
    unlockAudio()
    requestNotificationPermission()
    if (state.status === 'running') return
    const now = Date.now()
    set({
      status: 'running',
      endsAt: now + state.remainingMs,
      runningSince: now,
      focusStartedAt:
        state.phase === 'focus' ? (state.focusStartedAt ?? new Date().toISOString()) : null,
      alarmAt: null,
      now,
    })
    startTicking()
  },
  pause() {
    if (state.status !== 'running' || state.endsAt === null) return
    const now = Date.now()
    stopTicking()
    set({
      status: 'paused',
      remainingMs: state.endsAt - now,
      endsAt: null,
      focusAccumMs:
        state.phase === 'focus' ? state.focusAccumMs + (now - (state.runningSince ?? now)) : 0,
      runningSince: null,
    })
  },
  skip() {
    const now = Date.now()
    if (state.phase === 'focus' && state.status !== 'idle') {
      state = {
        ...state,
        focusAccumMs:
          state.status === 'running'
            ? state.focusAccumMs + (now - (state.runningSince ?? now))
            : state.focusAccumMs,
        runningSince: now,
      }
      logFocus(0)
    }
    stopTicking()
    const nextPhase: PomodoroPhase = state.phase === 'focus' ? 'break' : 'focus'
    set({
      phase: nextPhase,
      status: 'idle',
      remainingMs: phaseMs(state.preset, nextPhase),
      endsAt: null,
      runningSince: null,
      focusAccumMs: 0,
      focusStartedAt: null,
    })
  },
  reset() {
    if (state.phase === 'focus' && state.status !== 'idle') {
      const now = Date.now()
      logFocus(state.status === 'running' ? now - (state.runningSince ?? now) : 0)
    }
    stopTicking()
    set({
      phase: 'focus',
      status: 'idle',
      remainingMs: phaseMs(state.preset, 'focus'),
      endsAt: null,
      runningSince: null,
      focusAccumMs: 0,
      focusStartedAt: null,
      alarmAt: null,
    })
  },
  setPreset(preset: PomodoroPreset) {
    if (state.status !== 'idle') return
    set({ preset, remainingMs: phaseMs(preset, state.phase) })
  },
  setContext(courseId: string | null, taskId: string | null) {
    set({ courseId, taskId })
  },
  dismissAlarm() {
    set({ alarmAt: null })
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePomodoro(): PomodoroState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initialState,
  )
}

export function phaseTotalMs(s: PomodoroState) {
  return phaseMs(s.preset, s.phase)
}
