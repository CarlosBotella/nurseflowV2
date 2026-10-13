import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, positive } from '../calculators.js';

test('infusion converts minutes to hours', () => {
  assert.equal(calculate('flow', { volume: '500', minutes: '240' }).result, 125);
});
test('gravity drip uses the equipment factor; retains unrounded result', () => {
  assert.equal(calculate('drip', { volume: '500', minutes: '240', factor: '20' }).result, 500 * 20 / 240);
});
test('dose volume converts micrograms to milligrams', () => {
  const result = calculate('dose', { prescribed: '250', prescribedUnit: 'mcg', available: '0,5', availableUnit: 'mg', volume: '2' });
  assert.equal(result.result, 1);
});
test('dose volume converts grams to milligrams', () => {
  assert.equal(calculate('dose', { prescribed: '0.35', prescribedUnit: 'g', available: '500', availableUnit: 'mg', volume: '2' }).result, 1.4);
});
test('rejects zero, negative, ambiguous and nonnumeric inputs', () => {
  for (const value of ['0', '-1', '', '1,000.5', '1e3', 'Infinity', 'abc']) assert.throws(() => positive(value, 'Dato'));
  assert.throws(() => calculate('drip', { volume: '500', minutes: '240' }));
});
test('rejects incompatible units', () => {
  assert.throws(() => calculate('dose', { prescribed: '1', prescribedUnit: 'UI', available: '1', availableUnit: 'mg', volume: '2' }));
});
test('rejects arithmetic overflow', () => {
  assert.throws(() => calculate('flow', { volume: '9'.repeat(308), minutes: '0.00001' }));
});
