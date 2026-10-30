'use client'

import { AlertTriangle, Minus, Plus, ShieldAlert, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, PageHeader, ProgressBar } from '@/components/ui/shared'
import { courseColor } from '@/lib/colors'
import { attendanceLevel, type AttendanceLevel } from '@/lib/grades'
import { navigate } from '@/lib/hooks'
import { actions, useAppData } from '@/lib/store'
import type { Course } from '@/lib/types'
import { cn } from '@/lib/utils'

const LEVEL_META: Record<AttendanceLevel, { label: string; bar: string; badge: string }> = {
  ok: { label: 'En regla', bar: 'bg-planned', badge: 'bg-planned/12 text-planned' },
  warning: { label: 'Atención', bar: 'bg-moderate', badge: 'bg-moderate/15 text-moderate-foreground' },
  danger: { label: 'Riesgo de DPI', bar: 'bg-urgent', badge: 'bg-urgent/12 text-urgent' },
  dpi: { label: 'Límite alcanzado', bar: 'bg-urgent', badge: 'bg-urgent text-white' },
}

export function AttendanceView() {
  const { courses } = useAppData()
  const atRisk = courses.filter((c) => attendanceLevel(c).ratio >= 0.7)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Control de asistencia"
        description="Registra tus faltas por asignatura. Te avisamos al llegar al 70% del límite para evitar la inhabilitación (DPI)."
      />

      {atRisk.length > 0 ? (
        <div role="alert" className="flex gap-3 rounded-2xl border border-urgent/30 bg-urgent/8 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-urgent" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              {atRisk.length === 1 ? '1 asignatura cerca del límite de faltas' : `${atRisk.length} asignaturas cerca del límite de faltas`}
            </p>
            <p className="text-sm text-muted-foreground">{atRisk.map((c) => c.name).join(', ')}. Prioriza asistir a estas clases.</p>
          </div>
        </div>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="size-5" />}
          title="Sin asignaturas"
          description="Crea tus asignaturas en Notas y metas para empezar a registrar asistencia."
          action={<Button onClick={() => navigate('notas')}>Ir a Notas y metas</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <AttendanceCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}

function AttendanceCard({ course }: { course: Course }) {
  const { ratio, level } = attendanceLevel(course)
  const meta = LEVEL_META[level]
  const left = Math.max(0, course.maxAbsences - course.absences)

  return (
    <Card className={cn('flex flex-col gap-4 p-5', level !== 'ok' && level !== 'warning' && 'border-urgent/40')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: courseColor(course) }} aria-hidden />
          <h2 className="truncate font-semibold">{course.name}</h2>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', meta.badge)}>{meta.label}</span>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-3xl font-semibold tabular">
          {course.absences}
          <span className="text-base font-normal text-muted-foreground"> / {course.maxAbsences}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {level === 'dpi' ? 'Sin margen' : left === 1 ? 'Te queda 1 falta' : `Te quedan ${left} faltas`}
        </p>
      </div>

      <ProgressBar value={ratio} barClassName={meta.bar} label={`Faltas usadas en ${course.name}`} />

      {level === 'warning' || level === 'danger' ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-moderate-foreground" />
          Has usado el {Math.round(ratio * 100)}% de tus faltas permitidas.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={course.absences === 0}
          onClick={() => actions.updateCourse(course.id, { absences: Math.max(0, course.absences - 1) })}
        >
          <Minus data-icon="inline-start" />
          Quitar
        </Button>
        <Button size="sm" className="flex-1" onClick={() => actions.updateCourse(course.id, { absences: course.absences + 1 })}>
          <Plus data-icon="inline-start" />
          Registrar falta
        </Button>
      </div>
    </Card>
  )
}
