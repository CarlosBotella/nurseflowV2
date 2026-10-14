/** Vistas «Agenda» y «Mis estudios»: calendario, horarios, rotaciones, jornadas, matrícula y pendientes. */
import * as db from './db.js';
import { SUBJECTS, UCV_SOURCE, CATALOG_DATE } from './ucv-catalog.js';
import {
  validPlanner,
  occurrences,
  eventSlots,
  addDays,
  calendarFile,
  minutes,
  closuresOn,
  overlaps,
  occurrenceMinutes,
  scheduleSummary,
  parseSequence,
  REST
} from './planner-data.js';
import { initHolidays } from './holidays-ui.js';
import { applyEventColor, eventColor, colorKey, visibleDays } from './calendar-layout.js';
import { paintCalendar } from './calendar-ui.js';
import { renderColorPicker as drawColorPicker } from './color-picker.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
// Fecha actual en Madrid como AAAA-MM-DD.
const today = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .formatToParts(new Date())
      .map(p => [p.type, p.value])
  );
  return `${p.year}-${p.month}-${p.day}`;
};
// Fecha larga en español.
const pretty = day =>
  new Date(day + 'T12:00:00Z').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid'
  });
/** Inicializa agenda y estudios. Devuelve { refresh } para recargar desde la base de datos. */
export function initPlanner({ announce }) {
  // Estado: registros cargados, día y mes enfocados, evento seleccionado y colores por asignatura.
  let rows = [],
    focused = today(),
    month = focused.slice(0, 7),
    generation = 0,
    dirty = false,
    selected = null,
    colors = {},
    colorEdited = false,
    editingGroup = [];
  // Borradores de jornadas sin guardar, por clave de jornada.
  const dayDrafts = new Map();
  window.addEventListener('beforeunload', event => {
    if (dirty || dayDrafts.size) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  const run = task =>
    Promise.resolve()
      .then(task)
      .catch(error => announce(error.message));
  const button = (label, callback, cls = 'secondary') => {
    const b = el('button', label, cls);
    b.type = 'button';
    b.addEventListener('click', () => run(callback));
    return b;
  };
  // Selectores sobre los registros cargados.
  const events = () =>
    rows.filter(row => ['event', 'rotation'].includes(row.type) && !row.archived);
  const closures = () => rows.filter(row => row.type === 'closure');
  const enrollments = () =>
    rows.filter(row => row.type === 'enrollment' && row.year === $('study-year').value);
  const holidayUI = initHolidays({ onChange: () => refresh(), announce });
  /** Recarga los registros y repinta todas las secciones. */
  async function refresh() {
    const version = ++generation;
    const [data, prefs] = await Promise.all([db.listPlanner(), db.getSetting('subjectColors')]);
    if (version !== generation) return;
    rows = data;
    colors = prefs?.value || {};
    paintStudies();
    paintAgenda();
    paintRotations();
    paintTasks();
    holidayUI.render(rows);
  }
  /** Guarda un registro y repinta. */
  async function put(row) {
    await db.savePlanner(row);
    await refresh();
  }
  /** Enfoca un día del calendario y, opcionalmente, desplaza hasta la línea de tiempo. */
  function selectDay(day, scroll = false) {
    focused = day;
    month = day.slice(0, 7);
    selected = null;
    paintAgenda();
    if (scroll)
      $('agenda-timeline').scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
  }
  /** Rellena el selector de asignatura: primero las matriculadas y después las del plan. */
  function subjectOptions(current = '') {
    const select = $('plan-subject');
    select.replaceChildren(new Option('Sin asignatura asociada', ''));
    for (const row of enrollments())
      select.append(new Option(row.title + (row.repeated ? ' · repetición' : ''), row.subjectId));
    for (const row of SUBJECTS.filter(
      r =>
        ((r.kind === 'PE' && r.plan === $('study-plan').value) || r.id === current) &&
        ![...select.options].some(o => o.value === r.id)
    ))
      select.append(new Option(row.title, row.id));
  }
  /** Añade una franja (día, desde, hasta) al formulario de horario. */
  function addSlot(
    slot = {
      id: crypto.randomUUID(),
      day: new Date(focused + 'T12:00:00Z').getUTCDay(),
      start: '09:00',
      end: '10:00'
    }
  ) {
    const item = el('div', undefined, 'schedule-slot');
    item.dataset.slotId = slot.id;
    const day = document.createElement('select');
    for (const [i, label] of [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado'
    ].entries())
      day.append(new Option(label, String(i)));
    day.value = String(slot.day);
    day.className = 'slot-day';
    const start = document.createElement('input');
    start.type = 'time';
    start.required = true;
    start.value = slot.start;
    start.className = 'slot-start';
    const end = document.createElement('input');
    end.type = 'time';
    end.required = true;
    end.value = slot.end;
    end.className = 'slot-end';
    const label = (text, input) => {
      const l = el('label', text);
      l.append(input);
      return l;
    };
    const hint = el('span', undefined, 'field-help slot-overnight');
    const updateHint = () => {
      hint.textContent = overnightHint(start.value, end.value);
    };
    start.addEventListener('input', updateHint);
    end.addEventListener('input', updateHint);
    updateHint();
    item.append(
      label('Día', day),
      label('Desde', start),
      label('Hasta', end),
      button(
        'Quitar',
        () => {
          item.remove();
          dirty = true;
        },
        'quiet'
      ),
      hint
    );
    $('plan-slots').append(item);
    toggleRepeat();
  }
  /** Aviso de franja que termina al día siguiente (p. ej. un turno de noche 22:00–08:00). */
  function overnightHint(start, end) {
    if (!start || !end) return '';
    if (start === end) return 'La hora final debe ser distinta de la inicial.';
    return minutes(end) < minutes(start) ? 'Termina al día siguiente.' : '';
  }
  // Horarios propuestos para los códigos habituales de un ciclo de turnos.
  const CYCLE_DEFAULTS = {
    M: ['08:00', '15:00'],
    T: ['15:00', '22:00'],
    N: ['22:00', '08:00'],
    D: ['08:00', '20:00'],
    N12: ['20:00', '08:00']
  };
  /** Pinta una fila de horario por cada código de trabajo de la secuencia, conservando lo escrito. */
  function paintCycleShifts(shifts) {
    const current = shifts || readCycleShifts();
    const container = $('plan-cycle-shifts');
    container.replaceChildren();
    const codes = [...new Set(parseSequence($('plan-cycle-sequence').value))].filter(
      code => code !== REST
    );
    if (!codes.length)
      container.append(
        el('p', 'Escribe la secuencia para indicar el horario de cada turno.', 'field-help')
      );
    for (const code of codes) {
      const [startValue, endValue] = current[code]
        ? [current[code].start, current[code].end]
        : CYCLE_DEFAULTS[code] || ['08:00', '15:00'];
      const item = el('div', undefined, 'schedule-slot cycle-shift');
      item.dataset.code = code;
      const start = document.createElement('input');
      start.type = 'time';
      start.required = true;
      start.value = startValue;
      start.className = 'slot-start';
      const end = document.createElement('input');
      end.type = 'time';
      end.required = true;
      end.value = endValue;
      end.className = 'slot-end';
      const hint = el('span', overnightHint(startValue, endValue), 'field-help slot-overnight');
      const update = () => {
        hint.textContent = overnightHint(start.value, end.value);
      };
      start.addEventListener('input', update);
      end.addEventListener('input', update);
      const from = el('label', 'Desde'),
        to = el('label', 'Hasta');
      from.append(start);
      to.append(end);
      item.append(el('strong', 'Turno ' + code, 'cycle-code'), from, to, hint);
      container.append(item);
    }
  }
  /** Horarios de los códigos escritos en el formulario del ciclo. */
  function readCycleShifts() {
    return Object.fromEntries(
      [...$('plan-cycle-shifts').querySelectorAll('.cycle-shift')].map(item => [
        item.dataset.code,
        {
          start: item.querySelector('.slot-start').value,
          end: item.querySelector('.slot-end').value
        }
      ])
    );
  }
  /** Muestra las franjas semanales o el ciclo de turnos según la opción elegida. */
  function toggleCycle() {
    const cycle = $('plan-cycle').checked;
    $('plan-cycle-fields').hidden = !cycle;
    $('plan-slots-fields').hidden = cycle;
    $('plan-cycle-sequence').required = cycle;
    if (cycle) {
      $('plan-repeat').checked = true;
      toggleRepeat();
      paintCycleShifts();
    }
    $('plan-repeat').disabled = cycle;
  }
  /** Sin repetición, las franjas se fijan al día de la semana de la fecha de inicio. */
  function toggleRepeat() {
    const repeat = $('plan-repeat').checked;
    $('plan-end-date').required = repeat;
    const date = $('plan-start-date').value,
      weekday = date ? new Date(date + 'T12:00:00Z').getUTCDay() : null;
    for (const item of $('plan-slots').children) {
      const day = item.querySelector('.slot-day');
      day.disabled = !repeat;
      if (!repeat && Number.isInteger(weekday)) day.value = String(weekday);
    }
  }
  /** Pinta el selector de color del formulario de horario. */
  function renderColorPicker(selectedColor = 'blue') {
    $('plan-color-value').value = selectedColor;
    drawColorPicker($('plan-color'), selectedColor, color => {
      colorEdited = true;
      dirty = true;
      renderColorPicker(color);
    });
  }
  /** Sugiere un color según el título o la asignatura mientras no se haya elegido uno a mano. */
  function updateColor() {
    if (!colorEdited) {
      const suggested = eventColor(
        { title: $('plan-title').value, subjectId: $('plan-subject').value },
        colors
      );
      renderColorPicker(suggested);
      $('plan-color-value').value = suggested;
    }
  }
  /** Abre el formulario de horario para editar (o crear) un evento o una rotación. */
  function openEvent(input = null, rotation = false) {
    if (dirty && !confirm('¿Descartar los cambios del horario sin guardar?')) return;
    const row = input ? rows.find(r => r.id === input.id) || input : null;
    // Las clases de una misma asignatura con los mismos datos se editan juntas como un grupo.
    const group =
      row?.category === 'Clase' && !row.pattern
        ? events().filter(
            r =>
              r.category === 'Clase' &&
              !r.pattern &&
              colorKey(r) === colorKey(row) &&
              ['startDate', 'endDate', 'place', 'tutor', 'confirmed', 'ignoreClosures'].every(
                key => r[key] === row[key]
              ) &&
              JSON.stringify(r.excluded.slice().sort()) ===
                JSON.stringify(row.excluded.slice().sort())
          )
        : row
          ? [row]
          : [];
    editingGroup = group.map(r => r.id);
    $('plan-form').reset();
    subjectOptions(row?.subjectId);
    $('plan-id').value = row?.id || '';
    $('plan-kind').value =
      row?.type === 'rotation' || rotation
        ? 'rotation'
        : (row?.category === 'NurseFlowV2' ? 'Turno' : row?.category) || 'Clase';
    $('plan-title').value = row?.title || (rotation ? 'Practicum I' : '');
    $('plan-subject').value = row?.subjectId || '';
    $('plan-start-date').value = row?.startDate || focused;
    $('plan-end-date').value = row?.endDate || focused;
    $('plan-repeat').checked =
      rotation ||
      Boolean(row && (row.endDate !== row.startDate || group.flatMap(eventSlots).length > 1));
    $('plan-place').value = row?.place || '';
    $('plan-tutor').value = row?.tutor || '';
    $('plan-excluded').value = (row?.excluded || []).join(', ');
    $('plan-confirmed').checked = Boolean(row?.confirmed);
    $('plan-ignore-closures').checked = Boolean(row?.ignoreClosures);
    $('plan-slots').replaceChildren();
    $('plan-cycle').checked = Boolean(row?.pattern);
    $('plan-cycle-sequence').value = row?.pattern?.sequence.join(' ') || '';
    paintCycleShifts(row?.pattern?.shifts || {});
    if (row?.pattern) addSlot();
    else if (row) {
      const seen = new Set();
      for (const slot of group.flatMap(eventSlots)) {
        const key = slot.day + '/' + slot.start + '/' + slot.end;
        if (!seen.has(key)) {
          seen.add(key);
          addSlot(group.length > 1 ? { ...slot, id: crypto.randomUUID() } : slot);
        }
      }
    } else if (rotation)
      [1, 2, 3, 4, 5].forEach(day =>
        addSlot({ id: crypto.randomUUID(), day, start: '15:00', end: '22:00' })
      );
    else addSlot();
    toggleCycle();
    colorEdited = false;
    const existingColor = row ? colors[colorKey(row)] : undefined;
    renderColorPicker(
      existingColor ||
        eventColor({ title: $('plan-title').value, subjectId: $('plan-subject').value }, colors)
    );
    $('plan-color-value').value =
      existingColor ||
      eventColor({ title: $('plan-title').value, subjectId: $('plan-subject').value }, colors);
    $('plan-status').textContent =
      group.length > 1
        ? 'Aquí puedes editar juntos los días y las horas guardados para esta asignatura.'
        : '';
    $('plan-form').hidden = false;
    dirty = false;
    location.hash = 'agenda';
    $('plan-title').focus();
  }
  /** Pinta el calendario y el detalle del día enfocado. */
  function paintAgenda() {
    paintCalendar({
      events: events(),
      closures: closures(),
      focused,
      month,
      colors,
      onSelect: selectDay,
      onEvent: row => {
        focused = row.date;
        month = focused.slice(0, 7);
        selected = { id: row.id, date: row.date, slotId: row.slotId };
        paintAgenda();
        $('agenda-days').scrollIntoView({ block: 'nearest' });
      }
    });
    const list = $('agenda-days');
    list.replaceChildren();
    $('agenda-day-title').textContent = pretty(focused);
    const closed = closuresOn(closures(), focused);
    if (closed.length)
      list.append(
        el(
          'p',
          closed.map(r => r.title).join(' · ') +
            ' · Las clases se omiten salvo las excepciones marcadas. Los turnos y las prácticas conservan su horario.',
          'privacy-note'
        )
      );
    if (!['2026', '2027'].includes(focused.slice(0, 4)))
      list.append(
        el(
          'p',
          'No hay festivos oficiales precargados para este año. Añade las fechas comprobadas en Festivos y días sin clase.',
          'privacy-note'
        )
      );
    // Incluye los turnos de noche que empezaron el día anterior y terminan hoy.
    const sortKey = r => (r.date < focused ? '' : r.start);
    const daily = events()
      .flatMap(r => occurrences(r, addDays(focused, -1), focused, closures()))
      .filter(r => r.date === focused || r.endDay === focused)
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.title.localeCompare(b.title));
    const chosen = daily.find(
      r => r.id === selected?.id && r.slotId === selected.slotId && r.date === selected.date
    );
    if (!chosen && daily.length) {
      const choices = el('div', undefined, 'actions');
      for (const r of daily)
        choices.append(
          applyEventColor(
            button(
              (r.date < focused ? 'Hasta ' + r.end : r.start) +
                ' · ' +
                r.title +
                (r.shift ? ' · ' + r.shift : ''),
              () => {
                selected = { id: r.id, date: r.date, slotId: r.slotId };
                paintAgenda();
              },
              'secondary event-color-' + eventColor(r, colors)
            ),
            r,
            colors
          )
        );
      list.append(
        choices,
        el('p', 'Toca un bloque para consultar, editar o cancelar ese día.', 'fine-print')
      );
    }
    if (!daily.length) list.append(el('p', 'No hay eventos previstos para este día.', 'empty'));
    if (chosen) paintSelected(chosen, list);
    // Eventos cancelados solo este día, con la opción de restablecerlos.
    for (const r of events().filter(
      r =>
        r.startDate <= focused &&
        r.endDate >= focused &&
        r.excluded.includes(focused) &&
        occurrences({ ...r, excluded: [] }, focused, focused).length
    )) {
      const item = el('article', undefined, 'list-item cancelled-event');
      item.append(
        el('h3', r.title),
        el('p', 'Sin actividad este día · el resto del horario se conserva'),
        button('Restablecer este día', () =>
          put({ ...r, excluded: r.excluded.filter(d => d !== focused) })
        )
      );
      list.append(item);
    }
  }
  /** Detalle del evento seleccionado: solapes y acciones (editar, cancelar el día, archivar). */
  function paintSelected(row, list) {
    const parent = rows.find(r => r.id === row.id),
      item = el(
        'article',
        undefined,
        'list-item selected-event event-color-' + eventColor(row, colors)
      );
    applyEventColor(item, row, colors);
    item.append(
      el('h3', row.title),
      el(
        'p',
        `${pretty(row.date)} · ${row.shift ? 'Turno ' + row.shift + ' · ' : ''}${row.start}–${row.end}${row.overnight ? ' (termina el ' + pretty(row.endDay) + ')' : ''} · ${row.confirmed ? 'Confirmado por ti' : 'Horario provisional'}`
      )
    );
    if (row.place) item.append(el('p', row.place));
    const coinciding = events()
      .flatMap(r => occurrences(r, addDays(row.date, -1), row.endDay, closures()))
      .filter(
        r => (r.id !== row.id || r.slotId !== row.slotId || r.date !== row.date) && overlaps(r, row)
      );
    if (coinciding.length)
      item.append(
        el('p', 'Coincide con: ' + coinciding.map(r => r.title).join(', '), 'privacy-note')
      );
    item.append(
      button('Editar horario completo', () => openEvent(parent)),
      button(
        'Cancelar solo este día',
        async () => {
          await put({ ...parent, excluded: [...new Set([...parent.excluded, row.date])] });
          selected = null;
          paintAgenda();
          announce('Día cancelado. El horario y las jornadas guardadas se conservan.');
        },
        'quiet'
      ),
      button(
        'Archivar horario',
        async () => {
          if (confirm('¿Archivar este horario completo? Las jornadas se conservan.'))
            await put({ ...parent, archived: true });
        },
        'quiet'
      )
    );
    if (row.type === 'rotation') paintDayLog(row, item);
    list.append(item);
  }
  /** Formulario de jornada realizada (solo en rotaciones y en días ya pasados). */
  function paintDayLog(row, item) {
    if (row.date > today()) {
      item.append(el('p', 'Jornada prevista: no cuenta como asistencia realizada.', 'fine-print'));
      return;
    }
    const key = `day-${row.id}-${row.date}`,
      saved = rows.find(r => r.id === key),
      draft = dayDrafts.get(key),
      form = el('form', undefined, 'day-log');
    const hours = document.createElement('input');
    hours.type = 'number';
    hours.min = '0';
    hours.max = '24';
    hours.step = '.25';
    hours.required = true;
    hours.value = draft?.hours ?? (saved ? String(saved.actualMinutes / 60) : '');
    const hl = el('label', 'Horas realizadas en la jornada completa');
    hl.append(hours);
    const registered = document.createElement('input');
    registered.type = 'checkbox';
    registered.checked = draft?.registered ?? Boolean(saved?.registered);
    const rl = el('label', undefined, 'confirmation-choice');
    rl.append(registered, el('span', 'Ya registrado en UCV Evalúa'));
    const note = document.createElement('textarea');
    note.rows = 2;
    note.maxLength = 10000;
    note.value = draft?.note ?? (saved?.note || '');
    const nl = el('label', 'Aprendizaje breve · sin datos de pacientes');
    nl.append(note);
    const submit = el('button', 'Guardar jornada', 'secondary');
    submit.type = 'submit';
    form.append(hl, rl, nl, submit);
    form.addEventListener('input', () =>
      dayDrafts.set(key, { hours: hours.value, registered: registered.checked, note: note.value })
    );
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      run(async () => {
        try {
          await db.savePlanner({
            id: key,
            type: 'day',
            eventId: row.id,
            date: row.date,
            actualMinutes: Number(hours.value) * 60,
            registered: registered.checked,
            note: note.value
          });
          dayDrafts.delete(key);
          await refresh();
          announce('Jornada guardada localmente.');
        } finally {
          submit.disabled = false;
        }
      });
    });
    item.append(form);
  }
  /** Pinta las asignaturas del plan y curso elegidos y la matrícula del curso académico. */
  function paintStudies() {
    const list = $('study-subjects');
    list.replaceChildren();
    for (const subject of SUBJECTS.filter(
      row => row.plan === $('study-plan').value && row.course === Number($('study-course').value)
    )) {
      const saved = enrollments().find(row => row.subjectId === subject.id);
      const item = el('div', undefined, 'subject-row');
      const label = el('label', undefined, 'confirmation-choice');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(saved);
      input.addEventListener('change', () =>
        run(async () => {
          if (input.checked)
            await put({
              id: `enroll-${$('study-year').value}-${subject.id}`,
              type: 'enrollment',
              year: $('study-year').value,
              subjectId: subject.id,
              title: subject.title,
              repeated: false
            });
          else {
            await db.deletePlanner(saved.id);
            await refresh();
          }
        })
      );
      label.append(input, el('span', `${subject.title} · ${subject.ects} ECTS`));
      item.append(label);
      list.append(item);
    }
    const selected = $('study-enrolled');
    selected.replaceChildren();
    if (!enrollments().length)
      selected.append(
        el(
          'p',
          'Marca solo las asignaturas que tienes matriculadas. Puedes recorrer varios cursos y planes.',
          'muted'
        )
      );
    for (const row of enrollments()) {
      const item = el('div', undefined, 'subject-row');
      item.append(el('strong', row.title));
      const label = el('label', undefined, 'confirmation-choice');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = row.repeated;
      input.addEventListener('change', () => run(() => put({ ...row, repeated: input.checked })));
      label.append(input, el('span', 'La estoy repitiendo'));
      item.append(
        label,
        button(
          'Quitar de mi matrícula',
          async () => {
            await db.deletePlanner(row.id);
            await refresh();
          },
          'quiet'
        )
      );
      selected.append(item);
    }
    const source = $('study-source');
    source.href = UCV_SOURCE;
    source.textContent = `Catálogo oficial UCV · consultado ${CATALOG_DATE} ↗`;
  }
  /** Pinta las rotaciones con sus horas previstas y realizadas. */
  function paintRotations() {
    const list = $('study-rotations');
    list.replaceChildren();
    for (const row of rows.filter(r => r.type === 'rotation')) {
      const logs = rows.filter(r => r.type === 'day' && r.eventId === row.id);
      const planned = occurrences(row).reduce((sum, r) => sum + occurrenceMinutes(r), 0) / 60;
      const actual = logs.reduce((sum, r) => sum + r.actualMinutes, 0) / 60;
      const item = el('article', undefined, 'list-item');
      item.append(
        el('h3', row.title + (row.archived ? ' · Archivada' : '')),
        el('p', `${row.startDate} → ${row.endDate} · ${scheduleSummary(row)}`),
        el(
          'p',
          `${planned} h previstas · ${actual} h anotadas como realizadas · ${logs.filter(r => r.registered).length} jornadas marcadas como registradas`
        ),
        el('p', [row.place, row.tutor].filter(Boolean).join(' · '))
      );
      item.append(
        button('Ver en agenda', () => {
          focused = row.startDate;
          month = focused.slice(0, 7);
          location.hash = 'agenda';
          paintAgenda();
        }),
        button(row.archived ? 'Restaurar horario' : 'Editar rotación', () =>
          row.archived ? put({ ...row, archived: false }) : openEvent(row)
        )
      );
      if (logs.length) {
        const details = el('details');
        details.append(el('summary', 'Diario y jornadas guardadas'));
        for (const log of logs.sort((a, b) => a.date.localeCompare(b.date)))
          details.append(
            el(
              'p',
              `${log.date} · ${log.actualMinutes / 60} h · ${log.registered ? 'Marcado como registrado' : 'Registro oficial pendiente'}${log.note ? ' · ' + log.note : ''}`
            )
          );
        item.append(details);
      }
      list.append(item);
    }
    if (!list.children.length)
      list.append(
        el(
          'p',
          'Añade la rotación que te hayan asignado. Los periodos y los festivos se revisan contigo.',
          'muted'
        )
      );
  }
  /** Pinta los pendientes ordenados por fecha límite. */
  function paintTasks() {
    const list = $('study-tasks');
    list.replaceChildren();
    for (const row of rows
      .filter(r => r.type === 'task')
      .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))) {
      const item = el('div', undefined, 'task-row');
      const label = el('label', undefined, 'confirmation-choice');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = row.done;
      input.addEventListener('change', () => run(() => put({ ...row, done: input.checked })));
      label.append(input, el('span', `${row.title}${row.due ? ' · ' + row.due : ''}`));
      item.append(
        label,
        button(
          'Quitar',
          async () => {
            await db.deletePlanner(row.id);
            await refresh();
          },
          'quiet'
        )
      );
      list.append(item);
    }
  }
  // ── Eventos de la interfaz ──

  // Filtros de estudio (se guardan en los ajustes).
  for (const id of ['study-year', 'study-plan', 'study-course'])
    $(id).addEventListener('change', () =>
      run(async () => {
        await db.setSetting('study-filters', {
          year: $('study-year').value,
          plan: $('study-plan').value,
          course: $('study-course').value
        });
        paintStudies();
      })
    );
  $('plan-subject').addEventListener('change', () => {
    const row = SUBJECTS.find(r => r.id === $('plan-subject').value);
    if (row) $('plan-title').value = row.title;
    colorEdited = false;
    updateColor();
    dirty = true;
  });
  $('plan-title').addEventListener('input', updateColor);
  $('plan-repeat').addEventListener('change', toggleRepeat);
  $('plan-cycle').addEventListener('change', toggleCycle);
  $('plan-cycle-sequence').addEventListener('input', () => paintCycleShifts());
  $('plan-start-date').addEventListener('change', toggleRepeat);
  $('plan-add-slot').addEventListener('click', () => {
    const last = $('plan-slots').lastElementChild;
    addSlot({
      id: crypto.randomUUID(),
      day: last ? Number(last.querySelector('.slot-day').value) : 1,
      start: last?.querySelector('.slot-start').value || '09:00',
      end: last?.querySelector('.slot-end').value || '10:00'
    });
    dirty = true;
  });
  $('plan-kind').addEventListener('change', () => {
    if ($('plan-kind').value === 'rotation' && !$('plan-id').value) {
      $('plan-repeat').checked = true;
      $('plan-slots').replaceChildren();
      [1, 2, 3, 4, 5].forEach(day =>
        addSlot({ id: crypto.randomUUID(), day, start: '15:00', end: '22:00' })
      );
    }
  });
  $('plan-form').addEventListener('input', () => {
    dirty = true;
  });
  // Guardar horario: valida las franjas y guarda el grupo junto con su color.
  $('plan-form').addEventListener('submit', event => {
    event.preventDefault();
    const submit = $('plan-form').querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    run(async () => {
      try {
        const cycle = $('plan-cycle').checked,
          repeat = cycle || $('plan-repeat').checked,
          rotation = $('plan-kind').value === 'rotation',
          startDate = $('plan-start-date').value,
          day = new Date(startDate + 'T12:00:00Z').getUTCDay();
        const slots = cycle
          ? undefined
          : [...$('plan-slots').children].map(item => ({
              id: item.dataset.slotId,
              day: repeat ? Number(item.querySelector('.slot-day').value) : day,
              start: item.querySelector('.slot-start').value,
              end: item.querySelector('.slot-end').value
            }));
        const pattern = cycle
          ? {
              sequence: parseSequence($('plan-cycle-sequence').value),
              shifts: readCycleShifts()
            }
          : undefined;
        const value = validPlanner({
          pattern,
          id: $('plan-id').value || crypto.randomUUID(),
          type: rotation ? 'rotation' : 'event',
          category: rotation ? 'Prácticas' : $('plan-kind').value,
          title: $('plan-title').value,
          subjectId: $('plan-subject').value,
          startDate,
          endDate: repeat ? $('plan-end-date').value : startDate,
          slots,
          excluded: $('plan-excluded')
            .value.split(',')
            .map(s => s.trim())
            .filter(Boolean),
          confirmed: $('plan-confirmed').checked,
          place: $('plan-place').value,
          tutor: $('plan-tutor').value,
          ignoreClosures: $('plan-ignore-closures').checked
        });
        if (!occurrences(value).length)
          throw new Error('No hay jornadas dentro del periodo con esas franjas.');
        const nextColors = { ...colors, [colorKey(value)]: $('plan-color-value').value };
        await db.savePlannerGroup(value, editingGroup);
        await db.setSetting('subjectColors', nextColors);
        dirty = false;
        $('plan-form').hidden = true;
        focused =
          $('plan-id').value && startDate <= focused && focused <= value.endDate
            ? focused
            : startDate;
        month = focused.slice(0, 7);
        selected = null;
        await refresh();
        announce('Horario guardado con todas sus franjas.');
      } catch (error) {
        $('plan-status').textContent = error.message;
        throw error;
      } finally {
        submit.disabled = false;
      }
    });
  });
  $('plan-cancel').addEventListener('click', () => {
    if (!dirty || confirm('¿Descartar cambios en este formulario?')) {
      $('plan-form').hidden = true;
      dirty = false;
    }
  });
  $('plan-new').addEventListener('click', () => openEvent());
  $('rotation-new').addEventListener('click', () => openEvent(null, true));
  // Navegación del calendario.
  $('agenda-today').addEventListener('click', () => selectDay(today()));
  for (const [id, delta] of [
    ['agenda-prev', -1],
    ['agenda-next', 1]
  ])
    $(id).addEventListener('click', () => {
      const date = new Date(month + '-01T12:00:00Z');
      date.setUTCMonth(date.getUTCMonth() + delta);
      month = date.toISOString().slice(0, 7);
      paintAgenda();
    });
  for (const [id, delta] of [
    ['agenda-period-prev', -1],
    ['agenda-period-next', 1]
  ])
    $(id).addEventListener('click', () =>
      selectDay(addDays(focused, delta * (matchMedia('(orientation: landscape)').matches ? 7 : 3)))
    );
  matchMedia('(orientation: landscape)').addEventListener('change', () => paintAgenda());
  // Pendientes.
  $('task-form').addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      await put({
        id: crypto.randomUUID(),
        type: 'task',
        title: $('task-title').value,
        due: $('task-due').value,
        done: false
      });
      $('task-form').reset();
    });
  });
  // Lista predefinida de trámites de prácticas.
  $('task-preset').addEventListener('click', () =>
    run(async () => {
      for (const title of [
        'Comprobar NUSS',
        'Comprobar certificado electrónico',
        'Superar capacitación UCV',
        'Firmar anexos en UCV Evalúa',
        'Entregar certificado solicitado',
        'Confirmar acogida en el centro',
        'Anotar tutoría de seguimiento',
        'Preparar memoria'
      ])
        if (!rows.some(row => row.type === 'task' && row.title === title))
          await db.savePlanner({
            id: crypto.randomUUID(),
            type: 'task',
            title,
            due: '',
            done: false
          });
      await refresh();
    })
  );
  // Exportar la agenda como .ics.
  $('agenda-export').addEventListener('click', () => {
    const url = URL.createObjectURL(
      new Blob([calendarFile(events(), closures())], { type: 'text/calendar;charset=utf-8' })
    );
    const a = el('a');
    a.href = url;
    a.download = 'NurseFlowV2-agenda.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
  // Restaura los filtros de estudio guardados y carga los datos.
  const restore = async () => {
    const settings = await db.getSetting('study-filters');
    if (settings?.value)
      for (const [id, key] of [
        ['study-year', 'year'],
        ['study-plan', 'plan'],
        ['study-course', 'course']
      ])
        if ([...$(id).options].some(option => option.value === settings.value[key]))
          $(id).value = settings.value[key];
    await refresh();
  };
  // Arranque: carga los festivos oficiales y restaura el estado.
  run(async () => {
    await holidayUI.ensure();
    await restore();
  });
  return { refresh: restore };
}
