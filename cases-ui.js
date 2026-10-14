/** Vista «Casos»: listado, editor, diagnóstico CIE-11, síntomas, referencia MedlinePlus e imágenes. */
import * as db from './db.js';
import { normalize, validSymptoms } from './case-data.js';
import { searchDiagnoses, getDiagnosisDetail, referenceText } from './icd.js';
import { initImageEditor } from './ocr-ui.js';
import { findClinicalArticles, articleSections, exactArticle } from './clinical-reference.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};

/** Inicializa la vista de casos. Devuelve { renderCases }. */
export function initCases({ announce, setDirty, isDirty }) {
  // Estado del caso en edición; los contadores *Generation descartan respuestas obsoletas.
  let images = [],
    symptoms = [],
    diagnosis = null,
    clinicalReference = null,
    suggestedSymptoms = [],
    clinicalGeneration = 0,
    clinicalController,
    generation = 0,
    controller,
    debounce,
    listGeneration = 0;
  // Borrador guardado en IndexedDB (sobrevive al cierre de la app) y temporizador de autoguardado.
  let draft = null,
    draftTimer,
    wiped = false;
  window.addEventListener('data-wiped', () => {
    wiped = true;
    clearTimeout(draftTimer);
  });
  // Marca el caso con cambios sin guardar y programa el autoguardado del borrador.
  const markDirty = () => {
    setDirty(true);
    $('case-status').textContent = 'Cambios sin guardar';
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 1500);
  };
  /** Datos del formulario en el formato de createCase/updateCase. */
  function collectInput() {
    return {
      images,
      clinicalReference,
      title: $('case-title').value,
      symptoms,
      diagnosis,
      diagnosisStatus: diagnosis && $('diagnosis-confirmed').checked ? 'confirmed' : 'unconfirmed',
      tags: $('case-tags')
        .value.split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
      context: $('case-context').value,
      assessment: $('case-assessment').value,
      learning: $('case-learning').value
    };
  }
  /** Guarda el borrador del caso abierto si tiene cambios; un fallo no interrumpe la edición. */
  async function saveDraft() {
    clearTimeout(draftTimer);
    if (wiped || !isDirty() || $('case-form').hidden) return;
    draft = { caseId: $('case-id').value, savedAt: new Date().toISOString(), input: collectInput() };
    try {
      await db.setSetting('caseDraft', draft);
      $('case-status').textContent = 'Cambios sin guardar · borrador guardado en el dispositivo';
    } catch {
      $('case-status').textContent = 'Cambios sin guardar · no se pudo guardar el borrador';
    }
  }
  /** Elimina el borrador al guardar o descartar el caso. */
  async function clearDraft() {
    clearTimeout(draftTimer);
    draft = null;
    paintDraft();
    await db.deleteSetting('caseDraft').catch(() => {});
  }
  /** Aviso para recuperar o descartar un borrador pendiente. */
  function paintDraft() {
    const box = $('case-draft');
    box.replaceChildren();
    box.hidden = !draft || !$('case-form').hidden;
    if (box.hidden) return;
    const actions = el('div', undefined, 'actions');
    actions.append(
      action('Recuperar borrador', restoreDraft, 'primary'),
      action(
        'Descartar',
        async () => {
          if (confirm('¿Descartar el borrador? No se puede recuperar.')) await clearDraft();
        },
        'quiet'
      )
    );
    box.append(
      el('h2', 'Borrador sin guardar'),
      el(
        'p',
        `«${draft.input.title.trim() || 'Caso sin título'}»${draft.caseId ? ' (cambios en un caso existente)' : ''} · ${new Date(draft.savedAt).toLocaleString('es-ES')}`
      ),
      actions
    );
  }
  /** Abre el editor con el borrador; si su caso ya no existe, se recupera como caso nuevo. */
  async function restoreDraft() {
    const saved = draft.caseId ? await db.getCase(draft.caseId) : null;
    if (draft.caseId && !saved) announce('El caso original ya no existe: se recupera como nuevo.');
    openCase({ ...(saved || {}), ...draft.input, id: saved?.id || '' }, true);
    markDirty();
  }
  // En iOS la app puede cerrarse sin beforeunload: se guarda al pasar a segundo plano.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveDraft();
  });
  window.addEventListener('pagehide', () => saveDraft());
  // Botón cuyos errores se muestran en el aviso global.
  const action = (label, callback, cls = 'secondary') => {
    const node = el('button', label, cls);
    node.type = 'button';
    node.addEventListener('click', () =>
      Promise.resolve()
        .then(callback)
        .catch(error => announce(error.message))
    );
    return node;
  };
  // Editor de imágenes (OCR y ocultación de datos).
  const imageEditor = initImageEditor({
    changed: markDirty,
    added: image => {
      if (images.length >= 5) throw new Error('Máximo 5 imágenes por caso.');
      images.push(image);
      paintImages();
    }
  });
  /** Pinta las imágenes adjuntas al caso. */
  function paintImages() {
    const list = $('case-images');
    list.replaceChildren();
    images.forEach((image, index) => {
      const item = el('figure', undefined, 'case-image');
      const photo = document.createElement('img');
      photo.src = image.dataUrl;
      photo.alt = `Imagen revisada ${index + 1} del caso`;
      photo.loading = 'lazy';
      item.append(
        photo,
        el('figcaption', `Imagen ${index + 1} · revisión registrada por ti`),
        action(
          'Quitar imagen',
          () => {
            images.splice(index, 1);
            paintImages();
            markDirty();
          },
          'quiet'
        )
      );
      list.append(item);
    });
  }
  /** Cancela la búsqueda de diagnóstico en curso. */
  function invalidate() {
    generation++;
    clearTimeout(debounce);
    controller?.abort();
  }
  /** Pinta las casillas de síntomas: los sugeridos por la referencia y los añadidos a mano. */
  function paintSymptoms() {
    const choices = [...new Set([...suggestedSymptoms, ...symptoms])];
    $('symptom-options').replaceChildren();
    if (!choices.length)
      $('symptom-options').append(
        el(
          'p',
          'Elige un diagnóstico para cargar posibles síntomas desde una fuente. También puedes añadir tus propios hallazgos.',
          'field-help'
        )
      );
    for (const name of choices) {
      const label = el('label', undefined, 'symptom-choice');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = symptoms.includes(name);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked && symptoms.length >= 40) {
          checkbox.checked = false;
          announce('Máximo 40 síntomas.');
          return;
        }
        symptoms = checkbox.checked ? [...symptoms, name] : symptoms.filter(item => item !== name);
        markDirty();
        $('symptom-count').textContent = `${symptoms.length} seleccionados`;
      });
      label.append(checkbox, el('span', name));
      $('symptom-options').append(label);
    }
    $('symptom-count').textContent = `${symptoms.length} seleccionados`;
  }
  /** Pinta el diagnóstico seleccionado con sus acciones (quitar y ver la descripción de la OMS). */
  function paintDiagnosis() {
    const selected = $('selected-diagnosis');
    selected.replaceChildren();
    $('diagnosis-confirmed').disabled = !diagnosis;
    if (!diagnosis) {
      $('diagnosis-confirmed').checked = false;
      selected.append(
        el('p', 'Sin diagnóstico registrado. Puedes guardar solo los síntomas.', 'muted')
      );
      return;
    }
    selected.append(
      el('h3', diagnosis.title),
      el(
        'p',
        `${diagnosis.code || 'Sin código MMS'} · CIE-11${diagnosis.release ? ' ' + diagnosis.release : ' Foundation'}`,
        'detail-meta'
      )
    );
    selected.append(
      action(
        'Quitar diagnóstico',
        () => {
          invalidate();
          diagnosis = null;
          resetClinical();
          paintDiagnosis();
          $('diagnosis-detail').replaceChildren();
          markDirty();
        },
        'quiet'
      )
    );
    const detailButton = action(
      'Ver descripción de la OMS',
      async () => {
        const current = ++generation,
          uri = diagnosis.uri;
        detailButton.disabled = true;
        $('diagnosis-detail').textContent = 'Consultando descripción…';
        try {
          const result = await getDiagnosisDetail(uri);
          if (current !== generation || diagnosis?.uri !== uri) return;
          const entity = result.data.entity;
          const detail = $('diagnosis-detail');
          detail.replaceChildren();
          detail.append(
            el(
              'p',
              `OMS · ${new Date(result.fetchedAt).toLocaleString('es-ES')}${result.offline ? ' · Copia local; puede estar desactualizada' : ''}`,
              'detail-meta'
            )
          );
          let found = false;
          for (const [key, title] of [
            ['definition', 'Definición'],
            ['longDefinition', 'Descripción ampliada'],
            ['diagnosticCriteria', 'Criterios publicados por la OMS']
          ]) {
            const value = referenceText(entity?.[key]);
            if (value) {
              detail.append(el('h4', title), el('p', value));
              found = true;
            }
          }
          if (!found)
            detail.append(el('p', 'La OMS no incluye una descripción en esta respuesta.'));
          detail.append(
            el(
              'p',
              'Esta información no es una lista completa de síntomas ni confirma el diagnóstico.',
              'fine-print'
            )
          );
        } catch (error) {
          if (current === generation) $('diagnosis-detail').textContent = error.message;
        } finally {
          detailButton.disabled = false;
        }
      },
      'quiet'
    );
    selected.append(detailButton);
  }
  /** Quita la referencia clínica y los síntomas sugeridos. */
  function resetClinical() {
    clinicalGeneration++;
    clinicalController?.abort();
    clinicalReference = null;
    suggestedSymptoms = [];
    $('clinical-info').replaceChildren();
    $('clinical-candidates').replaceChildren();
    $('clinical-status').textContent = '';
    $('clinical-search-query').value = '';
    $('clinical-search-controls').hidden = true;
    paintSymptoms();
  }
  /** Muestra el artículo de MedlinePlus asociado y extrae sus síntomas. */
  function showClinical() {
    const info = $('clinical-info');
    info.replaceChildren();
    if (!clinicalReference) return;
    const article = articleSections(clinicalReference.summary);
    suggestedSymptoms = article.symptoms;
    paintSymptoms();
    info.append(
      el('h3', clinicalReference.title),
      el(
        'p',
        `Información general de MedlinePlus.gov · Consulta: ${new Date(clinicalReference.fetchedAt).toLocaleString('es-ES')}`,
        'detail-meta'
      )
    );
    const link = el('a', 'Leer la fuente oficial ↗', 'text-link');
    link.href = clinicalReference.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    info.append(link);
    info.append(
      el(
        'p',
        'El artículo puede ser más general que el diagnóstico CIE-11. Describe la enfermedad, no lo ocurrido en este caso.',
        'privacy-note'
      )
    );
    for (const section of article.sections) {
      const details = el('details');
      details.append(el('summary', section.title));
      for (const paragraph of section.paragraphs) details.append(el('p', paragraph));
      info.append(details);
    }
    info.append(
      action(
        'Quitar información asociada',
        () => {
          clinicalReference = null;
          suggestedSymptoms = [];
          info.replaceChildren();
          paintSymptoms();
          markDirty();
        },
        'quiet'
      )
    );
    $('clinical-status').textContent = suggestedSymptoms.length
      ? `${suggestedSymptoms.length} opciones extraídas de las listas de síntomas del artículo. Marca solo lo observado.`
      : 'El artículo no contiene una lista de síntomas que podamos convertir en casillas. Puedes leer el texto y añadir hallazgos.';
  }
  /** Busca artículos de MedlinePlus para el diagnóstico (o el término manual) y asocia la coincidencia exacta. */
  async function loadClinical(manual = false) {
    if (!diagnosis) return;
    const current = ++clinicalGeneration,
      uri = diagnosis.uri;
    clinicalController?.abort();
    clinicalController = new AbortController();
    // Se busca un nombre, nunca texto del caso. No se deduce equivalencia de código por el orden de resultados.
    const term = manual
      ? $('clinical-search-query').value.trim()
      : diagnosis.title.split(',')[0].trim();
    if (term.length < 2) {
      $('clinical-status').textContent = 'Escribe al menos 2 caracteres.';
      return;
    }
    $('clinical-search-controls').hidden = false;
    if (!manual) $('clinical-search-query').value = term.slice(0, 120);
    $('clinical-candidates').replaceChildren();
    $('clinical-status').textContent = 'Consultando información en español…';
    try {
      const result = await findClinicalArticles(term, clinicalController.signal);
      if (current !== clinicalGeneration || diagnosis?.uri !== uri) return;
      const associate = topic => {
        clinicalReference = {
          source: 'MedlinePlus.gov',
          title: topic.title,
          url: topic.url,
          summary: topic.summary,
          fetchedAt: result.data.fetchedAt || result.fetchedAt
        };
        $('clinical-candidates').replaceChildren();
        showClinical();
        markDirty();
      };
      const exact = exactArticle(result.topics, diagnosis);
      if (exact && !manual && !clinicalReference) {
        associate(exact);
        return;
      }
      $('clinical-status').textContent = result.topics.length
        ? `Artículos relacionados${result.offline ? ' · Copia local' : ''}. Revisa cuál corresponde al caso; no es una equivalencia automática con CIE-11.`
        : 'No hay un artículo coincidente. Puedes ajustar el nombre de búsqueda o guardar sin información adicional.';
      for (const topic of result.topics) {
        const item = el('div', undefined, 'diagnosis-result');
        item.append(
          el('strong', topic.title),
          el('p', 'Fuente: MedlinePlus.gov · Información general', 'detail-meta')
        );
        item.append(
          action('Usar este artículo', () => {
            clinicalGeneration++;
            associate(topic);
          })
        );
        $('clinical-candidates').append(item);
      }
    } catch (error) {
      if (current !== clinicalGeneration) return;
      $('clinical-status').textContent = /Ruta no encontrada/.test(error.message)
        ? 'Falta actualizar tu Worker: necesita la ruta /medline/search (versión 2.1).'
        : error.name === 'AbortError'
          ? 'La consulta se ha cancelado o ha tardado demasiado. Puedes intentarlo de nuevo.'
          : error.message;
    }
  }
  $('clinical-search').addEventListener('click', () => loadClinical(true));
  $('clinical-search-query').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadClinical(true);
    }
  });
  /** Busca diagnósticos CIE-11 y permite seleccionar uno. */
  async function findDiagnosis() {
    invalidate();
    const current = generation;
    const q = $('diagnosis-query').value.trim();
    $('diagnosis-results').replaceChildren();
    if (q.length < 2) {
      $('diagnosis-status').textContent = 'Escribe al menos 2 caracteres.';
      return;
    }
    controller = new AbortController();
    $('diagnosis-status').textContent = 'Buscando en CIE-11…';
    try {
      const result = await searchDiagnoses(q, controller.signal);
      if (current !== generation) return;
      $('diagnosis-status').textContent =
        `${result.rows.length} coincidencias de texto${result.offline ? ' · Copia local' : ' · OMS'}. No son probabilidades diagnósticas.`;
      for (const row of result.rows.slice(0, 20)) {
        const item = el('div', undefined, 'diagnosis-result');
        item.append(
          el('strong', row.title),
          el('p', row.code || 'Entidad sin código MMS', 'detail-meta'),
          action('Seleccionar', () => {
            invalidate();
            diagnosis = row;
            $('diagnosis-confirmed').checked = false;
            resetClinical();
            paintDiagnosis();
            $('diagnosis-results').replaceChildren();
            $('diagnosis-detail').replaceChildren();
            $('diagnosis-status').textContent = 'Diagnóstico seleccionado como no confirmado.';
            markDirty();
            loadClinical();
          })
        );
        $('diagnosis-results').append(item);
      }
      if (!result.rows.length)
        $('diagnosis-status').textContent =
          'Sin coincidencias. Puedes guardar el caso sin diagnóstico.';
    } catch (error) {
      if (current === generation)
        $('diagnosis-status').textContent =
          error.name === 'AbortError'
            ? 'Consulta cancelada o tiempo de espera agotado.'
            : error.message;
    }
  }
  /** Pinta la lista de casos filtrada por la búsqueda. */
  async function renderCases() {
    const current = ++listGeneration;
    const rows = await db.listCases($('case-query').value);
    if (current !== listGeneration) return;
    $('case-list').replaceChildren();
    if (!rows.length)
      $('case-list').append(
        el('p', 'Crea tu primer caso o busca por síntoma, diagnóstico o palabra clave.', 'empty')
      );
    for (const row of rows) {
      const item = el('article', undefined, 'list-item');
      item.append(el('h3', row.title));
      if (row.images?.length) {
        const thumb = document.createElement('img');
        thumb.src = row.images[0].dataUrl;
        thumb.alt = 'Vista previa de la imagen revisada del caso';
        thumb.className = 'case-thumbnail';
        thumb.loading = 'lazy';
        item.append(
          thumb,
          el(
            'p',
            `${row.images.length} imagen${row.images.length === 1 ? '' : 'es'} revisada${row.images.length === 1 ? '' : 's'}`
          )
        );
      }
      item.append(
        el(
          'p',
          row.diagnosis
            ? `${row.diagnosis.title} · ${row.diagnosisStatus === 'confirmed' ? 'Confirmado (registrado por ti)' : 'No confirmado'}`
            : 'Sin diagnóstico registrado'
        )
      );
      if (row.symptoms?.length)
        item.append(el('p', row.symptoms.join(' · '), 'case-symptom-summary'));
      if (row.tags?.length) item.append(el('p', row.tags.join(' · ')));
      item.append(el('p', `Actualizado: ${new Date(row.updatedAt).toLocaleString('es-ES')}`));
      const actions = el('div', undefined, 'actions');
      actions.append(
        action('Abrir / editar', () => openCase(row)),
        action(
          'Eliminar',
          async () => {
            if (!confirm(`¿Eliminar «${row.title}» de este dispositivo?`)) return;
            await db.deleteCase(row.id);
            if (draft?.caseId === row.id) await clearDraft();
            if ($('case-id').value === row.id) {
              imageEditor.reset();
              invalidate();
              resetClinical();
              setDirty(false);
              showEditor(false);
            }
            await renderCases();
            announce('Caso eliminado.');
          },
          'danger'
        )
      );
      item.append(actions);
      $('case-list').append(item);
    }
  }
  /** Alterna entre el listado y el formulario de edición. */
  function showEditor(open) {
    $('case-form').hidden = !open;
    for (const id of ['case-list-heading', 'case-query', 'case-list']) $(id).hidden = open;
    paintDraft();
  }
  /** Abre un caso (o uno nuevo) en el editor, avisando si hay cambios sin guardar. */
  function openCase(row = {}, restoring = false) {
    if (isDirty() && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
    if (
      !restoring &&
      !isDirty() &&
      draft &&
      !confirm('Tienes un borrador sin guardar. Si continúas, se descartará. ¿Continuar?')
    )
      return;
    if (!restoring && draft) clearDraft();
    invalidate();
    imageEditor.reset();
    images = [...(row.images || [])];
    paintImages();
    for (const [field, key] of [
      ['id', 'id'],
      ['title', 'title'],
      ['context', 'context'],
      ['assessment', 'assessment'],
      ['learning', 'learning']
    ])
      $('case-' + field).value = row[key] || '';
    $('case-tags').value = (row.tags || []).join(', ');
    resetClinical();
    symptoms = [...(row.symptoms || [])];
    diagnosis = row.diagnosis || null;
    clinicalReference = row.clinicalReference || null;
    $('symptom-custom').value = '';
    $('diagnosis-query').value = '';
    $('diagnosis-results').replaceChildren();
    $('diagnosis-detail').replaceChildren();
    $('diagnosis-status').textContent =
      'Opcional. Busca un diagnóstico conocido; no introduzcas datos personales.';
    $('diagnosis-confirmed').checked = row.diagnosisStatus === 'confirmed';
    paintSymptoms();
    paintDiagnosis();
    if (clinicalReference) showClinical();
    else if (diagnosis) loadClinical();
    $('case-extra').open = Boolean(row.context || row.assessment || row.tags?.length);
    $('case-form-title').textContent = row.id ? 'Editar caso' : 'Nuevo caso';
    showEditor(true);
    $('case-diagnosis-section').open = Boolean(row.diagnosis || row.symptoms?.length);
    $('case-image-section').open = Boolean(row.images?.length);
    $('case-reference-section').open = false;
    $('case-status').textContent = '';
    setDirty(false);
    $('case-title').focus();
  }
  // ── Eventos del formulario ──
  $('new-case').addEventListener('click', () => openCase());
  $('case-query').addEventListener('input', () =>
    renderCases().catch(error => announce(error.message))
  );
  $('case-form').addEventListener('input', event => {
    if (!['diagnosis-query', 'symptom-custom', 'clinical-search-query'].includes(event.target.id))
      markDirty();
  });
  $('diagnosis-confirmed').addEventListener('change', markDirty);
  $('diagnosis-query').addEventListener('input', () => {
    invalidate();
    $('diagnosis-results').replaceChildren();
    debounce = setTimeout(findDiagnosis, 400);
  });
  $('diagnosis-search').addEventListener('click', findDiagnosis);
  $('diagnosis-query').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      findDiagnosis();
    }
  });
  // Añade el síntoma escrito si no está repetido.
  const addSymptom = () => {
    const value = $('symptom-custom').value.trim();
    if (!value) return;
    if (symptoms.some(item => normalize(item) === normalize(value))) {
      $('symptom-custom').value = '';
      return;
    }
    symptoms = validSymptoms([...symptoms, value]);
    $('symptom-custom').value = '';
    paintSymptoms();
    markDirty();
  };
  $('symptom-add').addEventListener('click', () => {
    try {
      addSymptom();
    } catch (error) {
      announce(error.message);
    }
  });
  $('symptom-custom').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      try {
        addSymptom();
      } catch (error) {
        announce(error.message);
      }
    }
  });
  $('cancel-case').addEventListener('click', () => {
    if (!isDirty() || confirm('¿Descartar los cambios sin guardar?')) {
      imageEditor.reset();
      invalidate();
      clinicalGeneration++;
      clinicalController?.abort();
      setDirty(false);
      clearDraft();
      showEditor(false);
    }
  });
  // Guardar: crea o actualiza el caso en IndexedDB.
  $('case-form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.target.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      if (imageEditor.pending())
        throw new Error('Adjunta la imagen revisada o descártala antes de guardar el caso.');
      addSymptom();
      const input = collectInput();
      if ($('case-id').value) await db.updateCase($('case-id').value, input);
      else await db.createCase(input);
      imageEditor.reset();
      invalidate();
      clinicalGeneration++;
      clinicalController?.abort();
      setDirty(false);
      await clearDraft();
      showEditor(false);
      $('case-query').value = '';
      $('case-id').value = '';
      await renderCases();
      announce('Caso guardado en este dispositivo.');
      $('new-case').focus();
    } catch (error) {
      $('case-status').textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  // Carga el borrador pendiente de una sesión anterior.
  db.getSetting('caseDraft')
    .then(saved => {
      if (saved?.value?.input) {
        draft = saved.value;
        paintDraft();
      }
    })
    .catch(() => {});
  return { renderCases };
}
