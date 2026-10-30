import { toLocalInput } from './date'
import type { AppData, Course, Flashcard, ScheduleBlock, Task } from './types'

const id = (prefix: string, n: number) => `${prefix}-demo-${n}`

function inDays(days: number, hour = 23, minute = 59): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return toLocalInput(d)
}

export function createSeedData(): AppData {
  const now = new Date().toISOString()

  const courses: Course[] = [
    {
      id: id('c', 1),
      name: 'Cálculo II',
      code: 'MAT-202',
      color: 'indigo',
      passingGrade: 10.5,
      goalGrade: 15,
      absences: 3,
      maxAbsences: 4,
      components: [
        { id: id('e', 1), name: 'Prácticas', weight: 20, grade: 14 },
        { id: id('e', 2), name: 'Parcial', weight: 30, grade: 11 },
        { id: id('e', 3), name: 'Final', weight: 50, grade: null },
      ],
    },
    {
      id: id('c', 2),
      name: 'Programación Web',
      code: 'INF-310',
      color: 'teal',
      passingGrade: 10.5,
      goalGrade: 17,
      absences: 1,
      maxAbsences: 6,
      components: [
        { id: id('e', 4), name: 'Laboratorios', weight: 30, grade: 17 },
        { id: id('e', 5), name: 'Proyecto', weight: 40, grade: null },
        { id: id('e', 6), name: 'Examen final', weight: 30, grade: null },
      ],
    },
    {
      id: id('c', 3),
      name: 'Historia del Arte',
      code: 'HUM-105',
      color: 'amber',
      passingGrade: 10.5,
      goalGrade: 14,
      absences: 2,
      maxAbsences: 5,
      components: [
        { id: id('e', 7), name: 'Ensayos', weight: 40, grade: 13 },
        { id: id('e', 8), name: 'Exposición', weight: 20, grade: null },
        { id: id('e', 9), name: 'Final', weight: 40, grade: null },
      ],
    },
  ]

  const task = (
    n: number,
    title: string,
    courseIdx: number,
    days: number,
    weight: number,
    status: Task['status'],
    kind: Task['kind'] = 'entrega',
  ): Task => ({
    id: id('t', n),
    title,
    courseId: courses[courseIdx].id,
    dueDate: inDays(days, kind === 'examen' ? 9 : 23, kind === 'examen' ? 0 : 59),
    weight,
    status,
    kind,
    minutesSpent: 0,
    createdAt: now,
  })

  const tasks: Task[] = [
    task(1, 'Problemas de integrales dobles', 0, 1, 10, 'in_progress'),
    task(2, 'Examen final de Cálculo', 0, 12, 50, 'pending', 'examen'),
    task(3, 'Entrega sprint 2 del proyecto', 1, 4, 20, 'to_submit'),
    task(4, 'Laboratorio de React', 1, 9, 10, 'pending'),
    task(5, 'Ensayo sobre el Barroco', 2, 18, 15, 'pending'),
    task(6, 'Lectura: Gombrich cap. 3', 2, -2, 5, 'done'),
  ]

  const block = (
    n: number,
    day: number,
    start: string,
    end: string,
    title: string,
    courseIdx: number | null,
    kind: ScheduleBlock['kind'],
    location = '',
  ): ScheduleBlock => ({
    id: id('b', n),
    day,
    start,
    end,
    title,
    courseId: courseIdx === null ? null : courses[courseIdx].id,
    kind,
    location,
  })

  const blocks: ScheduleBlock[] = [
    block(1, 0, '08:00', '10:00', 'Cálculo II', 0, 'clase', 'Aula 204'),
    block(2, 2, '08:00', '10:00', 'Cálculo II', 0, 'clase', 'Aula 204'),
    block(3, 1, '10:00', '12:00', 'Programación Web', 1, 'clase', 'Lab 3'),
    block(4, 3, '10:00', '12:00', 'Programación Web', 1, 'clase', 'Lab 3'),
    block(5, 4, '14:00', '16:00', 'Historia del Arte', 2, 'clase', 'Auditorio B'),
    block(6, 0, '16:00', '18:00', 'Repaso de integrales', 0, 'estudio', 'Biblioteca'),
    block(7, 2, '15:00', '17:00', 'Avance del proyecto', 1, 'estudio'),
    block(8, 5, '10:00', '12:00', 'Lecturas de arte', 2, 'estudio'),
  ]

  const card = (n: number, courseIdx: number, front: string, back: string): Flashcard => ({
    id: id('f', n),
    courseId: courses[courseIdx].id,
    front,
    back,
    interval: 0,
    ease: 2.5,
    reps: 0,
    due: now,
    createdAt: now,
  })

  const flashcards: Flashcard[] = [
    card(1, 0, '¿Qué establece el teorema de Fubini?', 'Una integral doble sobre un rectángulo puede calcularse como integrales iteradas en cualquier orden, si la función es continua.'),
    card(2, 0, 'Jacobiano en coordenadas polares', 'r — por eso dA = r dr dθ'),
    card(3, 1, '¿Qué hace useEffect?', 'Sincroniza un componente con un sistema externo después del renderizado.'),
    card(4, 2, 'Característica principal del Barroco', 'Dramatismo, contraste de luz y sombra (claroscuro) y movimiento.'),
  ]

  return {
    version: 1,
    courses,
    tasks,
    blocks,
    flashcards,
    sessions: [],
    settings: { gradeScaleMin: 0, gradeScaleMax: 20 },
  }
}
