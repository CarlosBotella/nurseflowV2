// Pruebas de la agenda: validación, ocurrencias, iCalendar, disposición del calendario e importación.

import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImport } from '../db.js';
import { validPlanner, occurrences, calendarFile } from '../planner-data.js';
import { visibleDays, layoutDay, eventColor } from '../calendar-layout.js';
import { validSetting } from '../backup-data.js';
const schedule = patch =>
  validPlanner({
    id: 'class',
    type: 'event',
    title: 'Farmacología',
    category: 'Clase',
    startDate: '2026-10-19',
    endDate: '2026-10-25',
    slots: [
      { id: 'mon', day: 1, start: '08:00', end: '10:00' },
      { id: 'wed', day: 3, start: '10:30', end: '12:30' },
      { id: 'fri', day: 5, start: '09:00', end: '10:00' }
    ],
    excluded: [],
    ...patch
  });
test('native Turno and NurseFlowV2 versions stay importable after renaming', async () => {
  for (const format of ['turno-backup', 'NurseFlowV2-backup'])
    for (const version of [1, 2, 3, 4, 5]) {
      const copy = await prepareImport({
        format,
        version,
        cases: [],
        favorites: [],
        planner: [],
        settings: [],
        imports: []
      });
      assert.equal(copy.format, 'NurseFlowV2-backup');
    }
  await assert.rejects(() =>
    prepareImport({
      format: 'unknown',
      version: 3,
      cases: [],
      favorites: [],
      planner: [],
      settings: [],
      imports: []
    })
  );
});
test('one subject supports different days and hours and multiple non-overlapping slots on a day', () => {
  const row = schedule();
  assert.deepEqual(
    occurrences(row).map(r => [r.date, r.start, r.end]),
    [
      ['2026-10-19', '08:00', '10:00'],
      ['2026-10-21', '10:30', '12:30'],
      ['2026-10-23', '09:00', '10:00']
    ]
  );
  const twice = schedule({
    slots: [
      { id: 'a', day: 1, start: '08:00', end: '10:00' },
      { id: 'b', day: 1, start: '11:00', end: '12:00' }
    ]
  });
  assert.equal(occurrences(twice).length, 2);
  assert.throws(() =>
    schedule({
      slots: [
        { id: 'a', day: 1, start: '08:00', end: '11:00' },
        { id: 'b', day: 1, start: '10:00', end: '12:00' }
      ]
    })
  );
});
test('cancel one date preserves all other sessions; restoration and old schedules remain valid', () => {
  const row = schedule({ excluded: ['2026-10-21'] });
  assert.deepEqual(
    occurrences(row).map(r => r.date),
    ['2026-10-19', '2026-10-23']
  );
  assert.equal(occurrences({ ...row, excluded: [] }).length, 3);
  const old = validPlanner({
    id: 'old',
    type: 'rotation',
    title: 'Practicum I',
    startDate: '2026-10-19',
    endDate: '2026-10-23',
    start: '15:00',
    end: '22:00',
    weekdays: [1, 2, 3, 4, 5],
    excluded: ['2026-10-20']
  });
  assert.equal(occurrences(old).length, 4);
  assert.equal(
    occurrences(old).reduce(
      (sum, r) => sum + Number(r.end.slice(0, 2)) - Number(r.start.slice(0, 2)),
      0
    ),
    28
  );
});
test('ICS exports the individual slot times and no cancelled date', () => {
  const text = calendarFile([schedule({ excluded: ['2026-10-21'] })]);
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert(text.includes('DTSTART:20261019T060000Z'));
  assert(text.includes('DTSTART:20261023T070000Z'));
  assert(!text.includes('20261021'));
});
test('portrait centers selected day, landscape spans Monday to Sunday', () => {
  assert.deepEqual(visibleDays('2026-10-21', false), ['2026-10-20', '2026-10-21', '2026-10-22']);
  assert.deepEqual(visibleDays('2026-10-21', true), [
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
    '2026-10-25'
  ]);
  assert.equal(visibleDays('2026-11-01', true)[0], '2026-10-26');
});
test('overlapping blocks get separate lanes and adjacent blocks regain full width', () => {
  const result = layoutDay([
    { id: 'a', start: '08:00', end: '10:00' },
    { id: 'b', start: '09:00', end: '11:00' },
    { id: 'c', start: '10:00', end: '12:00' },
    { id: 'd', start: '12:00', end: '13:00' }
  ]);
  assert.equal(result.find(r => r.id === 'a').laneCount, 2);
  assert.notEqual(result.find(r => r.id === 'a').lane, result.find(r => r.id === 'b').lane);
  assert.equal(result.find(r => r.id === 'd').laneCount, 1);
});
test('subject colour is consistent across timetable entries and survives backup validation', () => {
  assert.equal(
    eventColor({ subjectId: 'farm', title: 'Clase lunes' }),
    eventColor({ subjectId: 'farm', title: 'Clase miércoles' })
  );
  const pref = validSetting({ key: 'subjectColors', value: { farm: 'pink' } });
  assert.equal(eventColor({ subjectId: 'farm' }, pref.value), 'pink');
  assert.throws(() =>
    validSetting({ key: 'subjectColors', value: { farm: 'url(javascript:bad)' } })
  );
});

test('custom colours survive backup validation and reject CSS payloads', () => {
  const pref = validSetting({ key: 'subjectColors', value: { farm: '#b756d4' } });
  assert.equal(eventColor({ subjectId: 'farm' }, pref.value), '#b756d4');
  for (const bad of ['#fff', '#b756d4;display:none', 'red;background:url(x)'])
    assert.throws(() => validSetting({ key: 'subjectColors', value: { farm: bad } }));
});
