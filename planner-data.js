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
/** Duración en minutos de una franja; si la hora final es anterior, termina al día siguiente. */
export function shiftMinutes(start, end) {
  const length = (minutes(end) - minutes(start) + 1440) % 1440;
  if (!length) throw new Error('La hora final debe ser distinta de la inicial.');
  return length;
}
// Código de día libre en los ciclos de turnos.
export const REST = 'L';
/** Divide una secuencia como «M M T T N N L L L L» o «MMTTNNLLLL» en códigos de turno. */
export function parseSequence(value) {
  const text = String(value || '')
    .toUpperCase()
    .trim();
  if (!text) return [];
  return /[\s,;·]/.test(text) ? text.split(/[\s,;·]+/).filter(Boolean) : [...text];
}
/**
 * Valida un ciclo de turnos rotatorios: secuencia de 2–56 días (códigos de 1–3 letras o cifras,
 * «L» = libre) y el horario de cada código de trabajo. Rechaza turnos consecutivos solapados.
 */
export function validPattern(input) {
  if (
    !input ||
    !Array.isArray(input.sequence) ||
    input.sequence.length < 2 ||
    input.sequence.length > 56
  )
    throw new Error('El ciclo debe tener entre 2 y 56 días.');
  const sequence = input.sequence.map(code => {
    if (typeof code !== 'string' || !/^[A-Z0-9]{1,3}$/.test(code))
      throw new Error('Usa letras o cifras (máximo 3) para cada día del ciclo.');
    return code;
  });
  const shifts = {};
  for (const code of new Set(sequence)) {
    if (code === REST) continue;
    const shift = input.shifts?.[code];
    if (!shift) throw new Error(`Falta el horario del turno ${code}.`);
    shiftMinutes(shift.start, shift.end);
    shifts[code] = { start: shift.start, end: shift.end };
  }
  if (!Object.keys(shifts).length) throw new Error('El ciclo necesita al menos un día de trabajo.');
  // Un turno de noche no puede terminar después de que empiece el del día siguiente.
  sequence.forEach((code, i) => {
    const current = shifts[code],
      next = shifts[sequence[(i + 1) % sequence.length]];
    if (
      current &&
      next &&
      minutes(current.start) + shiftMinutes(current.start, current.end) > 1440 + minutes(next.start)
    )
      throw new Error(`El turno ${code} se solapa con el turno del día siguiente.`);
  });
  return { sequence, shifts };
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
    // Un ciclo de turnos sustituye a las franjas semanales.
    const pattern = value.pattern ? validPattern(value.pattern) : null;
    const slots = pattern || value.slots === undefined ? null : validSlots(value.slots);
    const first = pattern && pattern.shifts[pattern.sequence.find(code => code !== REST)];
    const startTime = first?.start || value.start || slots?.[0].start,
      endTime = first?.end || value.end || slots?.[0].end;
    shiftMinutes(startTime, endTime);
    const weekdays = pattern
      ? [0, 1, 2, 3, 4, 5, 6]
      : slots
        ? [...new Set(slots.map(s => s.day))]
        : value.weekdays;
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
      ...(pattern ? { pattern } : {}),
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
/** Valida las franjas semanales (de 1 a 28 y sin solapes, incluidas las que cruzan la medianoche). */
export function validSlots(input) {
  if (!Array.isArray(input) || !input.length || input.length > 28)
    throw new Error('Añade entre una y 28 franjas semanales.');
  const slots = input.map((row, index) => {
    if (!Number.isInteger(row.day) || row.day < 0 || row.day > 6)
      throw new Error('Día de franja inválido.');
    shiftMinutes(row.start, row.end);
    return {
      id: txt(row.id || `slot-${index}`, 100),
      day: row.day,
      start: row.start,
      end: row.end
    };
  });
  if (new Set(slots.map(s => s.id)).size !== slots.length)
    throw new Error('Las franjas tienen identificadores duplicados.');
  // Intervalos en minutos de la semana; se comparan también desplazados una semana (domingo → lunes).
  const week = 7 * 1440,
    span = s => {
      const from = s.day * 1440 + minutes(s.start);
      return [from, from + shiftMinutes(s.start, s.end)];
    };
  for (const [i, a] of slots.entries())
    for (const b of slots.slice(i + 1)) {
      const [a0, a1] = span(a);
      for (const offset of [-week, 0, week]) {
        const [b0, b1] = span(b).map(n => n + offset);
        if (a0 < b1 && b0 < a1)
          throw new Error('Hay franjas de este horario que se solapan entre sí.');
      }
    }
  return slots;
}
/** Franjas de un evento; en registros antiguos sin slots se derivan de weekdays/start/end. */
export function eventSlots(event) {
  return event.slots?.length
    ? event.slots
    : event.weekdays.map(day => ({ id: 'legacy-' + day, day, start: event.start, end: event.end }));
}
/** Resumen legible del horario: franjas semanales o ciclo de turnos. */
export function scheduleSummary(event) {
  if (event.pattern)
    return (
      'Ciclo ' +
      event.pattern.sequence.join(' ') +
      ' · ' +
      Object.entries(event.pattern.shifts)
        .map(([code, s]) => `${code} ${s.start}–${s.end}`)
        .join(' · ')
    );
  return eventSlots(event)
    .map(
      s =>
        ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][s.day] +
        ' ' +
        s.start +
        '–' +
        s.end +
        (minutes(s.end) < minutes(s.start) ? ' (+1 día)' : '')
    )
    .join(' · ');
}
// Días transcurridos entre dos fechas AAAA-MM-DD.
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
/**
 * Genera las ocurrencias de un evento entre dos fechas (según su día de inicio).
 * Omite los días excluidos y, en las clases, los días sin clase (salvo ignoreClosures).
 * Cada ocurrencia indica overnight y endDay cuando termina al día siguiente.
 */
export function occurrences(event, from = event.startDate, to = event.endDate, closures = []) {
  const rows = [];
  let day = from > event.startDate ? from : event.startDate;
  const last = to < event.endDate ? to : event.endDate;
  const slots = event.pattern ? [] : eventSlots(event);
  const push = (date, start, end, slotId, extra = {}) => {
    const overnight = minutes(end) <= minutes(start);
    rows.push({
      ...event,
      ...extra,
      date,
      start,
      end,
      slotId,
      overnight,
      endDay: overnight ? addDays(date, 1) : date
    });
  };
  for (let count = 0; day <= last && count < 551; count++, day = addDays(day, 1)) {
    if (
      event.excluded.includes(day) ||
      (event.category === 'Clase' && !event.ignoreClosures && closuresOn(closures, day).length)
    )
      continue;
    // Ciclo de turnos: el día de inicio corresponde a la primera posición de la secuencia.
    if (event.pattern) {
      const { sequence, shifts } = event.pattern,
        code = sequence[daysBetween(event.startDate, day) % sequence.length];
      if (shifts[code])
        push(day, shifts[code].start, shifts[code].end, 'cycle-' + code, { shift: code });
      continue;
    }
    for (const slot of slots)
      if (slot.day === new Date(day + 'T12:00:00Z').getUTCDay())
        push(day, slot.start, slot.end, slot.id);
  }
  return rows;
}
/** Duración en minutos de una ocurrencia. */
export const occurrenceMinutes = row => shiftMinutes(row.start, row.end);
/** Indica si dos ocurrencias se solapan en el tiempo, aunque crucen la medianoche. */
export function overlaps(a, b) {
  const span = row => {
    const from = daysBetween('2000-01-01', row.date) * 1440 + minutes(row.start);
    return [from, from + occurrenceMinutes(row)];
  };
  const [a0, a1] = span(a),
    [b0, b1] = span(b);
  return a0 < b1 && b0 < a1;
}
/** Identificadores de los eventos con ocurrencias solapadas en el intervalo. */
export function conflicts(events, from, to, closures = []) {
  // Incluye el día anterior para detectar los turnos de noche que llegan al intervalo.
  const rows = events.flatMap(event => occurrences(event, addDays(from, -1), to, closures));
  const ids = new Set();
  rows.forEach((a, i) =>
    rows.slice(i + 1).forEach(b => {
      if (overlaps(a, b) && (a.date >= from || b.date >= from)) {
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
        `DTEND:${utcTime(row.endDay, row.end)}`,
        `SUMMARY:${escape(event.title + (row.shift ? ' · ' + row.shift : '') + (event.confirmed ? '' : ' (provisional)'))}`,
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
