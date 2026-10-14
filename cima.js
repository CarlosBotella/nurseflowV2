/** Consultas a CIMA (AEMPS) a través del Worker proxy. */

import { requestReference } from './api.js';
/** Busca medicamentos por nombre o principio activo. */
export const searchMedicines = (term, signal) =>
  requestReference('cima/search', { q: term }, signal);
/** Ficha clínica agregada de un medicamento: secciones, notas, materiales y suministro. */
export const getClinicalBundle = nregistro => requestReference('cima/clinical', { nregistro });
