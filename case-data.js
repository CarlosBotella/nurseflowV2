/** Validación y búsqueda de los datos de un caso (síntomas, diagnóstico CIE-11 y referencia). */

/** Normaliza texto para búsquedas: sin tildes y en minúsculas. */
export const normalize = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
/** Valida los síntomas (máx. 40, 500 caracteres cada uno) y elimina vacíos y duplicados. */
export function validSymptoms(value = []) {
  if (!Array.isArray(value) || value.length > 40) throw new Error('Máximo 40 síntomas por caso.');
  return [
    ...new Set(
      value
        .map(item => {
          if (typeof item !== 'string' || item.length > 500)
            throw new Error('Síntoma inválido (máximo 500 caracteres).');
          return item.trim();
        })
        .filter(Boolean)
    )
  ];
}
/** Valida un diagnóstico CIE-11; solo acepta URIs de id.who.int. */
export function validDiagnosis(value = null) {
  if (value === null || value === undefined) return null;
  if (
    !value ||
    typeof value !== 'object' ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    value.title.length > 500
  )
    throw new Error('Diagnóstico inválido.');
  const uri = String(value.uri || '');
  if (
    !/^https?:\/\/id\.who\.int\/icd\/(?:entity\/\d{1,20}|release\/11\/\d{4}-\d{2}\/mms\/\d{1,20}(?:\/(?:other|unspecified))?)$/.test(
      uri
    )
  )
    throw new Error('URI de diagnóstico inválida.');
  const release = value.release == null ? null : String(value.release);
  if (release !== null && !/^\d{4}-\d{2}$/.test(release))
    throw new Error('Versión CIE-11 inválida.');
  if (String(value.code || '').length > 40) throw new Error('Código CIE-11 inválido.');
  return { title: value.title.trim(), uri, code: String(value.code || ''), release };
}
/** Indica si un caso contiene todos los términos de la búsqueda en sus campos de texto. */
export function matchesCase(row, query) {
  const haystack = normalize(
    [
      row.title,
      ...(row.tags || []),
      ...(row.symptoms || []),
      row.diagnosis?.title,
      row.diagnosis?.code,
      row.context,
      row.assessment,
      row.learning
    ].join(' ')
  );
  return normalize(query)
    .trim()
    .split(/\s+/)
    .every(term => haystack.includes(term));
}

/** Valida la referencia de MedlinePlus asociada a un caso (fuente, URL, resumen y fecha). */
export function validClinicalReference(value = null) {
  if (value == null) return null;
  if (
    value.source !== 'MedlinePlus.gov' ||
    typeof value.title !== 'string' ||
    value.title.length > 500 ||
    typeof value.summary !== 'string' ||
    value.summary.length > 150000 ||
    !/^https:\/\/medlineplus\.gov\/spanish\/[a-z0-9]+\.html$/.test(value.url || '') ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value.fetchedAt || '') ||
    !Number.isFinite(Date.parse(value.fetchedAt))
  )
    throw new Error('Referencia clínica inválida.');
  return {
    source: value.source,
    title: value.title,
    url: value.url,
    summary: value.summary,
    fetchedAt: value.fetchedAt
  };
}
