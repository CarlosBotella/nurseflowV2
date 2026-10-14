/** Presentación del calendario: colores por asignatura, días visibles y carriles de solapamiento. */

/** Paleta inspirada en Apple Calendar (las variables CSS están en COLOR_VARS). */
export const CALENDAR_COLORS = [
  'blue',
  'purple',
  'teal',
  'orange',
  'pink',
  'green',
  'indigo',
  'red'
];
// Alias conservado por compatibilidad.
export const COLORS = CALENDAR_COLORS;
// Nombres en español para las etiquetas accesibles.
export const COLOR_NAMES = {
  blue: 'Azul',
  purple: 'Morado',
  teal: 'Turquesa',
  orange: 'Naranja',
  pink: 'Rosa',
  green: 'Verde',
  indigo: 'Índigo',
  red: 'Rojo'
};
/** Indica si el valor es un color de la paleta o un hexadecimal #rrggbb personalizado. */
export function isCalendarColor(value) {
  return (
    CALENDAR_COLORS.includes(value) || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value))
  );
}
// Variable CSS de cada color de la paleta.
export const COLOR_VARS = {
  blue: '--cal-blue',
  purple: '--cal-purple',
  teal: '--cal-teal',
  orange: '--cal-orange',
  pink: '--cal-pink',
  green: '--cal-green',
  indigo: '--cal-indigo',
  red: '--cal-red'
};
/** Clave estable para el color: la asignatura o, si no hay, el título normalizado sin tildes. */
export function colorKey(event) {
  return (
    event.subjectId ||
    event.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  );
}
/** Color del evento: la preferencia guardada o uno derivado de un hash de su clave. */
export function eventColor(event, preferences = {}) {
  const key = colorKey(event);
  if (isCalendarColor(preferences[key])) return preferences[key];
  let hash = 0;
  for (const letter of key) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return CALENDAR_COLORS[hash % CALENDAR_COLORS.length];
}
/** Aplica las variables CSS de un color personalizado (hex); los de la paleta se resuelven por clase. */
export function applyEventColor(node, event, preferences = {}) {
  const color = eventColor(event, preferences);
  if (color.startsWith('#')) {
    node.classList.add('event-color-custom');
    node.style.setProperty('--event-line', color);
    node.style.setProperty('--event-fg', color);
    node.style.setProperty('--event-bg', `color-mix(in srgb, ${color} 15%, var(--surface))`);
  }
  return node;
}
/** Días de la línea de tiempo: semana de lunes a domingo en horizontal o tres días (desde el anterior) en vertical. */
export function visibleDays(selected, landscape) {
  const date = new Date(selected + 'T12:00:00Z'),
    offset = landscape ? (date.getUTCDay() + 6) % 7 : 1;
  date.setUTCDate(date.getUTCDate() - offset);
  return Array.from({ length: landscape ? 7 : 3 }, (_, i) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
// Convierte 'HH:MM' en minutos desde medianoche.
const mins = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
/**
 * Tramos visibles de un día: una ocurrencia que cruza la medianoche se pinta hasta las 24:00 en su
 * día y desde las 00:00 en el siguiente (continued). from/to conservan el horario real y source la ocurrencia.
 */
export function daySegments(rows, day) {
  const out = [];
  for (const row of rows) {
    if (row.date === day)
      out.push({
        ...row,
        start: row.start,
        end: row.overnight ? '24:00' : row.end,
        from: row.start,
        to: row.end,
        source: row
      });
    else if (row.overnight && row.endDay === day)
      out.push({
        ...row,
        start: '00:00',
        end: row.end,
        from: row.start,
        to: row.end,
        continued: true,
        source: row
      });
  }
  return out;
}
/** Asigna carriles dentro de cada grupo de eventos solapados; las citas contiguas comparten carril. */
export function layoutDay(events) {
  const ordered = events
    .slice()
    .sort((a, b) => mins(a.start) - mins(b.start) || mins(b.end) - mins(a.end));
  const out = [];
  let cluster = [],
    ends = [],
    clusterEnd = -1;
  const flush = () => {
    for (const event of cluster) out.push({ ...event, laneCount: ends.length });
    cluster = [];
    ends = [];
  };
  for (const row of ordered) {
    const start = mins(row.start),
      end = mins(row.end);
    // Si el evento empieza tras el final del grupo actual, se cierra el grupo.
    if (start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    // Reutiliza el primer carril libre o abre uno nuevo.
    let lane = ends.findIndex(e => e <= start);
    if (lane < 0) lane = ends.length;
    ends[lane] = end;
    cluster.push({ ...row, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return out;
}
