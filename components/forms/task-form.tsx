'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { toLocalInput } from '@/lib/date'
import { actions, uid, useAppData } from '@/lib/store'
import type { Task, TaskKind, TaskStatus } from '@/lib/types'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  to_submit: 'Por entregar',
  done: 'Completado',
}

function defaultDue() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(23, 59, 0, 0)
  return toLocalInput(d)
}

export function TaskFormModal({
  open,
  onClose,
  task,
  initialStatus = 'pending',
}: {
  open: boolean
  onClose: () => void
  task?: Task | null
  initialStatus?: TaskStatus
}) {
  return (
    <Modal open={open} onClose={onClose} title={task ? 'Editar entrega' : 'Nueva entrega'}>
      {open ? <TaskForm key={task?.id ?? 'new'} task={task} initialStatus={initialStatus} onDone={onClose} /> : null}
    </Modal>
  )
}

function TaskForm({ task, initialStatus, onDone }: { task?: Task | null; initialStatus: TaskStatus; onDone: () => void }) {
  const { courses } = useAppData()
  const [title, setTitle] = useState(task?.title ?? '')
  const [courseId, setCourseId] = useState(task?.courseId ?? courses[0]?.id ?? '')
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? 'entrega')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDue())
  const [weight, setWeight] = useState(String(task?.weight ?? 10))
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !dueDate) return
    actions.saveTask({
      id: task?.id ?? uid(),
      title: title.trim(),
      courseId: courseId || null,
      kind,
      dueDate,
      weight: Math.max(0, Math.min(100, Number(weight) || 0)),
      status,
      minutesSpent: task?.minutesSpent ?? 0,
      createdAt: task?.createdAt ?? new Date().toISOString(),
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Título" htmlFor="task-title">
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Informe de laboratorio 3"
          required
          autoFocus
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asignatura" htmlFor="task-course">
          <Select id="task-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Sin asignatura</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo" htmlFor="task-kind">
          <Select id="task-kind" value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
            <option value="entrega">Entrega / tarea</option>
            <option value="examen">Examen</option>
          </Select>
        </Field>
        <Field label="Fecha límite" htmlFor="task-due">
          <Input id="task-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </Field>
        <Field label="Peso en la nota (%)" htmlFor="task-weight">
          <Input
            id="task-weight"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Field label="Estado" htmlFor="task-status" className="sm:col-span-2">
          <Select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        {task ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              actions.deleteTask(task.id)
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
          <Button type="submit">{task ? 'Guardar cambios' : 'Crear entrega'}</Button>
        </div>
      </div>
    </form>
  )
}
