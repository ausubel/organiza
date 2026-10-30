'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { COURSE_COLORS } from '@/lib/colors'
import { actions, uid, useAppData } from '@/lib/store'
import type { Course, CourseColor, EvalComponent } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CourseFormModal({ open, onClose, course }: { open: boolean; onClose: () => void; course?: Course | null }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course ? 'Editar asignatura' : 'Nueva asignatura'}
      description="Define los componentes de evaluación y su peso. Deben sumar 100%."
      className="max-w-xl"
    >
      {open ? <CourseForm key={course?.id ?? 'new'} course={course} onDone={onClose} /> : null}
    </Modal>
  )
}

function CourseForm({ course, onDone }: { course?: Course | null; onDone: () => void }) {
  const { settings, courses } = useAppData()
  const palette = Object.keys(COURSE_COLORS) as CourseColor[]
  const [name, setName] = useState(course?.name ?? '')
  const [code, setCode] = useState(course?.code ?? '')
  const [color, setColor] = useState<CourseColor>(course?.color ?? palette[courses.length % palette.length])
  const [passingGrade, setPassingGrade] = useState(String(course?.passingGrade ?? (settings.gradeScaleMax * 0.525).toFixed(1)))
  const [goalGrade, setGoalGrade] = useState(String(course?.goalGrade ?? (settings.gradeScaleMax * 0.75).toFixed(1)))
  const [maxAbsences, setMaxAbsences] = useState(String(course?.maxAbsences ?? 5))
  const [components, setComponents] = useState<EvalComponent[]>(
    course?.components ?? [
      { id: uid(), name: 'Parcial', weight: 40, grade: null },
      { id: uid(), name: 'Final', weight: 60, grade: null },
    ],
  )

  const total = components.reduce((s, c) => s + (Number(c.weight) || 0), 0)

  const updateComponent = (id: string, patch: Partial<EvalComponent>) =>
    setComponents((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    actions.saveCourse({
      id: course?.id ?? uid(),
      name: name.trim(),
      code: code.trim(),
      color,
      passingGrade: Number(passingGrade) || 0,
      goalGrade: Number(goalGrade) || 0,
      absences: course?.absences ?? 0,
      maxAbsences: Math.max(0, Math.round(Number(maxAbsences) || 0)),
      components: components.filter((c) => c.name.trim()).map((c) => ({ ...c, name: c.name.trim() })),
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Nombre" htmlFor="course-name">
          <Input id="course-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Ej. Física I" />
        </Field>
        <Field label="Código" htmlFor="course-code">
          <Input id="course-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FIS-101" />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {palette.map((key) => (
            <label key={key} className="cursor-pointer">
              <input type="radio" name="course-color" value={key} checked={color === key} onChange={() => setColor(key)} className="peer sr-only" />
              <span
                className={cn('block size-7 rounded-full ring-offset-2 ring-offset-popover peer-focus-visible:ring-2 peer-focus-visible:ring-ring', color === key && 'ring-2 ring-foreground')}
                style={{ backgroundColor: COURSE_COLORS[key].value }}
              />
              <span className="sr-only">{COURSE_COLORS[key].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nota aprobatoria" htmlFor="course-pass">
          <Input id="course-pass" type="number" step="0.1" min={settings.gradeScaleMin} max={settings.gradeScaleMax} value={passingGrade} onChange={(e) => setPassingGrade(e.target.value)} />
        </Field>
        <Field label="Meta personal" htmlFor="course-goal">
          <Input id="course-goal" type="number" step="0.1" min={settings.gradeScaleMin} max={settings.gradeScaleMax} value={goalGrade} onChange={(e) => setGoalGrade(e.target.value)} />
        </Field>
        <Field label="Faltas máximas" htmlFor="course-max-abs">
          <Input id="course-max-abs" type="number" min={0} step={1} value={maxAbsences} onChange={(e) => setMaxAbsences(e.target.value)} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">Componentes de evaluación</legend>
          <span className={cn('text-xs font-medium tabular', total === 100 ? 'text-planned' : 'text-urgent')}>Total: {total}%</span>
        </div>
        <ul className="flex flex-col gap-2">
          {components.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2">
              <Input aria-label={`Nombre del componente ${i + 1}`} value={c.name} onChange={(e) => updateComponent(c.id, { name: e.target.value })} placeholder="Ej. Laboratorios" />
              <div className="relative w-24 shrink-0">
                <Input
                  aria-label={`Peso del componente ${i + 1}`}
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={c.weight}
                  onChange={(e) => updateComponent(c.id, { weight: Number(e.target.value) })}
                  className="pr-7"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setComponents((l) => l.filter((x) => x.id !== c.id))}>
                <Trash2 />
                <span className="sr-only">Quitar componente</span>
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setComponents((l) => [...l, { id: uid(), name: '', weight: 0, grade: null }])}>
          <Plus data-icon="inline-start" />
          Añadir componente
        </Button>
        {total !== 100 ? <p className="text-xs text-muted-foreground">Los cálculos se normalizan si el total no es 100%, pero conviene que coincida con tu sílabo.</p> : null}
      </fieldset>

      <div className="flex items-center justify-between gap-2 pt-1">
        {course ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (window.confirm(`¿Eliminar "${course.name}"? Sus entregas y bloques quedarán sin asignatura.`)) {
                actions.deleteCourse(course.id)
                onDone()
              }
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
