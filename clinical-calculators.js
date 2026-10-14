/** Motor de cálculo de las herramientas clínicas definidas en tool-catalog.js. */
import { TOOLS, validateToolValues } from './tool-catalog.js';
import { calculate } from './calculators.js';
// Factores de masa a mg.
const factors = { mcg: 0.001, mg: 1, g: 1000 };
// Conversión de unidades: [magnitud, factor respecto a la unidad base].
const conversion = {
  mcg: ['mass', 0.001],
  mg: ['mass', 1],
  g: ['mass', 1000],
  ml: ['volume', 1],
  l: ['volume', 1000],
  min: ['time', 1],
  h: ['time', 60],
  mmhg: ['pressure', 1],
  kpa: ['pressure', 7.50061683]
};
// Línea de resultado con su unidad y precisión de presentación.
const item = (label, value, unit = '', precision = 3) => ({ label, value, unit, precision });
// Suma de los campos indicados (escalas por puntos).
const sum = (v, keys) => keys.reduce((total, key) => total + v[key], 0);

/**
 * Valida las entradas de la herramienta `id` y calcula sus resultados.
 * @returns {{ results: Array, explanation: string, formula: string }}
 */
export function calculateTool(id, raw) {
  const tool = TOOLS.find(entry => entry.id === id);
  if (!tool || tool.reference) throw new Error('Herramienta no calculable.');
  const v = validateToolValues(tool, raw);
  let results,
    explanation = '';
  // Una rama por herramienta; las escalas genéricas por puntos van al final.
  if (['flow', 'drip', 'dose'].includes(id)) {
    const answer = calculate(id, v);
    results = [item('Resultado', answer.result, answer.unit, id === 'drip' ? 0 : 3)];
    explanation = answer.formula;
  } else if (id === 'duration')
    results = [
      item('Duración', v.volume / v.rate, 'h'),
      item('Duración', (v.volume / v.rate) * 60, 'min')
    ];
  else if (id === 'pump')
    results = [
      item(
        'Velocidad',
        (v.doseRate * (v.rateUnit === 'mcgmin' ? 0.06 : 1) * v.weight) / v.concentration,
        'mL/h'
      )
    ];
  else if (id === 'reversePump')
    results = [
      item(
        'Dosis correspondiente',
        ((v.rate * v.concentration) / v.weight) * (v.rateUnit === 'mcgmin' ? 1000 / 60 : 1),
        v.rateUnit === 'mcgmin' ? 'mcg/kg/min' : 'mg/kg/h'
      )
    ];
  else if (id === 'concentration')
    results = [item('Concentración', (v.mass * factors[v.massUnit]) / v.volume, 'mg/mL')];
  else if (id === 'dilution') {
    if (v.target > v.initial)
      throw new Error('La concentración objetivo supera la inicial: no se obtiene por dilución.');
    const original = (v.target * v.finalVolume) / v.initial;
    results = [
      item('Volumen de solución inicial', original, 'mL'),
      item('Diluyente hasta volumen final', v.finalVolume - original, 'mL')
    ];
  } else if (id === 'convert') {
    if (conversion[v.from][0] !== conversion[v.to][0])
      throw new Error('No se pueden convertir magnitudes distintas.');
    results = [
      item('Conversión', (v.value * conversion[v.from][1]) / conversion[v.to][1], v.to, 6)
    ];
  } else if (id === 'bmi') results = [item('IMC', v.weight / (v.height / 100) ** 2, 'kg/m²', 2)];
  else if (id === 'bsa')
    results = [item('Superficie corporal', Math.sqrt((v.weight * v.height) / 3600), 'm²')];
  else if (id === 'weightLoss')
    results = [item('Pérdida relativa', (100 * (v.usual - v.weight)) / v.usual, '%', 2)];
  else if (id === 'harris')
    results = [
      item(
        'Gasto energético en reposo',
        v.sex === 'male'
          ? 88.362 + 13.397 * v.weight + 4.799 * v.height - 5.677 * v.age
          : 447.593 + 9.247 * v.weight + 3.098 * v.height - 4.33 * v.age,
        'kcal/día',
        0
      )
    ];
  // Función renal: la creatinina se pasa a mg/dL si viene en µmol/L.
  else if (id === 'cg' || id === 'ckd') {
    const scr = v.creatinine / (v.creatinineUnit === 'umol' ? 88.4 : 1);
    const female = v.sex === 'female';
    if (id === 'cg')
      results = [
        item(
          'Aclaramiento estimado',
          (((140 - v.age) * v.weight) / (72 * scr)) * (female ? 0.85 : 1),
          'mL/min',
          2
        )
      ];
    else {
      // CKD-EPI 2021, sin coeficiente de raza.
      const k = female ? 0.7 : 0.9,
        alpha = female ? -0.241 : -0.302;
      results = [
        item(
          'TFG estimada',
          142 *
            Math.min(scr / k, 1) ** alpha *
            Math.max(scr / k, 1) ** -1.2 *
            0.9938 ** v.age *
            (female ? 1.012 : 1),
          'mL/min/1,73 m²',
          2
        )
      ];
    }
    explanation = `Creatinina usada en la fórmula: ${scr} mg/dL. No se redondea ni se eleva artificialmente.`;
  } else if (id === 'urr' || id === 'ktv') {
    if (v.post > v.pre)
      throw new Error(
        'La urea postdiálisis supera la prediálisis. Revisa el orden y las unidades.'
      );
    // URR y spKt/V (Daugirdas II).
    const r = v.post / v.pre;
    if (id === 'urr') results = [item('Reducción de urea', 100 * (1 - r), '%', 2)];
    else {
      if (r - 0.008 * v.hours <= 0)
        throw new Error('Valores incompatibles con el dominio de Daugirdas II.');
      results = [
        item(
          'spKt/V',
          -Math.log(r - 0.008 * v.hours) + ((4 - 3.5 * r) * v.uf) / v.postWeight,
          '',
          3
        )
      ];
    }
  } else if (id === 'child') {
    // Child–Pugh: bilirrubina, albúmina e INR puntúan por tramos.
    const components = [
      v.bilirubin < 2 ? 1 : v.bilirubin <= 3 ? 2 : 3,
      v.albumin > 3.5 ? 1 : v.albumin >= 2.8 ? 2 : 3,
      v.inr < 1.7 ? 1 : v.inr <= 2.3 ? 2 : 3,
      v.ascites,
      v.encephalopathy
    ];
    const total = components.reduce((a, b) => a + b, 0);
    results = [item('Child–Pugh', total, 'puntos', 0)];
    explanation = `Clase ${total <= 6 ? 'A' : total <= 9 ? 'B' : 'C'}. Componentes: bilirrubina ${components[0]}, albúmina ${components[1]}, INR ${components[2]}, ascitis ${components[3]}, encefalopatía ${components[4]}.`;
  } else if (id === 'balance') {
    results = [item('Balance', v.intake - v.output, 'mL', 0)];
    explanation = `Intervalo: ${v.hours} h. Ingresos ${v.intake} mL; egresos ${v.output} mL.`;
  } else if (id === 'urine') results = [item('Diuresis', v.urine / v.weight / v.hours, 'mL/kg/h')];
  else if (id === 'anion')
    results = [item('Anión gap sin K', v.sodium - v.chloride - v.bicarbonate, 'mmol/L', 2)];
  else if (id === 'map' || id === 'curb') {
    if (v.dbp > v.sbp) throw new Error('La presión diastólica supera la sistólica.');
    if (id === 'map') results = [item('PAM aproximada', (v.sbp + 2 * v.dbp) / 3, 'mmHg', 1)];
    else {
      // CURB-65: un punto por criterio.
      const points = [
        v.confusion,
        Number(v.urea > 7),
        Number(v.respRate >= 30),
        Number(v.sbp < 90 || v.dbp <= 60),
        Number(v.age >= 65)
      ];
      results = [
        item(
          'CURB-65',
          points.reduce((a, b) => a + b, 0),
          'puntos',
          0
        )
      ];
      explanation = `C ${points[0]} · U ${points[1]} · R ${points[2]} · B ${points[3]} · edad ${points[4]}.`;
    }
  } else if (id === 'shock') results = [item('Índice de shock', v.heartRate / v.sbp, '', 2)];
  else if (id === 'cha' || id === 'chava') {
    // CHA₂DS₂-VASc / CHA₂DS₂-VA: la edad suma 1 o 2 puntos de forma excluyente.
    const agePoints = v.age >= 75 ? 2 : v.age >= 65 ? 1 : 0;
    const total =
      sum(v, ['heart', 'hypertension', 'diabetes', 'vascular']) +
      2 * v.stroke +
      agePoints +
      (id === 'cha' && v.sex === 'female' ? 1 : 0);
    results = [item(tool.title, total, 'puntos', 0)];
    explanation = `Edad: ${agePoints}; ictus/AIT/embolia previa: ${v.stroke * 2}. Las bandas de edad son excluyentes.`;
  } else if (id === 'wells') {
    const total =
      sum(v, [
        'cancer',
        'paralysis',
        'bed',
        'tender',
        'leg',
        'calf',
        'edema',
        'veins',
        'previous'
      ]) -
      2 * v.alternative;
    results = [item('Wells TVP', total, 'puntos', 0)];
    explanation = `Modelo de dos niveles: ${total >= 2 ? 'TVP probable' : 'TVP poco probable'}. No confirma ni descarta el diagnóstico.`;
  } else if (id === 'gcs') {
    explanation = `Ocular E${v.eye} · Verbal V${v.verbal} · Motor M${v.motor}`;
    results = Object.values(v).includes('NT')
      ? []
      : [item('Glasgow', v.eye + v.verbal + v.motor, '/ 15', 0)];
    if (!results.length)
      explanation += '\nNo se calcula total: hay un componente no valorable. NT no equivale a 1.';
  } else if (id === 'pf') results = [item('PaO₂/FiO₂', v.pao2 / (v.fio2 / 100), 'mmHg', 1)];
  else if (id === 'tidal') {
    // Peso corporal predicho (fórmula ARDSNet).
    const pbw = (v.sex === 'male' ? 50 : 45.5) + 0.91 * (v.height - 152.4);
    if (pbw <= 0) throw new Error('El peso predicho no es válido para estos datos.');
    results = [
      item('Peso corporal predicho', pbw, 'kg', 2),
      item('Volumen al coeficiente indicado', pbw * v.mlkg, 'mL', 0)
    ];
  } else if (id === 'winter') {
    // Fórmula de Winter: PaCO₂ esperada ± 2 mmHg.
    const mid = 1.5 * v.bicarbonate + 8;
    results = [
      item('PaCO₂ esperada central', mid, 'mmHg', 1),
      item('Límite inferior', mid - 2, 'mmHg', 1),
      item('Límite superior', mid + 2, 'mmHg', 1)
    ];
  } else if (id === 'pain') results = [item('Dolor autorreferido', v.pain, '/ 10', 0)];
  else if (id === 'rass') {
    results = [item('RASS', v.rass, '', 0)];
    explanation = tool.fields[0].options.find(([value]) => value === v.rass)[1];
  } else if (id === 'apgar') {
    results = [item('Apgar', sum(v, ['color', 'pulse', 'reflex', 'tone', 'breath']), '/ 10', 0)];
    explanation = `Evaluación al minuto ${v.minute}.`;
  } else if (id === 'wound') results = [item('Área rectangular', v.length * v.width, 'cm²', 2)];
  // Resto de escalas: suma directa de los puntos de cada campo.
  else if (tool.score)
    results = [
      item(
        tool.title,
        sum(
          v,
          tool.fields.map(field => field.name)
        ),
        'puntos',
        0
      )
    ];
  else throw new Error('Fórmula no implementada.');
  // ── Comprobaciones finales del resultado ──
  if (results.some(entry => !Number.isFinite(entry.value)))
    throw new Error('Resultado fuera del rango numérico.');
  // Herramientas cuyo resultado debe ser estrictamente positivo.
  const positiveResults = [
    'duration',
    'pump',
    'reversePump',
    'concentration',
    'bmi',
    'bsa',
    'harris',
    'cg',
    'ckd',
    'ktv',
    'pf',
    'tidal',
    'winter',
    'shock',
    'map'
  ];
  if (positiveResults.includes(id) && results.some(entry => entry.value <= 0))
    throw new Error(
      'Resultado no positivo o inferior a la precisión numérica. Revisa las entradas y la aplicabilidad de la fórmula.'
    );
  if (id === 'dilution' && results[0].value <= 0)
    throw new Error('El volumen calculado es inferior a la precisión numérica.');
  return { results, explanation, formula: tool.formula };
}
