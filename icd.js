import { requestReference } from './api.js';

export function referenceText(value) {
  const raw = typeof value === 'string' ? value : value?.['@value'] || '';
  // WHO search titles include highlighting. Render only their text.
  const parsed = new DOMParser().parseFromString(raw, 'text/html');
  return parsed.body.textContent.trim();
}
export async function searchDiagnoses(q, signal) {
  const result = await requestReference('icd/search', { q }, signal);
  if (!Array.isArray(result.data.destinationEntities)) throw new Error('La OMS devolvió una búsqueda no reconocida.');
  return { ...result, rows: result.data.destinationEntities.map(row => {
    const uri = row.linearizationUri || row.id;
    return { title: referenceText(row.title), code: row.theCode || '', uri,
      release: uri?.includes('/release/') ? result.data.meta?.release || null : null };
  }).filter(row => row.title && row.uri) };
}
export const getDiagnosisDetail = uri => requestReference('icd/detail', { uri });
