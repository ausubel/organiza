'use client'

import { BellRing, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/field'
import { Card, CourseTag, PageHeader, Segmented } from '@/components/ui/shared'
import { courseColor } from '@/lib/colors'
import { formatDuration, formatMinutes } from '@/lib/date'
import { phaseTotalMs, pomodoro, PRESETS, usePomodoro, type PomodoroPreset } from '@/lib/pomodoro'
import { useAppData } from '@/lib/store'
import { cn } from '@/lib/utils'

const RADIUS = 120
const CIRC = 2 * Math.PI * RADIUS

export function PomodoroView() {
  const p = usePomodoro()
  const { courses, tasks, sessions } = useAppData()
  const total = phaseTotalMs(p)
  const progress = 1 - p.remainingMs / total
  const isFocus = p.phase === 'focus'
  const openTasks = tasks.filter((t) => t.status !== 'done' && (!p.courseId || t.courseId === p.courseId))

  const stats = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const weekAgo = new Date(startOfDay.getTime() - 6 * 864e5)
    let today = 0
    let todayCount = 0
    const byCourse = new Map<string | null, number>()
    for (const s of sessions) {
      const at = new Date(s.startedAt)
      if (at >= startOfDay) {
        today += s.minutes
        todayCount += 1
      }
      if (at >= weekAgo) byCourse.set(s.courseId, (byCourse.get(s.courseId) ?? 0) + s.minutes)
    }
    const week = [...byCourse.entries()].sort((a, b) => b[1] - a[1])
    const weekTotal = week.reduce((s, [, m]) => s + m, 0)
    return { today, todayCount, week, weekTotal }
  }, [sessions])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pomodoro" description="Bloques de enfoque con descanso. El tiempo se registra en la asignatura y la tarea elegidas." />

      {p.alarmAt ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-accent p-4">
          <span className="inline-flex items-center gap-2 font-medium text-accent-foreground">
            <BellRing className="size-5" />
            {isFocus ? 'Descanso terminado. ¿Otro bloque?' : '¡Bloque completado! Hora de descansar.'}
          </span>
          <Button size="sm" variant="outline" onClick={() => pomodoro.dismissAlarm()}>
            Entendido
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="flex flex-col items-center gap-6 p-6 sm:p-10">
          <Segmented<PomodoroPreset>
            label="Duración"
            value={p.preset}
            onChange={(v) => pomodoro.setPreset(v)}
            options={(Object.keys(PRESETS) as PomodoroPreset[]).map((k) => ({ value: k, label: `${k} min` }))}
          />

          <div className="relative size-64 sm:size-72">
            <svg viewBox="0 0 280 280" className="size-full -rotate-90" aria-hidden>
              <circle cx="140" cy="140" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
              <circle
                cx="140"
                cy="140"
                r={RADIUS}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
                className={cn('transition-[stroke-dashoffset] duration-300', isFocus ? 'stroke-primary' : 'stroke-planned')}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className={cn('text-xs font-medium uppercase tracking-widest', isFocus ? 'text-primary' : 'text-planned')}>
                {isFocus ? 'Enfoque' : 'Descanso'}
              </span>
              <span className="font-mono text-6xl font-semibold tracking-tight tabular" role="timer" aria-live="off">
                {formatDuration(p.remainingMs)}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.completedCycles} {p.completedCycles === 1 ? 'ciclo completado' : 'ciclos completados'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon-lg" onClick={() => pomodoro.reset()}>
              <RotateCcw />
              <span className="sr-only">Reiniciar</span>
            </Button>
            {p.status === 'running' ? (
              <Button size="lg" className="w-36" onClick={() => pomodoro.pause()}>
                <Pause data-icon="inline-start" />
                Pausar
              </Button>
            ) : (
              <Button size="lg" className="w-36" onClick={() => pomodoro.start()}>
                <Play data-icon="inline-start" />
                {p.status === 'paused' ? 'Reanudar' : 'Iniciar'}
              </Button>
            )}
            <Button variant="outline" size="icon-lg" onClick={() => pomodoro.skip()}>
              <SkipForward />
              <span className="sr-only">Saltar fase</span>
            </Button>
          </div>

          <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
            <Field label="Asignatura" htmlFor="pomo-course">
              <Select id="pomo-course" value={p.courseId ?? ''} onChange={(e) => pomodoro.setContext(e.target.value || null, null)}>
                <option value="">General</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tarea" htmlFor="pomo-task">
              <Select
                id="pomo-task"
                value={p.taskId ?? ''}
                onChange={(e) => {
                  const task = tasks.find((t) => t.id === e.target.value)
                  pomodoro.setContext(task?.courseId ?? p.courseId, task?.id ?? null)
                }}
              >
                <option value="">Sin tarea</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="grid grid-cols-2 gap-3 p-5">
            <div>
              <p className="text-2xl font-semibold tabular">{formatMinutes(stats.today)}</p>
              <p className="text-xs text-muted-foreground">Enfoque hoy</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular">{stats.todayCount}</p>
              <p className="text-xs text-muted-foreground">Sesiones hoy</p>
            </div>
          </Card>
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Últimos 7 días</h2>
              <span className="text-xs text-muted-foreground tabular">{formatMinutes(stats.weekTotal)}</span>
            </div>
            {stats.week.length === 0 ? (
              <p className="text-sm text-muted-foreground">Completa tu primer bloque para ver tu distribución de estudio.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {stats.week.map(([courseId, minutes]) => {
                  const course = courses.find((c) => c.id === courseId)
                  return (
                    <li key={courseId ?? 'general'} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <CourseTag course={course} className="text-foreground" />
                        <span className="text-xs text-muted-foreground tabular">{formatMinutes(minutes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${(minutes / stats.weekTotal) * 100}%`, backgroundColor: courseColor(course) }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            El temporizador sigue corriendo mientras navegas por la app. Activa las notificaciones del navegador para recibir el aviso aunque cambies de pestaña.
          </p>
        </div>
      </div>
    </div>
  )
}
