import { ocrLines, proposedIndices, reliableLine, personalLine, clampBox } from './redaction.js';
const $ = id => document.getElementById(id);
const ROOT = new URL('./vendor/ocr/', import.meta.url);
let scriptPromise;
function loadEngine() {
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = new URL('tesseract.min.js', ROOT).href;
    script.onload = resolve; script.onerror = () => { scriptPromise = null; script.remove(); reject(new Error('No se pudo cargar el motor OCR local.')); };
    document.head.append(script);
  });
  return scriptPromise;
}
export function initImageEditor({ added, changed }) {
  const canvas = $('image-canvas'), ctx = canvas.getContext('2d');
  let source, lines = [], selected = new Set(), manual = [], start, worker, generation = 0, busy = false;
  function proposals() {
    const list = $('image-detections'); list.replaceChildren();
    lines.forEach((line, index) => {
      const label = document.createElement('label'); label.className = 'confirmation-choice';
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = selected.has(index);
      const text = document.createElement('span'); text.textContent = `${line.text} · ${Math.round(line.confidence)} % de confianza OCR${personalLine(line.text) ? ' · posible dato personal' : !reliableLine(line) ? ' · lectura dudosa; revisar' : ''}`;
      input.addEventListener('change', () => { input.checked ? selected.add(index) : selected.delete(index); $('image-reviewed').checked = false; paint(); });
      label.append(input, text); list.append(label);
    });
  }
  function paint() {
    if (!source) return;
    ctx.drawImage(source, 0, 0);
    ctx.fillStyle = '#000';
    for (const box of [...[...selected].map(index => clampBox(lines[index].bbox, canvas.width, canvas.height)), ...manual]) {
      ctx.fillRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    }
  }
  function controls() {
    $('image-analyze').disabled = busy || !source; $('image-attach').disabled = busy || !source;
    $('image-analyze').textContent = busy ? 'Leyendo…' : 'Detectar texto (OCR)';
  }
  function reset() {
    generation++; worker?.terminate().catch(() => {}); worker = null; source = null; lines = []; selected.clear(); $('image-detections').replaceChildren(); manual = []; start = null; busy = false;
    canvas.width = 1; canvas.height = 1; $('image-editor').hidden = true; $('image-reviewed').checked = false; $('case-image-input').value = ''; controls();
  }
  $('case-image-input').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    reset(); const current = generation;
    try {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Elige JPG, PNG o WebP de hasta 12 MB. PDF, DICOM y HEIC aún no están admitidos.');
      const bitmap = await createImageBitmap(file);
      if (current !== generation) { bitmap.close(); return; }
      if (bitmap.width * bitmap.height > 40000000) { bitmap.close(); throw new Error('La imagen es demasiado grande. Reduce su resolución antes de abrirla.'); }
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      source = document.createElement('canvas'); source.width = Math.round(bitmap.width * scale); source.height = Math.round(bitmap.height * scale);
      const original = source.getContext('2d'); original.fillStyle = '#fff'; original.fillRect(0, 0, source.width, source.height); original.drawImage(bitmap, 0, 0, source.width, source.height); bitmap.close();
      canvas.width = source.width; canvas.height = source.height; $('image-all-text').checked = true; changed();
      $('image-editor').hidden = false; $('image-status').textContent = 'Imagen sin guardar. Detecta texto o arrastra sobre ella para ocultar zonas; revisa toda la imagen antes de adjuntarla.'; paint(); controls();
    } catch (error) { $('image-status').textContent = error.message; }
  });
  $('image-analyze').addEventListener('click', async () => {
    if (!source || busy) return;
    const current = generation; let jobWorker; busy = true; controls(); $('image-reviewed').checked = false;
    $('image-status').textContent = 'Preparando OCR en español. La imagen permanece en este dispositivo…';
    try {
      await loadEngine(); if (current !== generation) return;
      jobWorker = await window.Tesseract.createWorker('spa', 1, {
        workerPath: new URL('worker.min.js', ROOT).href, workerBlobURL: false,
        corePath: new URL('core/', ROOT).href, langPath: new URL('lang/', ROOT).href,
        logger: progress => { if (current === generation && progress.status === 'recognizing text') $('image-status').textContent = `Leyendo texto: ${Math.round(progress.progress * 100)} %`; }
      });
      if (current !== generation) return;
      worker = jobWorker;
      await jobWorker.setParameters({ tessedit_pageseg_mode: '11' });
      const result = await jobWorker.recognize(source, {}, { blocks: true });
      if (current !== generation) return;
      lines = ocrLines(result.data); selected = proposedIndices(lines, $('image-all-text').checked); proposals(); paint();
      const doubtful = lines.filter(line => !reliableLine(line)).length;
      $('image-status').textContent = lines.length ? `${lines.length} detecciones; ${selected.size} zonas propuestas${doubtful ? ` y ${doubtful} lecturas dudosas para revisar` : ''}. Desmarca cualquier detección falsa. Revisa también datos no detectados, rostros y códigos.` : 'El OCR no ha detectado texto. Esto no garantiza que la imagen no tenga datos personales; oculta las zonas manualmente.';
    } catch (error) { if (current === generation) $('image-status').textContent = 'El OCR no pudo completarse. Puedes ocultar zonas manualmente y revisar la imagen.'; }
    finally { await jobWorker?.terminate().catch(() => {}); if (worker === jobWorker) worker = null; if (current === generation) { busy = false; controls(); } }
  });
  const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
  canvas.addEventListener('pointerdown', event => { if (!source) return; start = point(event); canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointerup', event => {
    if (!start || !source) return; const end = point(event);
    if (Math.abs(end.x - start.x) > 2 && Math.abs(end.y - start.y) > 2) manual.push(clampBox({ x0: Math.min(start.x,end.x), y0: Math.min(start.y,end.y), x1: Math.max(start.x,end.x), y1: Math.max(start.y,end.y) }, canvas.width, canvas.height, 0));
    start = null; $('image-reviewed').checked = false; paint();
  });
  canvas.addEventListener('pointercancel', () => { start = null; });
  $('image-all-text').addEventListener('change', () => { selected = proposedIndices(lines, $('image-all-text').checked); proposals(); $('image-reviewed').checked = false; paint(); });
  $('image-undo').addEventListener('click', () => { manual.pop(); $('image-reviewed').checked = false; paint(); });
  $('image-hide-all').addEventListener('click', () => { if (!source) return; manual.push({x0:0,y0:0,x1:canvas.width,y1:canvas.height}); $('image-reviewed').checked = false; paint(); });
  for (const [id, lower] of [['image-hide-top', false], ['image-hide-bottom', true]]) $(id).addEventListener('click', () => {
    if (!source) return;
    manual.push({ x0:0, x1:canvas.width, y0:lower ? canvas.height * .8 : 0, y1:lower ? canvas.height : canvas.height * .2 }); $('image-reviewed').checked = false; paint();
  });
  $('image-attach').addEventListener('click', () => {
    if (!source || busy) return;
    if (!$('image-reviewed').checked) { $('image-status').textContent = 'Revisa la imagen y marca la confirmación antes de adjuntarla.'; return; }
    try {
      paint(); const dataUrl = canvas.toDataURL('image/jpeg', .88);
      if (dataUrl.length > 3000000) throw new Error('La imagen procesada es demasiado grande. Usa una imagen más pequeña.');
      added({ dataUrl, reviewed: true }); changed(); reset(); $('image-status').textContent = 'Imagen revisada adjunta. Guarda el caso para conservarla.';
    } catch (error) { $('image-status').textContent = error.message; }
  });
  $('image-discard').addEventListener('click', reset);
  return { reset, pending: () => Boolean(source) };
}
