import * as db from './db.js';
import { BACKUP_LABELS } from './backup-data.js';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=el('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function initBackup({announce,onImported}){
 let pending=null,busy=false,selection=0;
 const status=message=>{$('storage-status').textContent=message;};
 const fail=error=>status(error.message||'No se pudo completar la acción.');
 async function refresh(){const archives=await db.listImports();const list=$('backup-originals');list.replaceChildren();if(!archives.length)return;
  for(const row of archives){const source=JSON.parse(row.source);const item=el('article',undefined,'list-item');item.append(el('h3','Archivo original de NurseFlow conservado'),el('p','Incluido en tus próximas exportaciones. Los apartados sin equivalente se conservan aquí, sin activarse como contenido clínico de esta app.'));
   const details=el('details');details.append(el('summary','Ver datos conservados'));for(const [key,values]of Object.entries(source))if(Array.isArray(values))details.append(el('p',`${BACKUP_LABELS[key]||key}: ${values.length} registros`));item.append(details);
   const button=el('button','Descargar original conservado','secondary');button.type='button';button.addEventListener('click',()=>download(source,'nurseflow-original-conservado.json'));item.append(button);list.append(item);
  }
 }
 $('export-data').addEventListener('click',async()=>{if(busy)return;busy=true;$('export-data').disabled=true;try{download(await db.exportBackup(),`NurseFlowV2-copia-${new Date().toISOString().slice(0,10)}.json`);status('Copia preparada: casos, agenda, matrícula, pendientes, favoritos, ajustes y originales conservados. Comprueba que se haya descargado.');}catch(error){fail(error);}finally{busy=false;$('export-data').disabled=false;}});
 $('import-data').addEventListener('change',async event=>{
  const file=event.target.files[0],version=++selection;pending=null;$('import-preview').hidden=true;$('import-summary').replaceChildren();
  try{if(!file)return;if(file.size>30*1024*1024)throw new Error('Máximo 30 MB por copia.');status('Revisando copia…');let data;try{data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));}catch{throw new Error('El archivo no contiene JSON válido. Selecciona una exportación .json.');}
   const result=await db.prepareImport(data);if(version!==selection)return;pending=result;
   const summary=$('import-summary');summary.append(el('p',`${result.report.source}: ${result.cases.length} casos, ${result.favorites.length} medicamentos favoritos, ${result.planner.length} registros de agenda/estudios y ${result.settings.length} ajustes.`));
   if(result.report.subjects!==undefined)summary.append(el('p',`${result.report.subjects} asignaturas y ${result.report.classes} horarios de clase reconocidos.`));
   for(const message of result.report.warnings)summary.append(el('p',message,'privacy-note'));
   if(result.report.kept.length)summary.append(el('p',`Conservado en el original, sin pantalla propia: ${result.report.kept.join(' · ')}.`));
   if(result.imports.length)summary.append(el('p',`${result.imports.length} archivo(s) original(es) se conservarán íntegramente para volver a descargarlos.`));
   summary.append(el('p','Los registros y ajustes existentes se conservan. No se recuperan permisos de archivos, credenciales, bloqueos ni aceptaciones legales.','fine-print'));
   $('import-preview').hidden=false;status('Archivo compatible. Revisa el resumen y pulsa Importar datos. Todavía no se ha guardado nada.');
  }catch(error){if(version===selection)fail(error);}finally{event.target.value='';}
 });
 $('import-confirm').addEventListener('click',async()=>{if(!pending||busy)return;busy=true;const data=pending;$('import-confirm').disabled=true;$('import-cancel').disabled=true;$('import-data').disabled=true;
  try{const count=await db.importBackup(data);pending=null;$('import-preview').hidden=true;await onImported();await refresh();status(count?`${count} registros añadidos. Los existentes se han conservado.`:'Esta copia ya estaba importada: no se han duplicado los registros.');announce('Importación terminada. Puedes consultar Agenda y Mis estudios.');}
  catch(error){fail(error);}finally{busy=false;$('import-confirm').disabled=false;$('import-cancel').disabled=false;$('import-data').disabled=false;}
 });
 $('import-cancel').addEventListener('click',()=>{pending=null;selection++;$('import-preview').hidden=true;status('Importación cancelada. No se ha modificado ningún dato.');});
 refresh().catch(fail);return {refresh};
}
