/** IndexedDB only. Promises resolve after transaction commit, not request success. */
import { validSymptoms, validDiagnosis, matchesCase, validClinicalReference } from './case-data.js';
import { validImages } from './redaction.js';
import { validPlanner } from './planner-data.js';
import { isNurseFlow, convertNurseFlow, validSetting, validArchive } from './backup-data.js';
const NAME = 'NurseFlowV2-nursing';
const VERSION = 3;
let connection;

export function openDB() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cases')) {
      const cases = db.createObjectStore('cases', { keyPath: 'id' });
      cases.createIndex('updatedAt', 'updatedAt');
      cases.createIndex('tags', 'tags', { multiEntry: true });
      const favorites = db.createObjectStore('favorites', { keyPath: 'nregistro' });
      favorites.createIndex('savedAt', 'savedAt');
      db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('planner')) db.createObjectStore('planner', { keyPath: 'id' }).createIndex('type', 'type');
      if (!db.objectStoreNames.contains('imports')) db.createObjectStore('imports', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => {
      window.dispatchEvent(new CustomEvent('db-blocked'));
    };
  });
  return connection;
}

async function transaction(store, mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let value;
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(tx.error || new Error('No se pudo guardar.'));
    tx.onerror = () => {}; // abort handles the rejection
    try {
      const request = operation(tx.objectStore(store));
      request.onsuccess = () => { value = request.result; };
    } catch (error) { tx.abort(); reject(error); }
  });
}

function text(value, max, label) {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label}: formato o longitud inválidos.`);
  return value.trim();
}

function validCase(value) {
  const title = text(value.title, 160, 'Título');
  if (!title) throw new Error('El título es obligatorio.');
  if (!Array.isArray(value.tags) || value.tags.length > 30) throw new Error('Etiquetas inválidas.');
  return {
    id: text(value.id, 100, 'Identificador'), title,
    tags: [...new Set(value.tags.map(tag => text(tag, 100, 'Etiqueta')).filter(Boolean))],
    context: text(value.context, 10000, 'Contexto'),
    assessment: text(value.assessment, 30000, 'Valoración'),
    learning: text(value.learning, 30000, 'Notas'),
    symptoms: validSymptoms(value.symptoms),
    diagnosis: validDiagnosis(value.diagnosis),
    clinicalReference: validClinicalReference(value.clinicalReference),
    images: validImages(value.images),
    diagnosisStatus: value.diagnosisStatus === undefined ? 'unconfirmed' : (() => {
      if (!['confirmed', 'unconfirmed'].includes(value.diagnosisStatus)) throw new Error('Estado del diagnóstico inválido.');
      if (value.diagnosisStatus === 'confirmed' && !value.diagnosis) throw new Error('Selecciona un diagnóstico antes de marcarlo como confirmado.');
      return value.diagnosisStatus;
    })(),
    createdAt: validDate(value.createdAt), updatedAt: validDate(value.updatedAt)
  };
}

function validDate(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Fecha inválida.');
  return new Date(value).toISOString();
}

export async function createCase(input) {
  const now = new Date().toISOString();
  const row = validCase({ context: '', assessment: '', learning: '', tags: [], ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
  await transaction('cases', 'readwrite', store => store.add(row));
  return row;
}
export const getCase = id => transaction('cases', 'readonly', store => store.get(id));
export async function listCases(query = '') {
  const rows = await transaction('cases', 'readonly', store => store.getAll());
  return rows.filter(row => matchesCase(row, query)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function updateCase(id, patch) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cases', 'readwrite');
    const store = tx.objectStore('cases');
    let row, validationError;
    tx.oncomplete = () => resolve(row);
    tx.onabort = () => reject(validationError || tx.error || new Error('Actualización cancelada.'));
    tx.onerror = () => {};
    const request = store.get(id);
    request.onsuccess = () => {
      try {
        if (!request.result) throw new Error('El caso ya no existe.');
        row = validCase({ ...request.result, ...patch, id, createdAt: request.result.createdAt, updatedAt: new Date().toISOString() });
        store.put(row);
      } catch (error) { validationError = error; tx.abort(); }
    };
  });
}
export const deleteCase = id => transaction('cases', 'readwrite', store => store.delete(id));

function validFavorite(value) {
  if (!value || typeof value !== 'object') throw new Error('Favorito inválido.');
  const nregistro = text(value.nregistro, 30, 'Registro');
  if (!/^[a-zA-Z0-9]+$/.test(nregistro)) throw new Error('Registro inválido.');
  const nombre = text(value.nombre, 500, 'Medicamento');
  if (!nombre) throw new Error('Nombre de medicamento vacío.');
  return { nregistro, nombre, savedAt: validDate(value.savedAt) };
}
export const saveFavorite = value => transaction('favorites', 'readwrite', store => store.put(validFavorite({ ...value, savedAt: new Date().toISOString() })));
export const listFavorites = () => transaction('favorites', 'readonly', store => store.getAll());
export const deleteFavorite = id => transaction('favorites', 'readwrite', store => store.delete(id));
export const getSetting = key => transaction('settings', 'readonly', store => store.get(key));
export const setSetting = (key, value) => transaction('settings', 'readwrite', store => store.put({ key, value }));
export const listPlanner = () => transaction('planner', 'readonly', store => store.getAll());
export const savePlanner = value => transaction('planner', 'readwrite', store => store.put(validPlanner(value)));
export const deletePlanner = id => transaction('planner', 'readwrite', store => store.delete(id));
export async function seedPlanner(input) {
  const rows=input.map(validPlanner),db=await openDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction('planner','readwrite'),store=tx.objectStore('planner');
    for(const row of rows)store.get(row.id).onsuccess=event=>{if(!event.target.result)store.add(row);};
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('No se pudo cargar el calendario.'));
  });
}
export const listImports = () => transaction('imports', 'readonly', store => store.getAll());

export async function exportBackup() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cases', 'favorites', 'planner', 'settings', 'imports'], 'readonly');
    const result = { format: 'NurseFlowV2-backup', version: 3, exportedAt: new Date().toISOString() };
    for (const name of ['cases', 'favorites', 'planner', 'settings', 'imports']) tx.objectStore(name).getAll().onsuccess = event => { result[name] = event.target.result; };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error);
  });
}

/** Merge without overwriting existing records. Validate before opening write transaction. */
export async function prepareImport(input) {
  const nurseFlow = isNurseFlow(input);
  const backup = nurseFlow ? await convertNurseFlow(input) : input;
  if (!backup || backup.format !== 'NurseFlowV2-backup' || ![1,2,3].includes(backup.version) || !Array.isArray(backup.cases) || !Array.isArray(backup.favorites) || backup.cases.length > 5000 || backup.favorites.length > 5000 || (backup.version>=2 && (!Array.isArray(backup.planner) || backup.planner.length>20000)) || (backup.version===3 && (!Array.isArray(backup.settings) || backup.settings.length>100 || !Array.isArray(backup.imports) || backup.imports.length>100))) throw new Error('Copia incompatible o demasiado grande.');
  const cases = backup.cases.map(validCase);
  const favorites = backup.favorites.map(validFavorite);
  const planner = (backup.planner || []).map(validPlanner);
  const settings = (backup.settings || []).map(validSetting);
  const imports = (backup.imports || []).map(validArchive);
  if (cases.some(row => !row.id)) throw new Error('Identificador vacío.');
  for (const [rows,key] of [[cases,'id'],[favorites,'nregistro'],[planner,'id'],[settings,'key'],[imports,'id']]) if (new Set(rows.map(row=>row[key])).size!==rows.length) throw new Error('La copia contiene identificadores duplicados.');
  return {format:'NurseFlowV2-backup',version:3,cases,favorites,planner,settings,imports,report:nurseFlow ? backup.report : {source:'Copia NurseFlowV2',warnings:[],kept:[]}};
}
export async function importBackup(input) {
  const {cases,favorites,planner,settings,imports} = await prepareImport(input);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cases', 'favorites','planner','settings','imports'], 'readwrite');
    let added = 0;
    for (const [name, rows, key] of [['cases', cases, 'id'], ['favorites', favorites, 'nregistro'], ['planner',planner,'id'],['settings',settings,'key'],['imports',imports,'id']]) {
      const store = tx.objectStore(name);
      for (const row of rows) store.get(row[key]).onsuccess = event => {
        if (!event.target.result) { store.add(row); added++; }
        else if(name==='planner'&&row.type==='closure'&&row.customized&&event.target.result.type==='closure'&&!event.target.result.customized){store.put(row);added++;}
      };
    }
    tx.oncomplete = () => resolve(added);
    tx.onabort = () => reject(tx.error || new Error('No se importó la copia.'));
  });
}
