'use client'

import { GraduationCap, Pencil, Plus, Target } from 'lucide-react'
import { useState } from 'react'
import { CourseFormModal } from '@/components/forms/course-form'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Card, EmptyState, PageHeader } from '@/components/ui/shared'
import { courseColor } from '@/lib/colors'
import { formatGrade, needStatus, summarizeCourse, type NeedStatus } from '@/lib/grades'
import { actions, useAppData } from '@/lib/store'
import type { Course, Settings } from '@/lib/types'
import { cn } from '@/lib/utils'

const NEED_COPY: Record<NeedStatus, { label: string; className: string }> = {
  secured: { label: 'Asegurado', className: 'text-planned bg-planned/12' },
  reachable: { label: 'Alcanzable', className: 'text-primary bg-primary/10' },
  hard: { label: 'Exigente', className: 'text-moderate-foreground bg-moderate/15' },
  impossible: { label: 'Fuera de alcance', className: 'text-urgent bg-urgent/12' },
  closed: { label: 'No alcanzado', className: 'text-urgent bg-urgent/12' },
}

export function GradesView() {
  const { courses, settings } = useAppData()
  const [editing, setEditing] = useState<Course | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notas y metas"
        description="Registra tus calificaciones y descubre cuánto necesitas en lo que queda para aprobar o alcanzar tu meta."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            Nueva asignatura
          </Button>
        }
      />

      <ScaleSettings settings={settings} />

      {courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-5" />}
          title="Sin asignaturas"
          description="Crea tus cursos con sus componentes de evaluación para calcular tus notas."
          action={<Button onClick={() => setCreating(true)}>Crear asignatura</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <CourseGradeCard key={course.id} course={course} settings={settings} onEdit={() => setEditing(course)} />
          ))}
        </div>
      )}

      <CourseFormModal
        open={creating || editing !== null}
        course={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function ScaleSettings({ settings }: { settings: Settings }) {
  return (
    <details className="group rounded-2xl border bg-card px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-medium">
        Escala de calificación: <span className="tabular">{settings.gradeScaleMin}</span> a <span className="tabular">{settings.gradeScaleMax}</span>
        <span className="ml-2 text-xs text-muted-foreground group-open:hidden">Cambiar</span>
      </summary>
      <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
        <Field label="Mínima" htmlFor="scale-min">
          <Input
            id="scale-min"
            type="number"
            step="0.1"
            value={settings.gradeScaleMin}
            onChange={(e) => actions.saveSettings({ ...settings, gradeScaleMin: Number(e.target.value) })}
          />
        </Field>
        <Field label="Máxima" htmlFor="scale-max">
          <Input
            id="scale-max"
            type="number"
            step="0.1"
            value={settings.gradeScaleMax}
            onChange={(e) => actions.saveSettings({ ...settings, gradeScaleMax: Number(e.target.value) || 1 })}
          />
        </Field>
      </div>
    </details>
  )
}

function CourseGradeCard({ course, settings, onEdit }: { course: Course; settings: Settings; onEdit: () => void }) {
  const summary = summarizeCourse(course, settings)
  const finalIfClosed = summary.currentAverage ?? 0
  const passStatus = needStatus(summary.neededToPass, finalIfClosed, course.passingGrade, settings)
  const goalStatus = needStatus(summary.neededForGoal, finalIfClosed, course.goalGrade, settings)
  const range = settings.gradeScaleMax - settings.gradeScaleMin || 1
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - settings.gradeScaleMin) / range) * 100))}%`

  const setGrade = (componentId: string, raw: string) => {
    const grade = raw === '' ? null : Math.max(settings.gradeScaleMin, Math.min(settings.gradeScaleMax, Number(raw)))
    actions.updateCourse(course.id, {
      components: course.components.map((c) => (c.id === componentId ? { ...c, grade } : c)),
    })
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: courseColor(course) }} aria-hidden />
          <div>
            <h2 className="font-semibold">{course.name}</h2>
            <p className="text-xs text-muted-foreground">
              {course.code ? `${course.code} · ` : ''}Aprueba con {formatGrade(course.passingGrade)} · Meta {formatGrade(course.goalGrade)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onEdit}>
          <Pencil />
          <span className="sr-only">Editar {course.name}</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Promedio actual" value={formatGrade(summary.currentAverage)} />
        <Stat label="Proyección" value={formatGrade(summary.projectedFinal)} />
        <Stat label="Avance evaluado" value={`${Math.round(summary.totalWeight ? (summary.gradedWeight / summary.totalWeight) * 100 : 0)}%`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="relative h-2.5 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: pos(summary.projectedFinal ?? settings.gradeScaleMin) }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pos(summary.guaranteedFinal) }} />
          <span className="absolute -inset-y-1 w-0.5 bg-urgent" style={{ left: pos(course.passingGrade) }} title="Nota aprobatoria" />
          <span className="absolute -inset-y-1 w-0.5 bg-planned" style={{ left: pos(course.goalGrade) }} title="Meta" />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Asegurado: {formatGrade(summary.guaranteedFinal)}</span>
          <span className="flex gap-3">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-0.5 bg-urgent" />Aprobar</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-0.5 bg-planned" />Meta</span>
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <NeedBox icon={<GraduationCap className="size-4" />} title="Para aprobar" needed={summary.neededToPass} status={passStatus} remaining={summary.remainingWeight} />
        <NeedBox icon={<Target className="size-4" />} title="Para tu meta" needed={summary.neededForGoal} status={goalStatus} remaining={summary.remainingWeight} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">Componente</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Peso</th>
              <th scope="col" className="w-28 px-3 py-2 text-right font-medium">Nota</th>
            </tr>
          </thead>
          <tbody>
            {course.components.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-1.5">{c.name}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground tabular">{c.weight}%</td>
                <td className="px-3 py-1.5">
                  <Input
                    aria-label={`Nota de ${c.name}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={settings.gradeScaleMin}
                    max={settings.gradeScaleMax}
                    placeholder="—"
                    value={c.grade ?? ''}
                    onChange={(e) => setGrade(c.id, e.target.value)}
                    className="h-8 text-right tabular"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-2 py-2.5">
      <p className="text-xl font-semibold tabular">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function NeedBox({
  icon,
  title,
  needed,
  status,
  remaining,
}: {
  icon: React.ReactNode
  title: string
  needed: number | null
  status: NeedStatus
  remaining: number
}) {
  const copy = NEED_COPY[status]
  let detail: string
  if (status === 'secured') detail = needed === null ? 'Ya lo lograste.' : 'Lo logras incluso con la nota mínima.'
  else if (status === 'closed') detail = 'No quedan evaluaciones pendientes.'
  else if (status === 'impossible') detail = `Necesitarías ${formatGrade(needed)}, por encima de la escala.`
  else detail = `Necesitas promediar ${formatGrade(needed)} en el ${remaining}% restante.`

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {title}
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', copy.className)}>{copy.label}</span>
      </div>
      <p className="text-xs text-muted-foreground text-pretty">{detail}</p>
    </div>
  )
}
