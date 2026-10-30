'use client'

import { CalendarPlus, Download, RotateCcw, Sparkles, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Card, PageHeader } from '@/components/ui/shared'
import { toLocalDateInput } from '@/lib/date'
import { buildCalendar, downloadFile } from '@/lib/ics'
import { actions, getData, normalizeData, replaceData, useAppData } from '@/lib/store'

export function DataView() {
  const data = useAppData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [includeDone, setIncludeDone] = useState(false)
  const [includeBlocks, setIncludeBlocks] = useState(true)
  const [reminder, setReminder] = useState('24')
  const [until, setUntil] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 4)
    return toLocalDateInput(d)
  })

  const stamp = toLocalDateInput(new Date())

  const exportJson = () => {
    downloadFile(JSON.stringify(getData(), null, 2), `misemestre-respaldo-${stamp}.json`, 'application/json')
    setMessage({ tone: 'ok', text: 'Respaldo descargado.' })
  }

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.courses)) throw new Error('invalid')
      const next = normalizeData(parsed)
      if (!window.confirm(`Esto reemplazará tus datos actuales con ${next.courses.length} asignaturas y ${next.tasks.length} entregas. ¿Continuar?`)) return
      replaceData(next)
      setMessage({ tone: 'ok', text: 'Datos importados correctamente.' })
    } catch {
      setMessage({ tone: 'error', text: 'El archivo no es un respaldo válido de MiSemestre.' })
    }
  }

  const exportIcs = () => {
    const tasks = data.tasks.filter((t) => includeDone || t.status !== 'done')
    const ics = buildCalendar({
      tasks,
      courses: data.courses,
      blocks: includeBlocks ? data.blocks : [],
      blocksUntil: new Date(`${until}T23:59:59`),
      reminderHours: Number(reminder),
    })
    downloadFile(ics, `misemestre-${stamp}.ics`, 'text/calendar;charset=utf-8')
    setMessage({ tone: 'ok', text: `Calendario exportado con ${tasks.length} fechas límite.` })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Datos y calendario" description="Tus datos viven solo en este navegador. Respáldalos con frecuencia o llévalos a otro dispositivo." />

      {message ? (
        <p role="status" className={message.tone === 'ok' ? 'rounded-xl bg-planned/12 px-4 py-2.5 text-sm text-planned' : 'rounded-xl bg-urgent/12 px-4 py-2.5 text-sm text-urgent'}>
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-primary" />
            <h2 className="font-semibold">Exportar a calendario (.ics)</h2>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            Importa el archivo en Google Calendar, Apple Calendar u Outlook para recibir recordatorios nativos de tus entregas y exámenes.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recordatorio" htmlFor="ics-reminder">
              <Select id="ics-reminder" value={reminder} onChange={(e) => setReminder(e.target.value)}>
                <option value="0">Sin recordatorio</option>
                <option value="2">2 horas antes</option>
                <option value="24">1 día antes</option>
                <option value="48">2 días antes</option>
                <option value="168">1 semana antes</option>
              </Select>
            </Field>
            <Field label="Repetir horario hasta" htmlFor="ics-until">
              <Input id="ics-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} disabled={!includeBlocks} />
            </Field>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeBlocks} onChange={(e) => setIncludeBlocks(e.target.checked)} className="size-4 accent-primary" />
              Incluir horario semanal como eventos recurrentes
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} className="size-4 accent-primary" />
              Incluir entregas completadas
            </label>
          </div>
          <Button onClick={exportIcs} className="self-start">
            <Download data-icon="inline-start" />
            Descargar .ics
          </Button>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <Download className="size-5 text-primary" />
            <h2 className="font-semibold">Respaldo completo</h2>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            Exporta todo (asignaturas, notas, horario, tarjetas y sesiones) a un archivo JSON que puedes volver a importar en cualquier navegador.
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center text-sm">
            {[
              ['Asignaturas', data.courses.length],
              ['Entregas', data.tasks.length],
              ['Tarjetas', data.flashcards.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/50 py-2">
                <dd className="text-lg font-semibold tabular">{value}</dd>
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportJson}>
              <Download data-icon="inline-start" />
              Exportar JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload data-icon="inline-start" />
              Importar JSON
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={importJson} />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
          <h2 className="font-semibold">Restablecer</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('¿Reemplazar tus datos con el semestre de ejemplo?')) {
                  actions.loadDemo()
                  setMessage({ tone: 'ok', text: 'Datos de ejemplo cargados.' })
                }
              }}
            >
              <Sparkles data-icon="inline-start" />
              Cargar datos de ejemplo
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm('¿Borrar todos tus datos? Exporta un respaldo antes si quieres conservarlos.')) {
                  actions.resetAll()
                  setMessage({ tone: 'ok', text: 'Empezaste un semestre en blanco.' })
                }
              }}
            >
              <RotateCcw data-icon="inline-start" />
              Empezar en blanco
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
