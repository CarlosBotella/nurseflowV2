// Pruebas de turnos que cruzan la medianoche y ciclos de turnos rotatorios.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validPlanner,
  occurrences,
  conflicts,
  calendarFile,
  parseSequence,
  validPattern,
  occurrenceMinutes,
  scheduleSummary
} from '../planner-data.js';
import { daySegments, layoutDay } from '../calendar-layout.js';
const base = patch =>
  validPlanner({
    id: 'shift',
    type: 'event',
    title: 'Turno UCI',
    category: 'Turno',
    startDate: '2026-11-02',
    endDate: '2026-11-08',
    excluded: [],
    ...patch
  });
test('a night slot ends the next day and counts its real duration', () => {
  const row = base({ slots: [{ id: 'n', day: 1, start: '22:00', end: '08:00' }] });
  const [night] = occurrences(row);
  assert.equal(night.date, '2026-11-02');
  assert.equal(night.endDay, '2026-11-03');
  assert.equal(night.overnight, true);
  assert.equal(occurrenceMinutes(night), 600);
  assert.match(scheduleSummary(row), /22:00–08:00 \(\+1 día\)/);
  assert.throws(() => base({ slots: [{ id: 'x', day: 1, start: '08:00', end: '08:00' }] }));
});
test('slots overlapping across midnight, including Sunday into Monday, are rejected', () => {
  assert.throws(() =>
    base({
      slots: [
        { id: 'n', day: 1, start: '22:00', end: '08:00' },
        { id: 'm', day: 2, start: '07:00', end: '14:00' }
      ]
    })
  );
  assert.throws(() =>
    base({
      slots: [
        { id: 'n', day: 0, start: '22:00', end: '08:00' },
        { id: 'm', day: 1, start: '07:00', end: '14:00' }
      ]
    })
  );
  assert.equal(
    occurrences(
      base({
        slots: [
          { id: 'n', day: 1, start: '22:00', end: '08:00' },
          { id: 'm', day: 2, start: '08:00', end: '15:00' }
        ]
      })
    ).length,
    2
  );
});
test('conflicts detect a night shift that overlaps the next morning of another schedule', () => {
  const night = base({ id: 'a', slots: [{ id: 'n', day: 1, start: '22:00', end: '08:00' }] });
  const morning = validPlanner({
    id: 'b',
    type: 'event',
    title: 'Clase',
    category: 'Clase',
    startDate: '2026-11-03',
    endDate: '2026-11-03',
    slots: [{ id: 'c', day: 2, start: '07:30', end: '09:00' }],
    excluded: []
  });
  assert.deepEqual([...conflicts([night, morning], '2026-11-03', '2026-11-03')].sort(), ['a', 'b']);
});
test('iCalendar export ends overnight shifts on the following date', () => {
  const ics = calendarFile([
    base({ endDate: '2026-11-02', slots: [{ id: 'n', day: 1, start: '22:00', end: '08:00' }] })
  ]);
  // 22:00 y 08:00 en Madrid (CET, UTC+1).
  assert.match(ics, /DTSTART:20261102T210000Z/);
  assert.match(ics, /DTEND:20261103T070000Z/);
});
test('timeline splits a night shift into two segments', () => {
  const rows = occurrences(base({ slots: [{ id: 'n', day: 1, start: '22:00', end: '08:00' }] }));
  const first = daySegments(rows, '2026-11-02'),
    second = daySegments(rows, '2026-11-03');
  assert.deepEqual(
    [first[0].start, first[0].end, second[0].start, second[0].end, second[0].continued],
    ['22:00', '24:00', '00:00', '08:00', true]
  );
  assert.equal(second[0].source.date, '2026-11-02');
  assert.equal(layoutDay(first)[0].laneCount, 1);
});
test('sequences accept spaced or compact codes', () => {
  assert.deepEqual(parseSequence('m m t t n n l l l l'), 'MMTTNNLLLL'.split(''));
  assert.deepEqual(parseSequence('MMTTNNLLLL'), 'MMTTNNLLLL'.split(''));
  assert.deepEqual(parseSequence('M, N12 ; L'), ['M', 'N12', 'L']);
});
test('a rotating cycle repeats from the start date with its own hours', () => {
  const row = base({
    startDate: '2026-11-01',
    endDate: '2026-11-12',
    pattern: {
      sequence: parseSequence('M M T T N N L L L L'),
      shifts: {
        M: { start: '08:00', end: '15:00' },
        T: { start: '15:00', end: '22:00' },
        N: { start: '22:00', end: '08:00' }
      }
    }
  });
  const rows = occurrences(row);
  assert.deepEqual(
    rows.map(r => [r.date, r.shift]),
    [
      ['2026-11-01', 'M'],
      ['2026-11-02', 'M'],
      ['2026-11-03', 'T'],
      ['2026-11-04', 'T'],
      ['2026-11-05', 'N'],
      ['2026-11-06', 'N'],
      ['2026-11-11', 'M'],
      ['2026-11-12', 'M']
    ]
  );
  assert.equal(rows[4].endDay, '2026-11-06');
  // Una excepción cancela solo esa jornada y no desplaza el ciclo.
  const skipped = occurrences({ ...row, excluded: ['2026-11-03'] });
  assert.equal(skipped.find(r => r.date === '2026-11-04').shift, 'T');
  assert.equal(row.slots, undefined);
  assert.deepEqual(row.weekdays, [0, 1, 2, 3, 4, 5, 6]);
});
test('cycle validation requires hours for every code and rejects back-to-back overlaps', () => {
  assert.throws(() => validPattern({ sequence: ['M', 'T'], shifts: { M: { start: '08:00', end: '15:00' } } }));
  assert.throws(() => validPattern({ sequence: ['L', 'L'], shifts: {} }));
  assert.throws(() => validPattern({ sequence: ['M'], shifts: { M: { start: '08:00', end: '15:00' } } }));
  assert.throws(() =>
    validPattern({
      sequence: ['N', 'M'],
      shifts: { N: { start: '22:00', end: '09:00' }, M: { start: '08:00', end: '15:00' } }
    })
  );
  assert.ok(
    validPattern({
      sequence: ['N', 'M'],
      shifts: { N: { start: '22:00', end: '08:00' }, M: { start: '08:00', end: '15:00' } }
    })
  );
});
