'use client'

import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Card, CourseTag, EmptyState, PageHeader, Segmented } from '@/components/ui/shared'
import { isDue, previewInterval, schedule, type Rating } from '@/lib/srs'
import { actions, uid, useAppData } from '@/lib/store'
import type { Flashcard } from '@/lib/types'
import { cn } from '@/lib/utils'

const RATINGS: { value: Rating; label: string; className: string }[] = [
  { value: 'again', label: 'Otra vez', className: 'border-urgent/40 text-urgent hover:bg-urgent/10' },
  { value: 'hard', label: 'Difícil', className: 'border-moderate/50 text-moderate-foreground hover:bg-moderate/10' },
  { value: 'good', label: 'Bien', className: 'border-primary/40 text-primary hover:bg-primary/10' },
  { value: 'easy', label: 'Fácil', className: 'border-planned/40 text-planned hover:bg-planned/10' },
]

export function FlashcardsView() {
  const { flashcards, courses } = useAppData()
  const [mode, setMode] = useState<'review' | 'manage'>('review')
  const [courseFilter, setCourseFilter] = useState('all')
  const [editing, setEditing] = useState<Flashcard | null>(null)
  const [creating, setCreating] = useState(false)

  const deck = useMemo(
    () => flashcards.filter((f) => courseFilter === 'all' || (f.courseId ?? 'none') === courseFilter),
    [flashcards, courseFilter],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flashcards"
        description="Repaso espaciado: las tarjetas que dominas aparecen con menos frecuencia."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            Nueva tarjeta
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Modo"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'review', label: 'Repasar' },
            { value: 'manage', label: 'Gestionar' },
          ]}
        />
        <label htmlFor="fc-course" className="sr-only">
          Mazo
        </label>
        <Select id="fc-course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-auto min-w-44">
          <option value="all">Todos los mazos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">Sin asignatura</option>
        </Select>
      </div>

      {flashcards.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-5" />}
          title="Aún no tienes tarjetas"
          description="Crea preguntas y respuestas para repasar conceptos clave antes de tus exámenes."
          action={<Button onClick={() => setCreating(true)}>Crear tarjeta</Button>}
        />
      ) : mode === 'review' ? (
        <ReviewSession key={courseFilter} deck={deck} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {deck.map((card) => (
            <li key={card.id}>
              <Card className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <CourseTag course={courses.find((c) => c.id === card.courseId)} />
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => setEditing(card)}>
                      <Pencil />
                      <span className="sr-only">Editar tarjeta</span>
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => actions.deleteFlashcard(card.id)}>
                      <Trash2 />
                      <span className="sr-only">Eliminar tarjeta</span>
                    </Button>
                  </div>
                </div>
                <p className="text-sm font-medium text-pretty">{card.front}</p>
                <p className="text-sm text-muted-foreground text-pretty">{card.back}</p>
                <p className="mt-auto pt-1 text-[11px] text-muted-foreground">
                  {isDue(card) ? 'Para repasar ahora' : `Próximo repaso: ${new Date(card.due).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        title={editing ? 'Editar tarjeta' : 'Nueva tarjeta'}
      >
        {creating || editing ? (
          <CardForm
            key={editing?.id ?? 'new'}
            card={editing}
            defaultCourseId={courseFilter !== 'all' && courseFilter !== 'none' ? courseFilter : (courses[0]?.id ?? null)}
            onDone={(keepOpen) => {
              if (!keepOpen) {
                setCreating(false)
                setEditing(null)
              }
            }}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function ReviewSession({ deck }: { deck: Flashcard[] }) {
  const [queue, setQueue] = useState(() => deck.filter((c) => isDue(c)).map((c) => c.id))
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const current = deck.find((c) => c.id === queue[0])

  const rate = (rating: Rating) => {
    if (!current) return
    const next = schedule(current, rating)
    actions.saveFlashcard(next)
    setReviewed((n) => n + 1)
    setRevealed(false)
    setQueue((q) => (rating === 'again' ? [...q.slice(1), current.id] : q.slice(1)))
  }

  if (!current) {
    const upcoming = deck.map((c) => new Date(c.due).getTime()).sort((a, b) => a - b)[0]
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <p className="text-lg font-semibold">{reviewed > 0 ? '¡Repaso completado!' : 'Nada pendiente por ahora'}</p>
        <p className="text-sm text-muted-foreground">
          {reviewed > 0 ? `Repasaste ${reviewed} ${reviewed === 1 ? 'tarjeta' : 'tarjetas'}. ` : ''}
          {upcoming ? `La próxima vence el ${new Date(upcoming).toLocaleString('es', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.` : ''}
        </p>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground tabular">
        {queue.length} {queue.length === 1 ? 'pendiente' : 'pendientes'} · {reviewed} repasadas
      </p>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? 'Ocultar respuesta' : 'Mostrar respuesta'}
        className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-sm transition-colors hover:border-ring"
      >
        <span className="text-xl font-semibold text-balance">{current.front}</span>
        {revealed ? (
          <>
            <span className="h-px w-16 bg-border" aria-hidden />
            <span className="text-base text-muted-foreground text-pretty">{current.back}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Toca para ver la respuesta</span>
        )}
      </button>
      {revealed ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => rate(r.value)}
              className={cn('flex flex-col items-center gap-0.5 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium transition-colors', r.className)}
            >
              {r.label}
              <span className="text-[11px] font-normal text-muted-foreground">{previewInterval(current, r.value)}</span>
            </button>
          ))}
        </div>
      ) : (
        <Button size="lg" onClick={() => setRevealed(true)}>
          Mostrar respuesta
        </Button>
      )}
    </div>
  )
}

function CardForm({ card, defaultCourseId, onDone }: { card: Flashcard | null; defaultCourseId: string | null; onDone: (keepOpen?: boolean) => void }) {
  const { courses } = useAppData()
  const [front, setFront] = useState(card?.front ?? '')
  const [back, setBack] = useState(card?.back ?? '')
  const [courseId, setCourseId] = useState(card?.courseId ?? defaultCourseId ?? '')
  const [another, setAnother] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    const now = new Date().toISOString()
    actions.saveFlashcard(
      card
        ? { ...card, front: front.trim(), back: back.trim(), courseId: courseId || null }
        : { id: uid(), front: front.trim(), back: back.trim(), courseId: courseId || null, interval: 0, ease: 2.5, reps: 0, due: now, createdAt: now },
    )
    if (another && !card) {
      setFront('')
      setBack('')
      onDone(true)
    } else onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Mazo" htmlFor="card-course">
        <Select id="card-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Sin asignatura</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pregunta" htmlFor="card-front">
        <Textarea id="card-front" value={front} onChange={(e) => setFront(e.target.value)} required autoFocus />
      </Field>
      <Field label="Respuesta" htmlFor="card-back">
        <Textarea id="card-back" value={back} onChange={(e) => setBack(e.target.value)} required />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {!card ? (
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} className="size-4 accent-primary" />
            Crear otra después
          </label>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onDone()}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </div>
    </form>
  )
}
