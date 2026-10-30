'use client'

import { Hourglass, Maximize2, Minimize2, Play, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Card, CourseTag, EmptyState, PageHeader, Segmented } from '@/components/ui/shared'
import { courseColor } from '@/lib/colors'
import { formatDue, parseLocal } from '@/lib/date'
import { useNow } from '@/lib/hooks'
import { playAlarm, unlockAudio } from '@/lib/sound'
import { useAppData } from '@/lib/store'
import type { Course } from '@/lib/types'
import { cn } from '@/lib/utils'

type Active =
  | { type: 'countdown'; title: string; course: Course | undefined; target: number }
  | { type: 'mock'; title: string; course: Course | undefined; target: number; total: number }

export function ExamView() {
  const { tasks, courses } = useAppData()
  const now = useNow(30_000)
  const [mode, setMode] = useState<'countdown' | 'mock'>('countdown')
  const [active, setActive] = useState<Active | null>(null)
  const [mockMinutes, setMockMinutes] = useState('90')
  const [mockCourse, setMockCourse] = useState(courses[0]?.id ?? '')

  const exams = tasks
    .filter((t) => t.kind === 'examen' && t.status !== 'done' && parseLocal(t.dueDate).getTime() > now.getTime())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  if (active) return <FullscreenTimer active={active} onExit={() => setActive(null)} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Modo examen" description="Una cuenta regresiva a pantalla completa, sin distracciones." />
      <Segmented
        label="Tipo"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'countdown', label: 'Hasta el examen' },
          { value: 'mock', label: 'Simulacro cronometrado' },
        ]}
      />

      {mode === 'countdown' ? (
        exams.length === 0 ? (
          <EmptyState
            icon={<Hourglass className="size-5" />}
            title="No hay exámenes próximos"
            description="Crea una entrega de tipo «Examen» en el tablero para verla aquí."
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {exams.map((exam) => {
              const course = courses.find((c) => c.id === exam.courseId)
              const days = Math.floor((parseLocal(exam.dueDate).getTime() - now.getTime()) / 864e5)
              return (
                <li key={exam.id}>
                  <Card className="flex items-center gap-4 p-4">
                    <div
                      className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: courseColor(course) }}
                    >
                      <span className="text-xl leading-none font-semibold tabular">{days}</span>
                      <span className="text-[10px]">{days === 1 ? 'día' : 'días'}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate font-medium">{exam.title}</p>
                      <CourseTag course={course} />
                      <p className="text-xs text-muted-foreground">{formatDue(exam.dueDate)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setActive({ type: 'countdown', title: exam.title, course, target: parseLocal(exam.dueDate).getTime() })}
                    >
                      <Maximize2 data-icon="inline-start" />
                      Abrir
                    </Button>
                  </Card>
                </li>
              )
            })}
          </ul>
        )
      ) : (
        <Card className="flex max-w-lg flex-col gap-4 p-5">
          <p className="text-sm text-muted-foreground">Practica bajo las mismas condiciones de tiempo que tendrás en el examen real. Sonará una alarma al terminar.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Asignatura" htmlFor="mock-course">
              <Select id="mock-course" value={mockCourse} onChange={(e) => setMockCourse(e.target.value)}>
                <option value="">General</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Duración (minutos)" htmlFor="mock-minutes">
              <Input id="mock-minutes" type="number" min={1} max={600} value={mockMinutes} onChange={(e) => setMockMinutes(e.target.value)} />
            </Field>
          </div>
          <Button
            className="self-start"
            onClick={() => {
              unlockAudio()
              const total = Math.max(1, Number(mockMinutes) || 60) * 60_000
              const course = courses.find((c) => c.id === mockCourse)
              setActive({ type: 'mock', title: `Simulacro${course ? ` · ${course.name}` : ''}`, course, target: Date.now() + total, total })
            }}
          >
            <Play data-icon="inline-start" />
            Comenzar simulacro
          </Button>
        </Card>
      )}
    </div>
  )
}

function FullscreenTimer({ active, onExit }: { active: Active; onExit: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => Date.now())
  const [isFs, setIsFs] = useState(false)
  const firedRef = useRef(false)
  const remaining = Math.max(0, active.target - now)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    const onFs = () => setIsFs(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onFs)
    ref.current?.requestFullscreen?.().catch(() => {})
    return () => {
      clearInterval(id)
      document.removeEventListener('fullscreenchange', onFs)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true
      playAlarm(5)
    }
  }, [remaining])

  const days = Math.floor(remaining / 864e5)
  const hours = Math.floor((remaining % 864e5) / 36e5)
  const minutes = Math.floor((remaining % 36e5) / 6e4)
  const seconds = Math.floor((remaining % 6e4) / 1000)
  const units = [
    ...(days > 0 ? [{ v: days, l: days === 1 ? 'día' : 'días' }] : []),
    { v: hours, l: 'horas' },
    { v: minutes, l: 'min' },
    { v: seconds, l: 'seg' },
  ]
  const progress = active.type === 'mock' ? 1 - remaining / active.total : null
  const lowTime = active.type === 'mock' && remaining < 5 * 60_000

  return (
    <div ref={ref} className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 sm:p-6">
        <CourseTag course={active.course} className="text-sm" />
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (isFs ? document.exitFullscreen() : ref.current?.requestFullscreen())}
          >
            {isFs ? <Minimize2 /> : <Maximize2 />}
            <span className="sr-only">{isFs ? 'Salir de pantalla completa' : 'Pantalla completa'}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={onExit}>
            <X />
            <span className="sr-only">Cerrar modo examen</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <h1 className="text-xl font-medium text-balance text-muted-foreground sm:text-2xl">{active.title}</h1>
        {remaining === 0 ? (
          <p className="text-5xl font-semibold text-urgent sm:text-7xl">{active.type === 'mock' ? '¡Tiempo!' : '¡Es hoy!'}</p>
        ) : (
          <div className="flex items-start gap-3 sm:gap-8" role="timer">
            {units.map((u, i) => (
              <div key={u.l} className="flex items-start gap-3 sm:gap-8">
                <div className="flex flex-col items-center">
                  <span className={cn('font-mono text-6xl font-semibold tracking-tight tabular sm:text-8xl lg:text-9xl', lowTime && 'text-urgent')}>
                    {String(u.v).padStart(2, '0')}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground sm:text-sm">{u.l}</span>
                </div>
                {i < units.length - 1 ? <span className="font-mono text-5xl text-muted-foreground/40 sm:text-7xl lg:text-8xl">:</span> : null}
              </div>
            ))}
          </div>
        )}
        {progress !== null ? (
          <div className="h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-[width]" style={{ width: `${progress * 100}%`, backgroundColor: courseColor(active.course) }} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
