'use client'

import { useSyncExternalStore } from 'react'
import { createSeedData } from './seed'
import type {
  AppData,
  Course,
  FocusSession,
  Flashcard,
  ScheduleBlock,
  Settings,
  Task,
} from './types'

const STORAGE_KEY = 'misemestre:data:v1'

export const EMPTY_DATA: AppData = {
  version: 1,
  courses: [],
  tasks: [],
  blocks: [],
  flashcards: [],
  sessions: [],
  settings: { gradeScaleMin: 0, gradeScaleMax: 20 },
}

let state: AppData = EMPTY_DATA
let loaded = false
const listeners = new Set<() => void>()

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function normalizeData(input: unknown): AppData {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<AppData>
  const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
  return {
    version: 1,
    courses: arr<Course>(raw.courses),
    tasks: arr<Task>(raw.tasks),
    blocks: arr<ScheduleBlock>(raw.blocks),
    flashcards: arr<Flashcard>(raw.flashcards),
    sessions: arr<FocusSession>(raw.sessions),
    settings: { ...EMPTY_DATA.settings, ...(raw.settings ?? {}) },
  }
}

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    state = stored ? normalizeData(JSON.parse(stored)) : createSeedData()
    if (!stored) persist()
  } catch {
    state = createSeedData()
  }
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return
    try {
      state = normalizeData(JSON.parse(event.newValue))
      emit()
    } catch {
      // Ignore malformed data written by another tab.
    }
  })
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be full or disabled (private mode); keep in-memory state.
  }
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  load()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getData(): AppData {
  load()
  return state
}

export function setData(updater: (prev: AppData) => AppData) {
  load()
  state = updater(state)
  persist()
  emit()
}

export function replaceData(next: AppData) {
  setData(() => normalizeData(next))
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getData, () => EMPTY_DATA)
}

const subscribeNoop = () => () => {}
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
}

type Collection = 'courses' | 'tasks' | 'blocks' | 'flashcards' | 'sessions'
type ItemOf<K extends Collection> = AppData[K][number]

function upsert<K extends Collection>(key: K, item: ItemOf<K>) {
  setData((prev) => {
    const list = prev[key] as ItemOf<K>[]
    const exists = list.some((entry) => entry.id === item.id)
    const next = exists ? list.map((entry) => (entry.id === item.id ? item : entry)) : [...list, item]
    return { ...prev, [key]: next }
  })
}

function remove<K extends Collection>(key: K, id: string) {
  setData((prev) => ({
    ...prev,
    [key]: (prev[key] as ItemOf<K>[]).filter((entry) => entry.id !== id),
  }))
}

export const actions = {
  saveCourse: (course: Course) => upsert('courses', course),
  deleteCourse: (id: string) =>
    setData((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      tasks: prev.tasks.map((t) => (t.courseId === id ? { ...t, courseId: null } : t)),
      blocks: prev.blocks.map((b) => (b.courseId === id ? { ...b, courseId: null } : b)),
      flashcards: prev.flashcards.map((f) => (f.courseId === id ? { ...f, courseId: null } : f)),
    })),
  updateCourse: (id: string, patch: Partial<Course>) =>
    setData((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  saveTask: (task: Task) => upsert('tasks', task),
  deleteTask: (id: string) => remove('tasks', id),
  updateTask: (id: string, patch: Partial<Task>) =>
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  saveBlock: (block: ScheduleBlock) => upsert('blocks', block),
  deleteBlock: (id: string) => remove('blocks', id),

  saveFlashcard: (card: Flashcard) => upsert('flashcards', card),
  deleteFlashcard: (id: string) => remove('flashcards', id),

  logSession: (session: FocusSession) =>
    setData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session],
      tasks: session.taskId
        ? prev.tasks.map((t) =>
            t.id === session.taskId ? { ...t, minutesSpent: t.minutesSpent + session.minutes } : t,
          )
        : prev.tasks,
    })),

  saveSettings: (settings: Settings) => setData((prev) => ({ ...prev, settings })),
  resetAll: () => replaceData(EMPTY_DATA),
  loadDemo: () => replaceData(createSeedData()),
}
