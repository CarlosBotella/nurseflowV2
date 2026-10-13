export const API_BASE = 'https://nurseflow-api.carlosb-n.workers.dev/';
/** Only reference terms/IDs go to the proxy. Never send a case or admin secret. */
export async function requestReference(path, params = {}, signal) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 25000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    let data;
    try { data = await response.json(); } catch { throw new Error('El servicio no ha devuelto una respuesta válida.'); }
    if (!response.ok) throw new Error(data.error || `No se pudo consultar el servicio (${response.status}).`);
    return { data, offline: response.headers.get('X-Turno-Offline') === '1', fetchedAt: response.headers.get('X-Turno-Fetched-At') || new Date().toISOString() };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error('No se pudo conectar con la API. Revisa la conexión y el origen permitido del Worker.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
