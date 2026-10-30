'use client'

import { ChevronLeft, ChevronRight, Clock, KanbanSquare, Plus } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { STATUS_LABELS, TaskFormModal } from '@/components/forms/task-form'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { CourseTag, EmptyState, PageHeader, PriorityBadge } from '@/components/ui/shared'
import { formatDue, formatMinutes, relativeDue } from '@/lib/date'
import { useNow } from '@/lib/hooks'
import { getPriority } from '@/lib/priority'
import { actions, useAppData } from '@/lib/store'
import type { Course, Priority, Task, TaskStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLUMNS: TaskStatus[] = ['pending', 'in_progress', 'to_submit', 'done']

export function KanbanView() {
  const { tasks, courses } = useAppData()
  const now = useNow(60_000)
  const [courseFilter, setCourseFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | Priority>('all')
  const [editing, setEditing] = useState<Task | null>(null)
  const [creatingIn, setCreatingIn] = useState<TaskStatus | null>(null)
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])

  const filtered = useMemo(
    () =>
      tasks
        .map((task) => ({ task, priority: getPriority(task, now) }))
        .filter(({ task, priority }) => {
          if (courseFilter !== 'all' && (task.courseId ?? 'none') !== courseFilter) return false
          if (urgencyFilter !== 'all' && priority?.level !== urgencyFilter) return false
          return true
        })
        .sort((a, b) => (b.priority?.score ?? -1) - (a.priority?.score ?? -1) || a.task.dueDate.localeCompare(b.task.dueDate)),
    [tasks, now, courseFilter, urgencyFilter],
  )

  const onDrop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) actions.updateTask(id, { status })
    setDragOver(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tablero académico"
        description="Arrastra las tarjetas entre columnas o usa las flechas. Se ordenan por prioridad automáticamente."
        actions={
          <Button onClick={() => setCreatingIn('pending')}>
            <Plus data-icon="inline-start" />
            Nueva entrega
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="filter-course">
          Filtrar por asignatura
        </label>
        <Select id="filter-course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-auto min-w-44">
          <option value="all">Todas las asignaturas</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">Sin asignatura</option>
        </Select>
        <label className="sr-only" htmlFor="filter-urgency">
          Filtrar por urgencia
        </label>
        <Select
          id="filter-urgency"
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value as 'all' | Priority)}
          className="w-auto min-w-40"
        >
          <option value="all">Toda urgencia</option>
          <option value="urgent">Urgente</option>
          <option value="moderate">Moderado</option>
          <option value="planned">Planificado</option>
        </Select>
        {(courseFilter !== 'all' || urgencyFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCourseFilter('all')
              setUrgencyFilter('all')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare className="size-5" />}
          title="Aún no tienes entregas"
          description="Registra tareas, proyectos y exámenes para organizarlos por estado y prioridad."
          action={<Button onClick={() => setCreatingIn('pending')}>Crear la primera</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((status, colIdx) => {
            const items = filtered.filter(({ task }) => task.status === status)
            return (
              <section
                key={status}
                aria-label={STATUS_LABELS[status]}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(status)
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={onDrop(status)}
                className={cn(
                  'flex min-h-48 flex-col gap-3 rounded-2xl border bg-muted/40 p-3 transition-colors',
                  dragOver === status && 'border-primary bg-accent/50',
                )}
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground tabular">
                      {items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreatingIn(status)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Plus className="size-4" />
                      <span className="sr-only">Añadir en {STATUS_LABELS[status]}</span>
                    </button>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {items.map(({ task, priority }) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      course={task.courseId ? courseById.get(task.courseId) : null}
                      priority={priority?.level ?? null}
                      now={now}
                      canPrev={colIdx > 0}
                      canNext={colIdx < COLUMNS.length - 1}
                      onPrev={() => actions.updateTask(task.id, { status: COLUMNS[colIdx - 1] })}
                      onNext={() => actions.updateTask(task.id, { status: COLUMNS[colIdx + 1] })}
                      onEdit={() => setEditing(task)}
                    />
                  ))}
                </ul>
                {items.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">Suelta una tarjeta aquí</p>
                ) : null}
              </section>
            )
          })}
        </div>
      )}

      <TaskFormModal
        open={editing !== null || creatingIn !== null}
        task={editing}
        initialStatus={creatingIn ?? 'pending'}
        onClose={() => {
          setEditing(null)
          setCreatingIn(null)
        }}
      />
    </div>
  )
}

function TaskCard({
  task,
  course,
  priority,
  now,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onEdit,
}: {
  task: Task
  course: Course | null | undefined
  priority: Priority | null
  now: Date
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onEdit: () => void
}) {
  const done = task.status === 'done'
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="group flex cursor-grab flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-xs active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <CourseTag course={course} />
        {priority ? <PriorityBadge level={priority} /> : null}
      </div>
      <button type="button" onClick={onEdit} className="text-left">
        <span className={cn('text-sm font-medium leading-snug text-pretty hover:underline', done && 'text-muted-foreground line-through')}>
          {task.kind === 'examen' && !/examen/i.test(task.title) ? 'Examen · ' : ''}
          {task.title}
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" title={formatDue(task.dueDate)}>
          <Clock className="size-3" />
          {done ? formatDue(task.dueDate) : relativeDue(task.dueDate, now)}
        </span>
        <span className="tabular">{task.weight}% de la nota</span>
        {task.minutesSpent > 0 ? <span>{formatMinutes(task.minutesSpent)} invertidos</span> : null}
      </div>
      <div className="flex items-center justify-end gap-1 border-t pt-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrev}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Mover a la columna anterior</span>
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Mover a la columna siguiente</span>
        </button>
      </div>
    </li>
  )
}
