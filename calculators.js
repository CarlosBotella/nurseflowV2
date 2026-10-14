/** Calculadoras básicas de medicación: velocidad de infusión, goteo y volumen de dosis. */

/** Convierte una entrada de texto en número positivo (admite coma decimal) o lanza un error legible. */
export function positive(value, label) {
  const raw = String(value).trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(raw))
    throw new Error(`${label}: introduce un número positivo, sin separadores de miles.`);
  const number = Number(raw.replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0)
    throw new Error(`${label}: debe ser mayor que cero.`);
  return number;
}
/**
 * Calcula una de las fórmulas básicas y devuelve { result, formula, unit }.
 * @param {'flow'|'drip'|'dose'} kind Tipo de cálculo.
 * @param {object} values Valores del formulario, todavía como texto.
 */
export function calculate(kind, values) {
  let result, formula, unit;
  if (kind === 'flow' || kind === 'drip') {
    const volume = positive(values.volume, 'Volumen');
    const minutes = positive(values.minutes, 'Tiempo');
    if (kind === 'flow') {
      result = (volume * 60) / minutes;
      formula = `${volume} mL × 60 min/h ÷ ${minutes} min`;
      unit = 'mL/h';
    } else {
      const factor = positive(values.factor, 'Factor');
      result = (volume * factor) / minutes;
      formula = `${volume} mL × ${factor} gotas/mL ÷ ${minutes} min`;
      unit = 'gotas/min';
    }
  } else if (kind === 'dose') {
    const prescribed = positive(values.prescribed, 'Dosis prescrita');
    const available = positive(values.available, 'Cantidad disponible');
    const volume = positive(values.volume, 'Volumen disponible');
    // Factores para convertir cada unidad de masa a mg.
    const factors = { g: 1000, mg: 1, mcg: 0.001 };
    if (!(values.prescribedUnit in factors) || !(values.availableUnit in factors))
      throw new Error('Unidad incompatible.');
    result =
      ((prescribed * factors[values.prescribedUnit]) /
        (available * factors[values.availableUnit])) *
      volume;
    formula = `(${prescribed} ${values.prescribedUnit} × ${factors[values.prescribedUnit]} mg/${values.prescribedUnit}) ÷ (${available} ${values.availableUnit} × ${factors[values.availableUnit]} mg/${values.availableUnit}) × ${volume} mL`;
    unit = 'mL';
  } else throw new Error('Calculadora desconocida.');
  if (!Number.isFinite(result) || result <= 0)
    throw new Error('Resultado fuera del rango numérico.');
  return { result, formula, unit };
}
