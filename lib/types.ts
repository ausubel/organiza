export type CourseColor =
  | 'indigo'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'lime'
  | 'violet'
  | 'orange'

export interface EvalComponent {
  id: string
  name: string
  weight: number
  grade: number | null
}

export interface Course {
  id: string
  name: string
  code: string
  color: CourseColor
  components: EvalComponent[]
  passingGrade: number
  goalGrade: number
  absences: number
  maxAbsences: number
}

export type TaskStatus = 'pending' | 'in_progress' | 'to_submit' | 'done'
export type TaskKind = 'entrega' | 'examen'

export interface Task {
  id: string
  title: string
  courseId: string | null
  /** Local datetime in `YYYY-MM-DDTHH:mm` format (same as <input type="datetime-local">). */
  dueDate: string
  weight: number
  status: TaskStatus
  kind: TaskKind
  minutesSpent: number
  createdAt: string
}

export type BlockKind = 'clase' | 'estudio'

export interface ScheduleBlock {
  id: string
  /** 0 = Lunes … 6 = Domingo */
  day: number
  start: string
  end: string
  title: string
  courseId: string | null
  kind: BlockKind
  location: string
}

export interface Flashcard {
  id: string
  courseId: string | null
  front: string
  back: string
  interval: number
  ease: number
  reps: number
  due: string
  createdAt: string
}

export interface FocusSession {
  id: string
  startedAt: string
  minutes: number
  courseId: string | null
  taskId: string | null
}

export interface Settings {
  gradeScaleMin: number
  gradeScaleMax: number
}

export interface AppData {
  version: 1
  courses: Course[]
  tasks: Task[]
  blocks: ScheduleBlock[]
  flashcards: Flashcard[]
  sessions: FocusSession[]
  settings: Settings
}

export type Priority = 'urgent' | 'moderate' | 'planned'
