import test from 'node:test';
import assert from 'node:assert/strict';
import { validSymptoms, validDiagnosis, matchesCase } from '../case-data.js';
import { requestReference } from '../api.js';

test('old cases without new fields remain searchable', () => {
  assert(matchesCase({ title: 'Caso previo', tags: ['prácticas'], assessment: 'Cuidados' }, 'practicas cuidados'));
  assert.deepEqual(validSymptoms(), []);
  assert.equal(validDiagnosis(), null);
});
test('search matches symptoms and diagnostic codes without accents', () => {
  const row = { title: 'Ejemplo', symptoms: ['Disnea', 'Náuseas'], diagnosis: { title: 'Diagnóstico', code: 'CA40' } };
  assert(matchesCase(row, 'disnea nauseas'));
  assert(matchesCase(row, 'ca40'));
  assert(!matchesCase(row, 'disnea fiebre'));
});
test('symptom limits and duplicates are validated on import and save', () => {
  assert.deepEqual(validSymptoms([' Tos ', 'Tos', '']), ['Tos']);
  assert.throws(() => validSymptoms(Array(41).fill('x')));
  assert.throws(() => validSymptoms([123]));
});
test('diagnosis metadata preserves version and rejects foreign URLs', () => {
  const diagnosis = { title: 'Example', code: 'CA40', uri: 'http://id.who.int/icd/release/11/2026-01/mms/123', release: '2026-01' };
  assert.deepEqual(validDiagnosis(diagnosis), diagnosis);
  assert.throws(() => validDiagnosis({ ...diagnosis, uri: 'https://evil.example/123' }));
  assert.throws(() => validDiagnosis({ ...diagnosis, release: 'invalid' }));
});
test('reference client uses the configured Worker without admin secrets', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url.origin, 'https://nurseflow-api.carlosb-n.workers.dev');
    assert.equal(url.searchParams.get('q'), 'neumonía');
    assert.equal(options.headers['X-Admin-Secret'], undefined);
    return new Response(JSON.stringify({ destinationEntities: [] }), { headers: { 'X-Turno-Offline': '1', 'X-Turno-Fetched-At': '2026-10-13T00:00:00Z' } });
  };
  try {
    const result = await requestReference('icd/search', { q: 'neumonía' });
    assert.equal(result.offline, true);
    assert.equal(result.fetchedAt, '2026-10-13T00:00:00Z');
  } finally { globalThis.fetch = original; }
});
test('reference client preserves explicit Worker errors', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Origen no permitido.' }), { status: 403 });
  try { await assert.rejects(requestReference('icd/search', { q: 'test' }), /Origen no permitido/); }
  finally { globalThis.fetch = original; }
});
