/** Vista «Datos»: exportar, importar con vista previa y borrar los datos locales. */
import * as db from './db.js';
import { resetDatabase } from './db.js';
import { BACKUP_LABELS } from './backup-data.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
/** Descarga un objeto como archivo JSON. */
function download(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  );
  const link = el('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
/** Fecha actual en Madrid como AAAA-MM-DD (para el nombre del archivo). */
function localDate() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .formatToParts(new Date())
      .map(p => [p.type, p.value])
  );
  return `${p.year}-${p.month}-${p.day}`;
}
/** Conecta los controles de copia de seguridad. Devuelve { refresh }. */
export function initBackup({ announce, onImported }) {
  // pending: copia validada pendiente de confirmar; selection descarta lecturas obsoletas.
  let pending = null,
    busy = false,
    selection = 0;
  const status = message => {
    $('storage-status').textContent = message;
  };
  const fail = error => status(error.message || 'No se pudo completar la acción.');
  /** Lista los archivos originales conservados de importaciones anteriores. */
  async function refresh() {
    const archives = await db.listImports();
    const list = $('backup-originals');
    list.replaceChildren();
    if (!archives.length) return;
    for (const row of archives) {
      const source = JSON.parse(row.source);
      const item = el('article', undefined, 'list-item');
      item.append(
        el('h3', 'Archivo original de NurseFlow conservado'),
        el(
          'p',
          'Incluido en tus próximas exportaciones. Los apartados sin equivalente se conservan aquí, sin activarse como contenido clínico de esta app.'
        )
      );
      const details = el('details');
      details.append(el('summary', 'Ver datos conservados'));
      for (const [key, values] of Object.entries(source))
        if (Array.isArray(values))
          details.append(el('p', `${BACKUP_LABELS[key] || key}: ${values.length} registros`));
      item.append(details);
      const button = el('button', 'Descargar original conservado', 'secondary');
      button.type = 'button';
      button.addEventListener('click', () =>
        download(source, 'nurseflow-original-conservado.json')
      );
      item.append(button);
      list.append(item);
    }
  }
  // Exportar copia.
  $('export-data').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    $('export-data').disabled = true;
    try {
      download(await db.exportBackup(), `NurseFlowV2-copia-${localDate()}.json`);
      status(
        'Copia preparada: casos, agenda, matrícula, pendientes, favoritos, ajustes y originales conservados. Comprueba que se haya descargado.'
      );
    } catch (error) {
      fail(error);
    } finally {
      busy = false;
      $('export-data').disabled = false;
    }
  });
  // Selección de archivo: valida y muestra un resumen sin guardar nada todavía.
  $('import-data').addEventListener('change', async event => {
    const file = event.target.files[0],
      version = ++selection;
    pending = null;
    $('import-preview').hidden = true;
    $('import-summary').replaceChildren();
    try {
      if (!file) return;
      if (file.size > 30 * 1024 * 1024) throw new Error('Máximo 30 MB por copia.');
      status('Revisando copia…');
      let data;
      try {
        data = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      } catch {
        throw new Error('El archivo no contiene JSON válido. Selecciona una exportación .json.');
      }
      const result = await db.prepareImport(data);
      if (version !== selection) return;
      pending = result;
      const summary = $('import-summary');
      summary.append(
        el(
          'p',
          `${result.report.source}: ${result.cases.length} casos, ${result.favorites.length} medicamentos favoritos, ${result.planner.length} registros de agenda/estudios y ${result.settings.length} ajustes.`
        )
      );
      if (result.report.subjects !== undefined)
        summary.append(
          el(
            'p',
            `${result.report.subjects} asignaturas y ${result.report.classes} horarios de clase reconocidos.`
          )
        );
      for (const message of result.report.warnings)
        summary.append(el('p', message, 'privacy-note'));
      if (result.report.kept.length)
        summary.append(
          el(
            'p',
            `Conservado en el original, sin pantalla propia: ${result.report.kept.join(' · ')}.`
          )
        );
      if (result.imports.length)
        summary.append(
          el(
            'p',
            `${result.imports.length} archivo(s) original(es) se conservarán íntegramente para volver a descargarlos.`
          )
        );
      summary.append(
        el(
          'p',
          'Los registros y ajustes existentes se conservan. No se recuperan permisos de archivos, credenciales, bloqueos ni aceptaciones legales.',
          'fine-print'
        )
      );
      $('import-preview').hidden = false;
      status(
        'Archivo compatible. Revisa el resumen y pulsa Importar datos. Todavía no se ha guardado nada.'
      );
    } catch (error) {
      if (version === selection) fail(error);
    } finally {
      event.target.value = '';
    }
  });
  // Confirmar la importación.
  $('import-confirm').addEventListener('click', async () => {
    if (!pending || busy) return;
    busy = true;
    const data = pending;
    $('import-confirm').disabled = true;
    $('import-cancel').disabled = true;
    $('import-data').disabled = true;
    try {
      const count = await db.importBackup(data);
      pending = null;
      $('import-preview').hidden = true;
      await onImported();
      await refresh();
      status(
        count
          ? `${count} registros añadidos. Los existentes se han conservado.`
          : 'Esta copia ya estaba importada: no se han duplicado los registros.'
      );
      announce('Importación terminada. Puedes consultar Agenda y Mis estudios.');
    } catch (error) {
      fail(error);
    } finally {
      busy = false;
      $('import-confirm').disabled = false;
      $('import-cancel').disabled = false;
      $('import-data').disabled = false;
    }
  });
  // Cancelar la importación.
  $('import-cancel').addEventListener('click', () => {
    pending = null;
    selection++;
    $('import-preview').hidden = true;
    status('Importación cancelada. No se ha modificado ningún dato.');
  });
  // Borrado total con doble confirmación.
  $('wipe-data').addEventListener('click', async () => {
    if (
      !confirm(
        'Peligro Irreversible\n\n¿Borrar TODOS los datos locales permanentemente? Esto no se puede deshacer.'
      )
    )
      return;
    if (
      !confirm(
        'Confirmación final: se eliminarán casos, agenda, favoritos, ajustes y originales conservados. ¿Continuar?'
      )
    )
      return;
    await resetDatabase();
    location.reload();
  });
  refresh().catch(fail);
  return { refresh };
}
