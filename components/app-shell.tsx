'use client'

import {
  BookOpenCheck,
  CalendarClock,
  Database,
  GraduationCap,
  Hourglass,
  KanbanSquare,
  LayoutDashboard,
  Layers,
  Menu,
  Moon,
  Sun,
  Timer,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatDuration } from '@/lib/date'
import { navigate, useTheme, useView, type ViewId } from '@/lib/hooks'
import { usePomodoro } from '@/lib/pomodoro'
import { useHydrated } from '@/lib/store'
import { cn } from '@/lib/utils'
import { AttendanceView } from './views/attendance-view'
import { DashboardView } from './views/dashboard-view'
import { DataView } from './views/data-view'
import { ExamView } from './views/exam-view'
import { FlashcardsView } from './views/flashcards-view'
import { GradesView } from './views/grades-view'
import { KanbanView } from './views/kanban-view'
import { PlannerView } from './views/planner-view'
import { PomodoroView } from './views/pomodoro-view'

interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Planificación',
    items: [
      { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
      { id: 'tablero', label: 'Tablero', icon: KanbanSquare },
      { id: 'horario', label: 'Horario semanal', icon: CalendarClock },
    ],
  },
  {
    label: 'Rendimiento',
    items: [
      { id: 'notas', label: 'Notas y metas', icon: GraduationCap },
      { id: 'asistencia', label: 'Asistencia', icon: UserCheck },
    ],
  },
  {
    label: 'Estudio',
    items: [
      { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
      { id: 'flashcards', label: 'Flashcards', icon: Layers },
      { id: 'examen', label: 'Modo examen', icon: Hourglass },
    ],
  },
  {
    label: 'Sistema',
    items: [{ id: 'datos', label: 'Datos y calendario', icon: Database }],
  },
]

const VIEW_COMPONENTS: Record<ViewId, () => ReactNode> = {
  resumen: DashboardView,
  tablero: KanbanView,
  horario: PlannerView,
  notas: GradesView,
  asistencia: AttendanceView,
  pomodoro: PomodoroView,
  flashcards: FlashcardsView,
  examen: ExamView,
  datos: DataView,
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpenCheck className="size-4.5" />
      </div>
      <span className="text-base font-semibold tracking-tight">MiSemestre</span>
    </div>
  )
}

function NavList({ active, onSelect }: { active: ViewId; onSelect: () => void }) {
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon
            const isActive = item.id === active
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={onSelect}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </a>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function MiniTimer() {
  const p = usePomodoro()
  if (p.status === 'idle' && !p.alarmAt) return null
  return (
    <button
      type="button"
      onClick={() => navigate('pomodoro')}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left',
        p.alarmAt && 'animate-pulse border-primary',
      )}
    >
      <Timer className={cn('size-4', p.phase === 'focus' ? 'text-primary' : 'text-planned')} />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">
          {p.phase === 'focus' ? 'Enfoque' : 'Descanso'}
          {p.status === 'paused' ? ' · pausado' : ''}
        </span>
        <span className="font-mono text-sm font-semibold tabular">{formatDuration(p.remainingMs)}</span>
      </div>
    </button>
  )
}

function ThemeButton() {
  const [theme, toggle] = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">{theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}</span>
    </button>
  )
}

export function AppShell() {
  const view = useView()
  const hydrated = useHydrated()
  const [menuOpen, setMenuOpen] = useState(false)
  const ActiveView = VIEW_COMPONENTS[view]

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-5 lg:flex">
        <div className="flex items-center justify-between px-2">
          <Brand />
          <ThemeButton />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList active={view} onSelect={() => {}} />
        </div>
        <MiniTimer />
        <p className="px-3 text-[11px] leading-relaxed text-muted-foreground">
          Tus datos se guardan solo en este dispositivo.
        </p>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col gap-6 bg-sidebar px-3 py-5 shadow-xl">
            <div className="flex items-center justify-between px-2">
              <Brand />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
                <span className="sr-only">Cerrar menú</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList active={view} onSelect={() => setMenuOpen(false)} />
            </div>
            <MiniTimer />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"
          >
            <Menu className="size-5" />
            <span className="sr-only">Abrir menú</span>
          </button>
          <Brand />
          <ThemeButton />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {hydrated ? (
            <ActiveView key={view} />
          ) : (
            <div className="flex flex-col gap-4" aria-busy="true">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
              <div className="h-40 animate-pulse rounded-2xl bg-muted" />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
