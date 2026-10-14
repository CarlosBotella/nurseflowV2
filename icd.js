/** Búsqueda y detalle de diagnósticos CIE-11 de la OMS a través del Worker proxy. */

import { requestReference } from './api.js';

/** Texto plano de un campo de la API de la OMS (cadena u objeto { '@value' }). */
export function referenceText(value) {
  const raw = typeof value === 'string' ? value : value?.['@value'] || '';
  // Los títulos de búsqueda de la OMS incluyen resaltado HTML: se conserva solo el texto.
  const parsed = new DOMParser().parseFromString(raw, 'text/html');
  return parsed.body.textContent.trim();
}
/** Busca diagnósticos y normaliza cada resultado a { title, code, uri, release }. */
export async function searchDiagnoses(q, signal) {
  const result = await requestReference('icd/search', { q }, signal);
  if (!Array.isArray(result.data.destinationEntities))
    throw new Error('La OMS devolvió una búsqueda no reconocida.');
  return {
    ...result,
    rows: result.data.destinationEntities
      .map(row => {
        const uri = row.linearizationUri || row.id;
        return {
          title: referenceText(row.title),
          code: row.theCode || '',
          uri,
          release: uri?.includes('/release/') ? result.data.meta?.release || null : null
        };
      })
      .filter(row => row.title && row.uri)
  };
}
/** Entidad CIE-11 completa (definición, criterios…) a partir de su URI. */
export const getDiagnosisDetail = uri => requestReference('icd/detail', { uri });
