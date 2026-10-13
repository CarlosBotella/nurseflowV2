import * as db from './db.js';
import { initTools } from './tools-ui.js';
import { searchMedicines, getClinicalBundle } from './cima.js';
import { initCases } from './cases-ui.js';
import { initPlanner } from './planner-ui.js';
import { initBackup } from './backup-ui.js';

const $ = id => document.getElementById(id);
const announce = message => { $('global-status').textContent = message; };
const date = value => new Date(value).toLocaleString('es-ES');
const fail = error => announce(error.message || 'No se pudo completar la acción.');
const run = task => Promise.resolve().then(task).catch(fail);
const el = (tag, content, className) => { const node = document.createElement(tag); if (content !== undefined) node.textContent = content; if (className) node.className = className; return node; };
const button = (label, action, className = 'secondary') => { const node = el('button', label, className); node.type = 'button'; node.addEventListener('click', () => run(action)); return node; };
let dirty = false;
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('db-blocked', () => announce('Cierra otras pestañas de NurseFlowV2 para actualizar el almacenamiento.'));

function navigate() {
  const id = location.hash.slice(1);
  const target = ['tools', 'medications', 'cases', 'saved', 'agenda', 'studies', 'data', 'holidays'].includes(id) ? id : 'tools';
  window.scrollTo(0, 0);
  document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== target; });
  document.querySelectorAll('.tabbar a').forEach(node => { if (node.hash === `#${['studies','data'].includes(target) ? 'saved' : target==='holidays'?'agenda':target}`) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
  if (target === 'cases') run(renderCases);
  if (target === 'saved') run(renderFavorites);
  if (['agenda','studies','holidays'].includes(target)) run(() => plannerUI.refresh());
  if (target === 'data') run(() => backupUI.refresh());
}
window.addEventListener('hashchange', navigate);
navigate();
const connection = () => { $('connection').textContent = navigator.onLine ? 'Red disponible' : 'Sin conexión'; };
window.addEventListener('online', connection); window.addEventListener('offline', connection); connection();

const toolsUI = initTools();

const casesUI = initCases({ announce, setDirty: value => { dirty = value; }, isDirty: () => dirty });
const plannerUI = initPlanner({ announce });
const backupUI = initBackup({announce,onImported:async()=>{
  await renderFavorites(); await renderCases(); await plannerUI.refresh(); await toolsUI.refresh();
  const saved=await db.getSetting('theme');if(saved){$('theme').value=saved.value;document.documentElement.dataset.theme=saved.value;}
}});
function renderCases() { return casesUI.renderCases(); }

let debounce, searchController, searchGeneration = 0;
function invalidateSearch() { clearTimeout(debounce); searchController?.abort(); searchGeneration++; $('more-results').hidden = true; }
$('med-query').addEventListener('input', () => { invalidateSearch(); debounce = setTimeout(() => search(false), 300); });
$('search-form').addEventListener('submit', event => { event.preventDefault(); invalidateSearch(); search(false); });
async function search() {
  detailGeneration++; $('med-detail').hidden = true; $('med-results').hidden = false;
  const term = $('med-query').value.trim();
  if (term.length < 3) { $('med-results').replaceChildren(); $('search-status').textContent = 'Escribe al menos 3 caracteres para buscar.'; return; }
  searchController?.abort(); searchController = new AbortController();
  const generation = ++searchGeneration;
  $('search-status').textContent = 'Consultando CIMA…'; $('more-results').hidden = true;
  $('med-results').replaceChildren();
  try {
    const result = await searchMedicines(term, searchController.signal);
    if (generation !== searchGeneration) return;
    const rows = result.data;
    if (!Array.isArray(rows)) throw new Error('CIMA devolvió una respuesta no reconocida.');
    $('search-status').textContent = `${rows.length} resultados (máximo 50) · ${result.offline ? 'Copia local; puede estar desactualizada' : 'Consulta CIMA'} · ${date(result.fetchedAt)}`;
    if (!rows.length) $('med-results').append(el('p', 'No hay coincidencias. Prueba otro nombre o principio activo.', 'empty'));
    for (const row of rows) {
      const item = el('article', undefined, 'list-item');
      item.append(el('h3', row.nombre), el('p', `Registro ${row.nregistro} · ${row.comerc ? 'Con presentaciones comercializadas' : 'No comercializado'}`));
      item.append(button('Consultar medicamento', () => showMedicine(row.nregistro)));
      $('med-results').append(item);
    }
    $('more-results').hidden = true;
  } catch (error) { if (generation === searchGeneration) $('search-status').textContent = error.name === 'AbortError' ? 'La consulta ha tardado demasiado. Inténtalo de nuevo.' : error.message; }
}

function officialLink(label, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['aemps.es','aemps.gob.es'].some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return el('span', 'Enlace oficial no disponible');
    const link = el('a', label, 'text-link'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
  } catch { return el('span', 'Enlace oficial no disponible'); }
}
// Preserve paragraphs and tables without injecting remote HTML or attributes.
function safeDocument(html) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P','DIV','SPAN','BR','UL','OL','LI','STRONG','B','EM','I','TABLE','THEAD','TBODY','TR','TH','TD','H2','H3','H4','SUP','SUB']);
  function copy(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    const fragment = document.createDocumentFragment();
    if (node.nodeType !== Node.ELEMENT_NODE || ['SCRIPT','STYLE','IFRAME','OBJECT','IMG'].includes(node.tagName)) return fragment;
    const target = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : fragment;
    if (['TD','TH'].includes(node.tagName)) for (const name of ['colspan','rowspan']) { const value = node.getAttribute(name); if (/^[1-9]\d?$/.test(value || '')) target.setAttribute(name, value); }
    node.childNodes.forEach(child => target.append(copy(child))); return target;
  }
  const fragment = document.createDocumentFragment(); parsed.body.childNodes.forEach(node => fragment.append(copy(node))); return fragment;
}
let detailGeneration = 0;
async function showMedicine(id) {
  const generation = ++detailGeneration; $('med-detail').hidden = false;
  $('med-results').hidden = true; $('more-results').hidden = true;
  $('detail-title').textContent = 'Consultando medicamento…'; $('detail-content').replaceChildren();
  try {
    const result = await getClinicalBundle(id);
    if (generation !== detailGeneration) return;
    const bundle = result.data;
    const row = bundle.medicine;
    if (!row.nregistro || !row.nombre) throw new Error('Ficha no disponible.');
    $('detail-title').textContent = row.nombre;
    const content = $('detail-content');
    content.append(el('p', `Fuente: AEMPS · ${date(result.fetchedAt)}${result.offline ? ' · COPIA LOCAL: puede estar desactualizada.' : ''}`, 'detail-meta'));
    content.append(el('p', [row.pactivos, row.formaFarmaceutica?.nombre, ...(row.viasAdministracion || []).map(v => v.nombre)].filter(Boolean).join(' · ')));
    content.append(el('p', `Seguridad: ${row.notas ? 'CIMA señala notas asociadas.' : 'No se indican notas asociadas en esta respuesta; no garantiza ausencia de riesgos.'} ${row.psum ? 'CIMA señala problemas de suministro.' : ''}`));
    const links = el('div', undefined, 'actions');
    for (const doc of row.docs || []) if ([1,2].includes(doc.tipo)) links.append(officialLink(doc.tipo === 1 ? 'Ficha técnica oficial ↗' : 'Prospecto oficial ↗', doc.urlHtml || doc.url));
    links.append(button('Guardar favorito', async () => { await db.saveFavorite(row); announce('Favorito guardado. Los documentos oficiales enlazados necesitan conexión.'); })); content.append(links);
    if (bundle.partial) content.append(el('p', 'Consulta incompleta: algunos recursos no se pudieron obtener. Revisa la ficha oficial.', 'privacy-note'));
    for (const [section, title] of [['4.2','Posología y administración'],['4.3','Contraindicaciones'],['4.4','Advertencias'],['4.5','Interacciones']]) {
      const details = el('details'); details.append(el('summary', title));
      const body = el('div', undefined, 'document-content'); details.append(body);
      if (!Array.isArray(bundle.sections)) body.textContent = 'No se pudieron consultar las secciones. Abre la ficha técnica oficial.';
      else {
        const sections = bundle.sections.filter(item => String(item.seccion ?? item.numero ?? '').trim() === section || String(item.titulo || '').trim().startsWith(section));
        if (!sections.length) body.textContent = 'Esta sección no está disponible en la respuesta. Consulta la ficha oficial completa.';
        for (const item of sections) body.append(el('h3', item.titulo || title), safeDocument(item.contenido || ''));
      }
      content.append(details);
    }
    for (const [key, title] of [['notes','Notas de seguridad'],['materials','Materiales de seguridad'],['supply','Problemas de suministro']]) {
      const details = el('details'); details.append(el('summary', title));
      const resources = bundle[key];
      if (!Array.isArray(resources)) details.append(el('p', 'No se pudo consultar este recurso. No equivale a ausencia de alertas.', 'privacy-note'));
      else if (!resources.length) details.append(el('p', 'La consulta no devuelve elementos. Revisa también la ficha técnica oficial.', 'muted'));
      else for (const item of resources) {
        const entry = el('div', undefined, 'list-item');
        entry.append(el('p', item.asunto || item.titulo || item.nombre || item.presentationName || title));
        if (item.observaciones) entry.append(el('p', item.observaciones));
        if (item.url || item.urlHtml) entry.append(officialLink('Abrir recurso oficial ↗', item.url || item.urlHtml));
        details.append(entry);
      }
      content.append(details);
    }
    content.append(el('p', 'Las consultas recientes se almacenan temporalmente. Un favorito guarda su identificación; este sprint todavía no fija documentos para descarga permanente.', 'fine-print'));
  } catch (error) { if (generation === detailGeneration) { $('detail-title').textContent = 'No se pudo abrir la ficha'; $('detail-content').textContent = error.message; } }
}
$('close-detail').addEventListener('click', () => { detailGeneration++; $('med-detail').hidden = true; $('med-results').hidden = false; });

async function renderFavorites() {
  const rows = await db.listFavorites(); $('favorite-list').replaceChildren();
  if (!rows.length) $('favorite-list').append(el('p', 'Guarda un medicamento desde su ficha para encontrarlo aquí.', 'empty'));
  for (const row of rows) {
    const item = el('article', undefined, 'list-item'); item.append(el('h3', row.nombre), el('p', `Registro ${row.nregistro} · favorito guardado ${date(row.savedAt)}`));
    const actions = el('div', undefined, 'actions'); actions.append(button('Consultar', () => { location.hash = 'medications'; return showMedicine(row.nregistro); }), button('Quitar favorito', async () => { await db.deleteFavorite(row.nregistro); await renderFavorites(); }, 'quiet')); item.append(actions); $('favorite-list').append(item);
  }
}
$('persist-data').addEventListener('click', () => run(async () => {
  const granted = await navigator.storage?.persist?.();
  $('storage-status').textContent = granted ? 'Almacenamiento persistente concedido. Mantén una copia exportada.' : 'El navegador no ha concedido almacenamiento persistente. Exporta copias periódicamente.';
}));
$('theme').addEventListener('change', () => run(async () => { const value = $('theme').value; document.documentElement.dataset.theme = value; await db.setSetting('theme', value); }));
run(async () => { await db.openDB(); const saved = await db.getSetting('theme'); if (['system','light','dark'].includes(saved?.value)) { $('theme').value = saved.value; document.documentElement.dataset.theme = saved.value; } });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(async registration => {
    await navigator.serviceWorker.ready;
    $('offline-ready').textContent = 'Aplicación preparada para uso offline. CIMA y CIE-11: solo consultas almacenadas temporalmente.';
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) announce('Nueva versión preparada. Guarda tus cambios y cierra todas las pestañas de NurseFlowV2 para aplicarla.'); });
    });
  }).catch(() => { $('offline-ready').textContent = 'No se ha podido preparar el uso offline. Abre la app mediante HTTPS o localhost.'; });
} else $('offline-ready').textContent = 'Este navegador no admite el uso offline de la aplicación.';
