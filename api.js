/**
 * Cliente HTTP del Worker proxy de NurseFlow (CIMA, CIE-11 y MedlinePlus).
 * Centraliza el tiempo de espera, la cancelación y los mensajes de error en español.
 */

export const API_BASE = 'https://nurseflow-api.carlosb-n.workers.dev/';
/**
 * Consulta una ruta de referencia del Worker y devuelve { data, offline, fetchedAt }.
 * Solo se envían términos o identificadores de referencia: nunca datos de un caso ni secretos.
 * @param {string} path Ruta relativa (p. ej. 'cima/search').
 * @param {Record<string, string>} params Parámetros de consulta.
 * @param {AbortSignal} [signal] Señal externa para cancelar la petición.
 */
export async function requestReference(path, params = {}, signal) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  // Une la señal externa y un tiempo máximo de 25 s en un único AbortController.
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 25000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('El servicio no ha devuelto una respuesta válida.');
    }
    if (!response.ok)
      throw new Error(data.error || `No se pudo consultar el servicio (${response.status}).`);
    return {
      data,
      // Cabeceras que añade el service worker cuando la respuesta sale de la caché.
      offline: response.headers.get('X-NurseFlowV2-Offline') === '1',
      fetchedAt: response.headers.get('X-NurseFlowV2-Fetched-At') || new Date().toISOString()
    };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    // fetch lanza TypeError ante fallos de red o de CORS.
    if (error instanceof TypeError)
      throw new Error(
        'No se pudo conectar con la API. Revisa la conexión y el origen permitido del Worker.'
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
