import { requestReference } from './api.js';
export const searchMedicines = (term, signal) => requestReference('cima/search', { q: term }, signal);
export const getClinicalBundle = nregistro => requestReference('cima/clinical', { nregistro });
