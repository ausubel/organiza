'use client'

import { ArrowRight, CalendarClock, Hourglass, Layers, MapPin, ShieldAlert, Timer } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CourseTag, PriorityBadge } from '@/components/ui/shared'
import { courseColor } from '@/lib/colors'
import { DAY_NAMES, formatMinutes, mondayIndex, parseLocal, relativeDue, timeToMinutes } from '@/lib/date'
import { attendanceLevel, formatGrade, summarizeCourse } from '@/lib/grades'
import { useNow, type ViewId } from '@/lib/hooks'
import { getPriority } from '@/lib/priority'
import { isDue } from '@/lib/srs'
import { useAppData } from '@/lib/store'
import { cn } from '@/lib/utils'

function greeting(hour: number) {
  if (hour < 12) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function Panel({ title, href, linkLabel, children, className }: { title: string; href: ViewId; linkLabel: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('flex flex-col gap-4 p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <a href={`#${href}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {linkLabel}
          <ArrowRight className="size-3" />
        </a>
      </div>
      {children}
    </Card>
  )
}

export function DashboardView() {
  const { tasks, courses, blocks, flashcards, sessions, settings } = useAppData()
  const now = useNow(60_000)
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const today = mondayIndex(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const priorities = tasks
    .map((task) => ({ task, p: getPriority(task, now) }))
    .filter((x): x is { task: (typeof tasks)[number]; p: NonNullable<ReturnType<typeof getPriority>> } => x.p !== null)
    .sort((a, b) => b.p.score - a.p.score)
  const urgentCount = priorities.filter((x) => x.p.level === 'urgent').length

  const todayBlocks = blocks.filter((b) => b.day === today).sort((a, b) => a.start.localeCompare(b.start))
  const nextExam = tasks
    .filter((t) => t.kind === 'examen' && t.status !== 'done' && parseLocal(t.dueDate) > now)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const dueCards = flashcards.filter((c) => isDue(c, now)).length
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const focusToday = sessions.filter((s) => new Date(s.startedAt) >= startOfDay).reduce((sum, s) => sum + s.minutes, 0)
  const atRisk = courses.filter((c) => attendanceLevel(c).ratio >= 0.7)

  const dateLabel = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground first-letter:uppercase">{dateLabel}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {greeting(now.getHours())}.{' '}
          <span className="text-muted-foreground">
            {urgentCount === 0
              ? 'Nada urgente por ahora.'
              : urgentCount === 1
                ? 'Tienes 1 entrega urgente.'
                : `Tienes ${urgentCount} entregas urgentes.`}
          </span>
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickStat href="pomodoro" icon={<Timer className="size-4" />} label="Enfoque hoy" value={formatMinutes(focusToday)} />
        <QuickStat href="flashcards" icon={<Layers className="size-4" />} label="Tarjetas por repasar" value={String(dueCards)} />
        <QuickStat
          href="examen"
          icon={<Hourglass className="size-4" />}
          label={nextExam ? `Próximo examen` : 'Sin exámenes'}
          value={nextExam ? relativeDue(nextExam.dueDate, now) : '—'}
        />
        <QuickStat
          href="asistencia"
          icon={<ShieldAlert className="size-4" />}
          label="Riesgo de asistencia"
          value={String(atRisk.length)}
          alert={atRisk.length > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Prioridades" href="tablero" linkLabel="Ver tablero" className="lg:col-span-3">
          {priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes entregas pendientes. ¡Buen trabajo!</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {priorities.slice(0, 5).map(({ task, p }) => (
                <li key={task.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: courseColor(task.courseId ? courseById.get(task.courseId) : null) }} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className={cn('text-xs', p.overdue ? 'text-urgent' : 'text-muted-foreground')}>
                      {relativeDue(task.dueDate, now)} · {task.weight}%
                    </p>
                  </div>
                  <PriorityBadge level={p.level} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Hoy, ${DAY_NAMES[today].toLowerCase()}`} href="horario" linkLabel="Horario" className="lg:col-span-2">
          {todayBlocks.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4" />
              Día libre de clases y bloques.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {todayBlocks.map((b) => {
                const course = b.courseId ? courseById.get(b.courseId) : undefined
                const live = nowMin >= timeToMinutes(b.start) && nowMin < timeToMinutes(b.end)
                const past = nowMin >= timeToMinutes(b.end)
                return (
                  <li key={b.id} className={cn('flex items-center gap-3 rounded-xl border p-2.5', live && 'border-primary bg-accent/50', past && 'opacity-55')}>
                    <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground tabular">{b.start}</span>
                    <span className={cn('size-2 shrink-0 rounded-full', b.kind === 'estudio' && 'ring-2 ring-offset-1 ring-offset-card')} style={{ backgroundColor: courseColor(course), ['--tw-ring-color' as string]: courseColor(course) }} aria-hidden />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{b.title || course?.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {b.kind === 'clase' ? 'Clase' : 'Estudio'}
                        {b.location ? (
                          <>
                            {' · '}
                            <MapPin className="size-3" />
                            {b.location}
                          </>
                        ) : null}
                      </span>
                    </div>
                    {live ? <span className="text-[11px] font-medium text-primary">Ahora</span> : null}
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>

        <Panel title="Notas" href="notas" linkLabel="Detalle" className="lg:col-span-5">
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Agrega tus asignaturas para seguir tus notas.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const s = summarizeCourse(course, settings)
                const need = s.neededToPass
                const passing = need === null ? (s.currentAverage ?? 0) >= course.passingGrade : need <= settings.gradeScaleMax
                return (
                  <li key={course.id} className="flex flex-col gap-2 rounded-xl border p-3">
                    <CourseTag course={course} className="text-sm font-medium text-foreground" />
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-semibold tabular">{formatGrade(s.currentAverage)}</p>
                        <p className="text-[11px] text-muted-foreground">Promedio actual</p>
                      </div>
                      <p className={cn('text-right text-xs', passing ? 'text-muted-foreground' : 'text-urgent')}>
                        {need === null
                          ? passing
                            ? 'Aprobado'
                            : 'Desaprobado'
                          : need <= settings.gradeScaleMin
                            ? 'Aprobación asegurada'
                            : passing
                              ? `Necesitas ${formatGrade(need)} para aprobar`
                              : 'Aprobación fuera de alcance'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function QuickStat({ href, icon, label, value, alert }: { href: ViewId; icon: ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <a href={`#${href}`} className={cn('flex flex-col gap-2 rounded-2xl border bg-card p-4 transition-colors hover:border-ring', alert && 'border-urgent/40')}>
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', alert && 'text-urgent')}>
        {icon}
        {label}
      </span>
      <span className="truncate text-xl font-semibold tabular first-letter:uppercase">{value}</span>
    </a>
  )
}
