// Pruebas del catálogo de herramientas y de las fórmulas clínicas.

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTool } from '../clinical-calculators.js';
import { TOOLS, validateToolValues } from '../tool-catalog.js';
const value = (id, input) => calculateTool(id, input).results[0].value;
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('catalog has unique identifiers and a versioned source for every tool', () => {
  assert.equal(new Set(TOOLS.map(t => t.id)).size, TOOLS.length);
  for (const tool of TOOLS) {
    assert.ok(tool.source[0]);
    assert.match(tool.source[1], /^https:\/\//);
    if (!tool.reference) assert.ok(tool.formula);
  }
});
test('pump conversions agree with a hand-calculated example in both directions', () => {
  near(
    value('pump', { weight: '70', doseRate: '0.1', rateUnit: 'mcgmin', concentration: '0.2' }),
    2.1
  );
  near(
    value('reversePump', { weight: '70', rate: '2.1', rateUnit: 'mcgmin', concentration: '0.2' }),
    0.1
  );
  near(value('pump', { weight: '50', doseRate: '2', rateUnit: 'mgh', concentration: '10' }), 10);
});
test('concentration converts mass units; dilution reports original solution and diluent', () => {
  near(value('concentration', { mass: '1', massUnit: 'g', volume: '100' }), 10);
  const answer = calculateTool('dilution', { initial: '10', target: '2', finalVolume: '50' });
  assert.deepEqual(
    answer.results.map(r => r.value),
    [10, 40]
  );
  assert.throws(() => calculateTool('dilution', { initial: '2', target: '10', finalVolume: '50' }));
});
test('duration and compatible unit conversions', () => {
  assert.deepEqual(
    calculateTool('duration', { volume: '250', rate: '125' }).results.map(r => r.value),
    [2, 120]
  );
  assert.equal(value('convert', { value: '1', from: 'g', to: 'mcg' }), 1e6);
  assert.equal(value('convert', { value: '2', from: 'h', to: 'min' }), 120);
  assert.throws(() => calculateTool('convert', { value: '1', from: 'mg', to: 'ml' }));
});
test('anthropometrics and weight gain preserve dimensions and sign', () => {
  assert.equal(value('bmi', { weight: '81', height: '180' }), 25);
  assert.equal(value('bsa', { weight: '80', height: '180' }), 2);
  assert.equal(value('weightLoss', { usual: '80', weight: '72' }), 10);
  assert.equal(value('weightLoss', { usual: '80', weight: '88' }), -10);
});
test('Harris-Benedict coefficient branches', () => {
  near(value('harris', { age: '40', sex: 'male', weight: '80', height: '180' }), 1796.862);
  near(value('harris', { age: '40', sex: 'female', weight: '80', height: '180' }), 1571.793);
});
test('Cockcroft uses creatinine units consistently without rounding serum creatinine', () => {
  const input = { age: '68', sex: 'male', weight: '72', creatinine: '1', creatinineUnit: 'mgdl' };
  assert.equal(value('cg', input), 72);
  near(value('cg', { ...input, sex: 'female' }), 61.2);
  near(value('cg', { ...input, creatinine: '88.4', creatinineUnit: 'umol' }), 72);
});
test('CKD-EPI uses explicit sex, all four creatinine branches and adult-only validation', () => {
  near(
    value('ckd', { age: '50', sex: 'male', creatinine: '0.9', creatinineUnit: 'mgdl' }),
    104.04901299322522
  );
  near(
    value('ckd', { age: '50', sex: 'female', creatinine: '0.7', creatinineUnit: 'mgdl' }),
    105.29760114914392
  );
  for (const sex of ['male', 'female'])
    for (const creatinine of ['0.5', '2']) {
      const mg = value('ckd', { age: '50', sex, creatinine, creatinineUnit: 'mgdl' });
      const si = value('ckd', {
        age: '50',
        sex,
        creatinine: String(Number(creatinine) * 88.4),
        creatinineUnit: 'umol'
      });
      near(mg, si);
      assert.ok(mg > 0);
    }
  assert.throws(() =>
    calculateTool('ckd', { age: '17', sex: 'male', creatinine: '1', creatinineUnit: 'mgdl' })
  );
});
test('URR includes zero reduction and rejects inverted samples; Kt/V checks logarithm', () => {
  assert.equal(value('urr', { pre: '100', post: '30' }), 70);
  assert.equal(value('urr', { pre: '100', post: '100' }), 0);
  assert.throws(() => calculateTool('urr', { pre: '30', post: '100' }));
  near(
    value('ktv', { pre: '100', post: '30', hours: '4', uf: '2', postWeight: '70' }),
    1.4010540127569946
  );
  assert.throws(() =>
    calculateTool('ktv', { pre: '100', post: '1', hours: '4', uf: '2', postWeight: '70' })
  );
});
test('Child-Pugh threshold boundaries and clinical components', () => {
  assert.equal(
    value('child', { bilirubin: '1', albumin: '4', inr: '1', ascites: '1', encephalopathy: '1' }),
    5
  );
  assert.equal(
    value('child', {
      bilirubin: '2',
      albumin: '3.5',
      inr: '1.7',
      ascites: '2',
      encephalopathy: '2'
    }),
    10
  );
  assert.equal(
    value('child', {
      bilirubin: '3',
      albumin: '2.8',
      inr: '2.3',
      ascites: '1',
      encephalopathy: '1'
    }),
    8
  );
});
test('fluid balance and urine output allow zero and negative outcomes', () => {
  assert.equal(value('balance', { intake: '1000', output: '1200', hours: '24' }), -200);
  assert.equal(value('balance', { intake: '0', output: '0', hours: '8' }), 0);
  assert.equal(value('urine', { urine: '280', weight: '70', hours: '8' }), 0.5);
  assert.equal(value('urine', { urine: '0', weight: '70', hours: '8' }), 0);
  assert.throws(() => calculateTool('urine', { urine: '280', weight: '70', hours: '0' }));
});
test('MAP and shock use distinct ratios and reject swapped pressures', () => {
  near(value('map', { sbp: '120', dbp: '60' }), 80);
  near(value('shock', { heartRate: '90', sbp: '120' }), 0.75);
  assert.throws(() => calculateTool('map', { sbp: '60', dbp: '120' }));
});
test('CHA ages are mutually exclusive, stroke weighs two and VA omits sex', () => {
  const base = {
    age: '64',
    heart: '0',
    hypertension: '0',
    diabetes: '0',
    stroke: '0',
    vascular: '0'
  };
  assert.equal(value('cha', { ...base, sex: 'female' }), 1);
  assert.equal(value('chava', base), 0);
  assert.equal(value('chava', { ...base, age: '65' }), 1);
  assert.equal(value('chava', { ...base, age: '75', stroke: '1' }), 4);
});
test('HAS-BLED renal/hepatic and drugs/alcohol remain independent components', () => {
  const raw = {
    hypertension: '0',
    renal: '1',
    liver: '1',
    stroke: '0',
    bleeding: '0',
    labile: '0',
    elderly: '0',
    drugs: '1',
    alcohol: '1'
  };
  assert.equal(value('has', raw), 4);
});
test('Wells alternate diagnosis subtracts two, including negative totals', () => {
  const raw = {
    cancer: '0',
    paralysis: '0',
    bed: '0',
    tender: '0',
    leg: '0',
    calf: '0',
    edema: '0',
    veins: '0',
    previous: '0',
    alternative: '1'
  };
  assert.equal(value('wells', raw), -2);
  assert.equal(value('wells', { ...raw, alternative: '0', previous: '1', calf: '1' }), 2);
});
test('GCS non-testable is never imputed as one or summed', () => {
  assert.equal(value('gcs', { eye: '4', verbal: '5', motor: '6' }), 15);
  assert.equal(value('gcs', { eye: '1', verbal: '1', motor: '1' }), 3);
  const result = calculateTool('gcs', { eye: '4', verbal: 'NT', motor: '6' });
  assert.equal(result.results.length, 0);
  assert.match(result.explanation, /VNT/);
});
test('Barthel, Morse and Norton minima and maxima', () => {
  for (const [id, min, max] of [
    ['barthel', 0, 100],
    ['morse', 0, 125],
    ['norton', 5, 20],
    ['bishop', 0, 13]
  ]) {
    const tool = TOOLS.find(t => t.id === id);
    const build = fn =>
      Object.fromEntries(tool.fields.map(f => [f.name, String(fn(f.options.map(o => o[0])))]));
    assert.equal(
      value(
        id,
        build(a => Math.min(...a))
      ),
      min
    );
    assert.equal(
      value(
        id,
        build(a => Math.max(...a))
      ),
      max
    );
  }
});
test('P/F takes FiO2 as percent; tidal volume uses predicted not actual weight', () => {
  assert.equal(value('pf', { pao2: '80', fio2: '40' }), 200);
  assert.throws(() => calculateTool('pf', { pao2: '80', fio2: '0.4' }));
  const result = calculateTool('tidal', { height: '152.4', sex: 'male', mlkg: '6' });
  assert.deepEqual(
    result.results.map(r => r.value),
    [50, 300]
  );
});
test('CURB strict/inclusive clinical thresholds', () => {
  const raw = { age: '64', confusion: '0', urea: '7', respRate: '29', sbp: '90', dbp: '61' };
  assert.equal(value('curb', raw), 0);
  assert.equal(
    value('curb', { ...raw, age: '65', confusion: '1', urea: '7.1', respRate: '30', dbp: '60' }),
    5
  );
});
test('Winter interval, anion gap and wound area', () => {
  assert.deepEqual(
    calculateTool('winter', { bicarbonate: '12' }).results.map(r => r.value),
    [26, 24, 28]
  );
  assert.equal(value('anion', { sodium: '140', chloride: '104', bicarbonate: '24' }), 12);
  assert.equal(value('wound', { length: '2.5', width: '4' }), 10);
});
test('RASS preserves negative and zero scores; pain preserves zero', () => {
  assert.equal(value('rass', { rass: '-5' }), -5);
  assert.equal(value('rass', { rass: '0' }), 0);
  assert.equal(value('pain', { pain: '0' }), 0);
  assert.throws(() => calculateTool('pain', { pain: '5.5' }));
});
test('Apgar minute is metadata, never added to the total', () => {
  const raw = { minute: '20', color: '2', pulse: '2', reflex: '2', tone: '2', breath: '2' };
  assert.equal(value('apgar', raw), 10);
  assert.match(calculateTool('apgar', raw).explanation, /20/);
});
test('rejects empty, ambiguous, nonfinite and unknown selections in every tool', () => {
  for (const tool of TOOLS.filter(t => !t.reference))
    assert.throws(() => validateToolValues(tool, {}));
  for (const invalid of ['NaN', 'Infinity', '1e999', '1,000.5', '-1', ''])
    assert.throws(() => calculateTool('duration', { volume: invalid, rate: '1' }));
  assert.throws(() => calculateTool('rass', { rass: '99' }));
  assert.throws(() => calculateTool('push', {}));
});
