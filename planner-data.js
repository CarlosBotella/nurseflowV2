/** Modelo de la agenda: validación de registros, ocurrencias, conflictos y exportación iCalendar. */

// Texto de agenda validado y recortado.
const txt = (value, max = 500) => {
  if (typeof value !== 'string' || value.length > max) throw new Error('Texto de agenda inválido.');
  return value.trim();
};
/** Valida una fecha AAAA-MM-DD real (rechaza, p. ej., 2026-02-30). */
export function validDay(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value || '') ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value
  )
    throw new Error('Fecha inválida.');
  return value;
}
/** Convierte 'HH:MM' (00:00–23:59) en minutos o lanza un error si el formato no es válido. */
export function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) throw new Error('Hora inválida.');
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
/**
 * Valida y normaliza un registro de agenda según su tipo: closure (día sin clase),
 * enrollment (matrícula), event/rotation (horario), day (jornada) o task (pendiente).
 */
export function validPlanner(value) {
  const row = { id: txt(value.id, 150), type: value.type };
  if (!row.id) throw new Error('Identificador vacío.');
  // Festivo o periodo sin clase.
  if (value.type === 'closure') {
    const title = txt(value.title),
      startDate = validDay(value.startDate),
      endDate = validDay(value.endDate || value.startDate);
    if (
      !title ||
      endDate < startDate ||
      (Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 550
    )
      throw new Error('Periodo sin clase inválido.');
    const source = txt(value.source || '', 2000);
    if (source) {
      const url = new URL(source);
      if (url.protocol !== 'https:') throw new Error('La fuente debe ser un enlace HTTPS.');
    }
    return {
      ...row,
      title,
      startDate,
      endDate,
      source,
      kind: value.kind === 'holiday' ? 'holiday' : 'academic',
      locality: txt(value.locality || 'Valencia', 100),
      active: value.active !== false,
      customized: Boolean(value.customized)
    };
  }
  // Asignatura matriculada en un curso académico.
  if (value.type === 'enrollment') {
    if (
      !/^\d{4}-\d{4}$/.test(value.year || '') ||
      Number(value.year.slice(5)) !== Number(value.year.slice(0, 4)) + 1
    )
      throw new Error('Curso académico inválido.');
    return {
      ...row,
      year: value.year,
      subjectId: txt(value.subjectId, 60),
      title: txt(value.title),
      repeated: Boolean(value.repeated)
    };
  }
  // Horario recurrente (clase, turno…) o rotación de prácticas.
  if (['event', 'rotation'].includes(value.type)) {
    const startDate = validDay(value.startDate),
      endDate = validDay(value.endDate || value.startDate);
    if (endDate < startDate || (Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 550)
      throw new Error('El periodo debe durar como máximo 550 días y finalizar después de empezar.');
    const slots = value.slots === undefined ? null : validSlots(value.slots);
    const startTime = value.start || slots?.[0].start,
      endTime = value.end || slots?.[0].end;
    const start = minutes(startTime),
      end = minutes(endTime);
    if (end <= start)
      throw new Error('La hora final debe ser posterior a la inicial (eventos del mismo día).');
    const weekdays = slots ? [...new Set(slots.map(s => s.day))] : value.weekdays;
    if (
      !Array.isArray(weekdays) ||
      !weekdays.length ||
      weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)
    )
      throw new Error('Selecciona los días de la semana.');
    const excluded = (value.excluded || []).map(validDay);
    if (excluded.length > 200) throw new Error('Demasiadas excepciones.');
    const title = txt(value.title);
    if (!title) throw new Error('El nombre es obligatorio.');
    return {
      ...row,
      title,
      startDate,
      endDate,
      start: startTime,
      end: endTime,
      weekdays: [...new Set(weekdays)],
      ...(slots ? { slots } : {}),
      excluded: [...new Set(excluded)],
      confirmed: Boolean(value.confirmed),
      archived: Boolean(value.archived),
      category: txt(value.category || 'Otro', 50),
      subjectId: txt(value.subjectId || '', 60),
      place: txt(value.place || ''),
      tutor: txt(value.tutor || ''),
      ignoreClosures: Boolean(value.ignoreClosures)
    };
  }
  // Jornada de prácticas realizada.
  if (value.type === 'day') {
    const actual = Number(value.actualMinutes);
    if (!Number.isFinite(actual) || actual < 0 || actual > 1440)
      throw new Error('Horas realizadas inválidas.');
    return {
      ...row,
      eventId: txt(value.eventId, 150),
      date: validDay(value.date),
      actualMinutes: actual,
      registered: Boolean(value.registered),
      note: txt(value.note || '', 10000)
    };
  }
  // Pendiente.
  if (value.type === 'task') {
    const title = txt(value.title);
    if (!title) throw new Error('El pendiente necesita un nombre.');
    return {
      ...row,
      title,
      eventId: txt(value.eventId || '', 150),
      due: value.due ? validDay(value.due) : '',
      done: Boolean(value.done)
    };
  }
  throw new Error('Registro de agenda no reconocido.');
}
/** Suma (o resta) días a una fecha AAAA-MM-DD. */
export function addDays(value, delta) {
  const date = new Date(validDay(value) + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
/** Cierres activos que incluyen el día indicado. */
export function closuresOn(closures, day) {
  return closures.filter(row => row.active !== false && row.startDate <= day && row.endDate >= day);
}
/** Valida las franjas semanales (de 1 a 28 y sin solapes en el mismo día). */
export function validSlots(input) {
  if (!Array.isArray(input) || !input.length || input.length > 28)
    throw new Error('Añade entre una y 28 franjas semanales.');
  const slots = input.map((row, index) => {
    if (!Number.isInteger(row.day) || row.day < 0 || row.day > 6)
      throw new Error('Día de franja inválido.');
    if (minutes(row.end) <= minutes(row.start))
      throw new Error('La franja debe terminar después de empezar.');
    return {
      id: txt(row.id || `slot-${index}`, 100),
      day: row.day,
      start: row.start,
      end: row.end
    };
  });
  if (new Set(slots.map(s => s.id)).size !== slots.length)
    throw new Error('Las franjas tienen identificadores duplicados.');
  for (const [i, a] of slots.entries())
    for (const b of slots.slice(i + 1))
      if (a.day === b.day && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end))
        throw new Error('Hay franjas de esta asignatura que se solapan en el mismo día.');
  return slots;
}
/** Franjas de un evento; en registros antiguos sin slots se derivan de weekdays/start/end. */
export function eventSlots(event) {
  return event.slots?.length
    ? event.slots
    : event.weekdays.map(day => ({ id: 'legacy-' + day, day, start: event.start, end: event.end }));
}
/**
 * Genera las ocurrencias de un evento entre dos fechas.
 * Omite los días excluidos y, en las clases, los días sin clase (salvo ignoreClosures).
 */
export function occurrences(event, from = event.startDate, to = event.endDate, closures = []) {
  const rows = [];
  let day = from > event.startDate ? from : event.startDate;
  const last = to < event.endDate ? to : event.endDate;
  const slots = eventSlots(event);
  for (let count = 0; day <= last && count < 551; count++, day = addDays(day, 1)) {
    if (
      event.excluded.includes(day) ||
      (event.category === 'Clase' && !event.ignoreClosures && closuresOn(closures, day).length)
    )
      continue;
    for (const slot of slots)
      if (slot.day === new Date(day + 'T12:00:00Z').getUTCDay())
        rows.push({ ...event, date: day, start: slot.start, end: slot.end, slotId: slot.id });
  }
  return rows;
}
/** Identificadores de los eventos con ocurrencias solapadas en el intervalo. */
export function conflicts(events, from, to, closures = []) {
  const rows = events.flatMap(event => occurrences(event, from, to, closures));
  const ids = new Set();
  rows.forEach((a, i) =>
    rows.slice(i + 1).forEach(b => {
      if (
        a.date === b.date &&
        minutes(a.start) < minutes(b.end) &&
        minutes(b.start) < minutes(a.end)
      ) {
        ids.add(a.id);
        ids.add(b.id);
      }
    })
  );
  return ids;
}
/** Convierte fecha y hora locales de Madrid en marca UTC de iCalendar (tiene en cuenta el horario de verano). */
function utcTime(day, time) {
  const naive = Date.parse(day + 'T' + time + ':00Z');
  let value = naive;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      })
        .formatToParts(new Date(value))
        .filter(p => p.type !== 'literal')
        .map(p => [p.type, p.value])
    );
    const local = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second
    );
    value += naive - local;
  }
  return new Date(value).toISOString().replace(/[-:]/g, '').replace('.000', '');
}
/** Genera un archivo .ics (iCalendar) con todas las ocurrencias. */
export function calendarFile(events, closures = []) {
  // Escapa los caracteres especiales de iCalendar.
  const escape = value =>
    String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NurseFlowV2//Agenda personal//ES'];
  for (const event of events)
    for (const row of occurrences(event, undefined, undefined, closures))
      lines.push(
        'BEGIN:VEVENT',
        `UID:${escape(event.id)}-${escape(row.slotId)}-${row.date}@NurseFlowV2.local`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '')}`,
        `DTSTART:${utcTime(row.date, row.start)}`,
        `DTEND:${utcTime(row.date, row.end)}`,
        `SUMMARY:${escape(event.title + (event.confirmed ? '' : ' (provisional)'))}`,
        `LOCATION:${escape(event.place)}`,
        'END:VEVENT'
      );
  lines.push('END:VCALENDAR');
  return (
    lines
      // Pliega las líneas a 75 octetos, como exige RFC 5545.
      .map(line => {
        let out = '',
          chunk = '',
          size = 0;
        for (const character of line) {
          const n = new TextEncoder().encode(character).length;
          if (size + n > 73) {
            out += chunk + '\r\n ';
            chunk = '';
            size = 1;
          }
          chunk += character;
          size += n;
        }
        return out + chunk;
      })
      .join('\r\n') + '\r\n'
  );
}
