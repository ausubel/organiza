'use client'

import { MapPin, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { PageHeader, Segmented } from '@/components/ui/shared'
import { courseColor } from '@/lib/colors'
import { DAY_NAMES, DAY_SHORT, minutesToTime, mondayIndex, timeToMinutes } from '@/lib/date'
import { useNow } from '@/lib/hooks'
import { actions, uid, useAppData } from '@/lib/store'
import type { BlockKind, Course, ScheduleBlock } from '@/lib/types'
import { cn } from '@/lib/utils'

const START_HOUR = 7
const END_HOUR = 22
const HOUR_PX = 56
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

type Draft = Omit<ScheduleBlock, 'id'> & { id?: string }

export function PlannerView() {
  const { blocks, courses } = useAppData()
  const now = useNow(60_000)
  const today = mondayIndex(now)
  const [mobileDay, setMobileDay] = useState(today)
  const [draft, setDraft] = useState<Draft | null>(null)
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])

  const totals = useMemo(() => {
    let clase = 0
    let estudio = 0
    for (const b of blocks) {
      const mins = timeToMinutes(b.end) - timeToMinutes(b.start)
      if (b.kind === 'clase') clase += mins
      else estudio += mins
    }
    return { clase: clase / 60, estudio: estudio / 60 }
  }, [blocks])

  const newDraft = (day: number, hour: number): Draft => ({
    day,
    start: minutesToTime(hour * 60),
    end: minutesToTime(Math.min(END_HOUR * 60, hour * 60 + 60)),
    title: '',
    courseId: courses[0]?.id ?? null,
    kind: 'estudio',
    location: '',
  })

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNowLine = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Horario semanal"
        description="Clases fijas y bloques de estudio. Haz clic en una franja vacía para añadir un bloque."
        actions={
          <Button onClick={() => setDraft(newDraft(today, Math.max(START_HOUR, Math.min(END_HOUR - 1, now.getHours() + 1))))}>
            <Plus data-icon="inline-start" />
            Nuevo bloque
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1">
          <span className="size-2.5 rounded-sm bg-foreground/70" aria-hidden />
          Clases: <strong className="tabular">{totals.clase.toFixed(1)} h</strong>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1">
          <span className="size-2.5 rounded-sm border-2 border-dashed border-foreground/60" aria-hidden />
          Estudio planificado: <strong className="tabular">{totals.estudio.toFixed(1)} h</strong>
        </span>
      </div>

      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Día">
          {DAY_SHORT.map((label, idx) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={mobileDay === idx}
              onClick={() => setMobileDay(idx)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium',
                mobileDay === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="grid grid-cols-[3.25rem_1fr] md:grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
          <div className="border-b" />
          {DAY_NAMES.map((name, idx) => (
            <div
              key={name}
              className={cn(
                'border-b border-l px-2 py-2.5 text-center text-xs font-medium',
                idx !== mobileDay && 'hidden md:block',
                idx === today ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span className="hidden lg:inline">{name}</span>
              <span className="lg:hidden">{DAY_SHORT[idx]}</span>
            </div>
          ))}

          <div className="relative" style={{ height: HOURS.length * HOUR_PX }}>
            {HOURS.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground tabular"
                style={{ top: i * HOUR_PX }}
              >
                {i === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>

          {DAY_NAMES.map((name, day) => (
            <div
              key={name}
              className={cn('relative border-l', day !== mobileDay && 'hidden md:block', day === today && 'bg-accent/25')}
              style={{ height: HOURS.length * HOUR_PX }}
            >
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={`Añadir bloque el ${name} a las ${h}:00`}
                  onClick={() => setDraft(newDraft(day, h))}
                  className="block w-full border-b border-border/60 hover:bg-muted/60 focus-visible:bg-muted"
                  style={{ height: HOUR_PX }}
                />
              ))}

              {day === today && showNowLine ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 h-px bg-urgent"
                  style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * HOUR_PX }}
                  aria-hidden
                >
                  <span className="absolute -top-1 -left-1 size-2 rounded-full bg-urgent" />
                </div>
              ) : null}

              {blocks
                .filter((b) => b.day === day)
                .map((block) => (
                  <BlockChip
                    key={block.id}
                    block={block}
                    course={block.courseId ? courseById.get(block.courseId) : undefined}
                    onClick={() => setDraft(block)}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? 'Editar bloque' : 'Nuevo bloque'}>
        {draft ? <BlockForm key={draft.id ?? `${draft.day}-${draft.start}`} draft={draft} courses={courses} onDone={() => setDraft(null)} /> : null}
      </Modal>
    </div>
  )
}

function BlockChip({ block, course, onClick }: { block: ScheduleBlock; course: Course | undefined; onClick: () => void }) {
  const start = Math.max(timeToMinutes(block.start), START_HOUR * 60)
  const end = Math.min(timeToMinutes(block.end), END_HOUR * 60)
  if (end <= start) return null
  const top = ((start - START_HOUR * 60) / 60) * HOUR_PX
  const height = ((end - start) / 60) * HOUR_PX
  const color = courseColor(course)
  const isClass = block.kind === 'clase'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute inset-x-1 z-10 flex flex-col overflow-hidden rounded-lg px-2 py-1.5 text-left text-xs transition-transform hover:z-30 hover:scale-[1.02]',
        isClass ? 'text-white' : 'border-2 border-dashed bg-card',
      )}
      style={{
        top: top + 1,
        height: height - 2,
        backgroundColor: isClass ? color : `color-mix(in oklch, ${color} 12%, var(--card))`,
        borderColor: isClass ? undefined : color,
      }}
    >
      <span className="truncate font-semibold">{block.title || course?.name || 'Bloque'}</span>
      <span className={cn('font-mono text-[10px] tabular', isClass ? 'text-white/85' : 'text-muted-foreground')}>
        {block.start}–{block.end}
      </span>
      {block.location && height > 60 ? (
        <span className={cn('mt-auto inline-flex items-center gap-1 truncate text-[10px]', isClass ? 'text-white/85' : 'text-muted-foreground')}>
          <MapPin className="size-2.5 shrink-0" />
          {block.location}
        </span>
      ) : null}
    </button>
  )
}

function BlockForm({ draft, courses, onDone }: { draft: Draft; courses: Course[]; onDone: () => void }) {
  const [form, setForm] = useState(draft)
  const [error, setError] = useState('')
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (timeToMinutes(form.end) <= timeToMinutes(form.start)) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      return
    }
    actions.saveBlock({ ...form, id: form.id ?? uid(), title: form.title.trim(), location: form.location.trim() })
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Segmented<BlockKind>
        label="Tipo de bloque"
        value={form.kind}
        onChange={(v) => update('kind', v)}
        options={[
          { value: 'clase', label: 'Clase fija' },
          { value: 'estudio', label: 'Estudio' },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asignatura" htmlFor="block-course">
          <Select id="block-course" value={form.courseId ?? ''} onChange={(e) => update('courseId', e.target.value || null)}>
            <option value="">Sin asignatura</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Título (opcional)" htmlFor="block-title">
          <Input id="block-title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Ej. Repaso de temas 1–3" />
        </Field>
        <Field label="Día" htmlFor="block-day">
          <Select id="block-day" value={form.day} onChange={(e) => update('day', Number(e.target.value))}>
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lugar" htmlFor="block-location">
          <Input id="block-location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Aula, biblioteca…" />
        </Field>
        <Field label="Inicio" htmlFor="block-start">
          <Input id="block-start" type="time" step={900} value={form.start} onChange={(e) => update('start', e.target.value)} required />
        </Field>
        <Field label="Fin" htmlFor="block-end">
          <Input id="block-end" type="time" step={900} value={form.end} onChange={(e) => update('end', e.target.value)} required />
        </Field>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2 pt-2">
        {form.id ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              actions.deleteBlock(form.id as string)
              onDone()
            }}
          >
            Eliminar
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </div>
    </form>
  )
}
