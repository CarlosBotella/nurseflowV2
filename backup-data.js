/** Migración de copias del NurseFlow anterior y validación de ajustes y archivos conservados. */
import { SUBJECTS } from './ucv-catalog.js';
import { isCalendarColor } from './calendar-layout.js';
import { validDay, minutes } from './planner-data.js';
// Colecciones reconocidas en las copias del NurseFlow anterior.
const collections = [
  'settings',
  'cases',
  'tasks',
  'days',
  'schedule',
  'exceptions',
  'pae',
  'meds',
  'procedures',
  'quiz',
  'flashcards'
];
// Nombre legible de cada colección para los resúmenes de importación.
export const BACKUP_LABELS = {
  settings: 'Perfil y preferencias',
  cases: 'Casos',
  tasks: 'Pendientes',
  days: 'Jornadas',
  schedule: 'Horarios',
  exceptions: 'Festivos y excepciones',
  pae: 'Planes de cuidados',
  meds: 'Medicamentos',
  procedures: 'Procedimientos',
  quiz: 'Preguntas de estudio',
  flashcards: 'Tarjetas de estudio'
};
// Devuelve la colección como array (vacío si falta) y limita su tamaño.
const array = (value, key) => {
  if (value[key] === undefined) return [];
  if (!Array.isArray(value[key]) || value[key].length > 20000)
    throw new Error(`La colección ${key} es inválida o demasiado grande.`);
  return value[key];
};
const string = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const identifier = (row, index) => string(row?.id, String(index));
/** Detecta una copia del NurseFlow anterior por su forma (no tiene campo format). */
export function isNurseFlow(value) {
  return (
    value &&
    typeof value === 'object' &&
    !value.format &&
    Array.isArray(value.settings) &&
    Array.isArray(value.cases) &&
    Array.isArray(value.schedule) &&
    Array.isArray(value.exceptions)
  );
}
/**
 * Convierte una copia del NurseFlow anterior al formato actual.
 * Solo usa campos explícitos; lo que no se mapea queda en el archivo original conservado.
 */
export async function convertNurseFlow(value) {
  if (!isNurseFlow(value)) throw new Error('No se reconoce el formato de esta copia.');
  for (const key of collections) array(value, key);
  const source = JSON.stringify(value);
  if (new TextEncoder().encode(source).length > 30 * 1024 * 1024)
    throw new Error('Máximo 30 MB por copia.');
  // El hash SHA-256 identifica el original conservado y evita duplicarlo.
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)))
  ]
    .map(n => n.toString(16).padStart(2, '0'))
    .join('');
  const main = value.settings.find(row => row?.id === 'main')?.value || {};
  // Curso académico declarado o, si no es válido, el curso por defecto.
  const year =
    /^\d{4}-\d{4}$/.test(main.academicYear || '') &&
    Number(main.academicYear.slice(5)) === Number(main.academicYear.slice(0, 4)) + 1
      ? main.academicYear
      : '2026-2027';
  const startDate = `${year.slice(0, 4)}-09-01`,
    endDate = `${year.slice(5)}-08-31`;
  const codes = Array.isArray(main.selectedSubjects)
    ? [...new Set(main.selectedSubjects.map(String))]
    : [];
  // Se elige el plan de estudios con más asignaturas coincidentes.
  const plans = ['2025', '2022', '2018', '2010'].sort(
    (a, b) =>
      codes.filter(code => SUBJECTS.some(s => s.plan === b && s.code === code)).length -
      codes.filter(code => SUBJECTS.some(s => s.plan === a && s.code === code)).length
  );
  const subjects = codes
    .map(code => SUBJECTS.find(s => s.plan === plans[0] && s.code === code))
    .filter(Boolean);
  const planner = subjects.map(s => ({
    id: `enroll-${year}-${s.id}`,
    type: 'enrollment',
    year,
    subjectId: s.id,
    title: s.title,
    repeated: false
  }));
  const warnings = [],
    kept = [];
  if (codes.length !== subjects.length)
    warnings.push(
      'Algunas asignaturas no coinciden con el catálogo; se conservan en el archivo original.'
    );
  // Los festivos antiguos pasan a ser días excluidos de las clases.
  const excluded = array(value, 'exceptions')
    .filter(row => row?.type === 'Festivo')
    .map(row => validDay(row.date));
  // Horarios de clase → eventos semanales.
  for (const [index, row] of array(value, 'schedule').entries()) {
    if (
      !row ||
      !Number.isInteger(row.day) ||
      row.day < 0 ||
      row.day > 6 ||
      !string(row.title).trim()
    )
      throw new Error('Hay un horario de clase inválido.');
    minutes(row.start);
    minutes(row.end);
    planner.push({
      id: `nf-class-${identifier(row, index)}`,
      type: 'event',
      category: 'Clase',
      title: row.title,
      subjectId: subjects.find(s => s.title === row.title)?.id || '',
      startDate: row.startDate || startDate,
      endDate: row.endDate || endDate,
      start: row.start,
      end: row.end,
      weekdays: [row.day],
      excluded,
      confirmed: false,
      place: string(row.room),
      tutor: ''
    });
  }
  if (value.schedule.some(row => !row.startDate || !row.endDate))
    warnings.push(
      `Las clases no traen un periodo completo. Se proponen del ${startDate} al ${endDate}: revisa inicio, fin y vacaciones en Agenda.`
    );
  // Pendientes → tareas.
  for (const [index, row] of array(value, 'tasks').entries()) {
    if (!row || !string(row.title).trim()) {
      kept.push('Pendientes con campos no reconocidos');
      continue;
    }
    planner.push({
      id: `nf-task-${identifier(row, index)}`,
      type: 'task',
      title: row.title,
      due: string(row.due),
      done: row.done === true
    });
  }
  // No se adivinan formatos antiguos de casos: migran los compatibles y todo queda archivado.
  const cases = [];
  for (const [index, row] of value.cases.entries()) {
    if (
      row &&
      ['title', 'context', 'assessment', 'learning', 'createdAt', 'updatedAt'].every(
        key => typeof row[key] === 'string'
      ) &&
      Array.isArray(row.tags)
    )
      cases.push({ ...row, id: `nf-case-${identifier(row, index)}` });
    else kept.push('Casos con campos no reconocidos');
  }
  // Medicamentos marcados como favoritos.
  const favorites = [];
  for (const row of array(value, 'meds'))
    if (
      row &&
      typeof row.nregistro === 'string' &&
      typeof row.nombre === 'string' &&
      row.favorite === true
    )
      favorites.push({
        nregistro: row.nregistro,
        nombre: row.nombre,
        savedAt: row.savedAt || new Date().toISOString()
      });
  // Curso más frecuente entre las asignaturas, para los filtros de estudio.
  const course = subjects.length
    ? String(
        subjects.reduce(
          (best, s, _, all) =>
            all.filter(x => x.course === s.course).length >
            all.filter(x => x.course === best).length
              ? s.course
              : best,
          subjects[0].course
        )
      )
    : String(main.courseNumber || '1');
  const settings = [{ key: 'study-filters', value: { year, plan: plans[0], course } }];
  if (['system', 'light', 'dark'].includes(main.theme))
    settings.push({ key: 'theme', value: main.theme });
  for (const key of ['days', 'pae', 'procedures', 'quiz', 'flashcards'])
    if (array(value, key).length)
      kept.push(`${BACKUP_LABELS[key]}: ${value[key].length} registros`);
  if (array(value, 'meds').length !== favorites.length)
    kept.push('Medicamentos sin favorito compatible');
  if (value.exceptions.length)
    warnings.push(
      `${value.exceptions.length} excepciones conservadas; los festivos se aplican a las clases importadas. Otras rotaciones y horarios existentes no se modifican.`
    );
  if (main.hasPracticum)
    warnings.push(
      'La configuración de prácticas se conserva en el original. Revisa días y fechas antes de crear su rotación.'
    );
  return {
    format: 'NurseFlowV2-backup',
    version: 3,
    cases,
    favorites,
    planner,
    settings,
    imports: [{ id: hash, format: 'nurseflow', source }],
    report: {
      source: 'NurseFlow anterior',
      warnings,
      kept: [...new Set(kept)],
      subjects: subjects.length,
      classes: value.schedule.length
    }
  };
}
/** Valida un ajuste importado; solo se aceptan las claves conocidas. */
export function validSetting(row) {
  if (!row || typeof row.key !== 'string') throw new Error('Ajuste inválido.');
  if (
    row.key === 'subjectColors' &&
    row.value &&
    typeof row.value === 'object' &&
    !Array.isArray(row.value) &&
    Object.keys(row.value).length <= 1000 &&
    Object.entries(row.value).every(([key, color]) => key.length <= 600 && isCalendarColor(color))
  )
    return { key: row.key, value: Object.fromEntries(Object.entries(row.value)) };
  if (row.key === 'theme' && ['system', 'light', 'dark'].includes(row.value))
    return { key: row.key, value: row.value };
  if (
    row.key === 'toolFavorites' &&
    Array.isArray(row.value) &&
    row.value.length <= 1000 &&
    row.value.every(v => typeof v === 'string' && v.length <= 150)
  )
    return { key: row.key, value: [...new Set(row.value)] };
  if (
    row.key === 'study-filters' &&
    row.value &&
    /^\d{4}-\d{4}$/.test(row.value.year || '') &&
    Number(row.value.year.slice(5)) === Number(row.value.year.slice(0, 4)) + 1 &&
    ['2025', '2022', '2018', '2010'].includes(row.value.plan) &&
    ['1', '2', '3', '4'].includes(row.value.course)
  )
    return {
      key: row.key,
      value: { year: row.value.year, plan: row.value.plan, course: row.value.course }
    };
  throw new Error('La copia contiene ajustes no compatibles.');
}
/** Valida un archivo original conservado (hash, formato y JSON del NurseFlow anterior). */
export function validArchive(row) {
  if (
    !row ||
    !/^[a-f0-9]{64}$/.test(row.id || '') ||
    row.format !== 'nurseflow' ||
    typeof row.source !== 'string' ||
    row.source.length > 30 * 1024 * 1024
  )
    throw new Error('Archivo original conservado inválido.');
  let data;
  try {
    data = JSON.parse(row.source);
  } catch {
    throw new Error('El archivo original conservado no es JSON válido.');
  }
  if (!isNurseFlow(data)) throw new Error('El archivo original no tiene formato NurseFlow.');
  return { id: row.id, format: row.format, source: row.source };
}
