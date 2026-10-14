/**
 * Propuestas de anonimización para imágenes con texto reconocido por OCR.
 * Son solo sugerencias conservadoras: el OCR no puede certificar el anonimato.
 */

/** Detecta líneas con posibles datos personales: etiquetas, DNI/NIE, correos, teléfonos o fechas. */
export function personalLine(text) {
  return (
    /(?:paciente|nombre|apellidos?|domicilio|direcci[oó]n|tel[eé]fono|correo|e-?mail|historia|n\.?\s*h\.?\s*c\.?|dni|nie|cip|nacimiento|identificaci[oó]n|fecha|hospital|centro|habitaci[oó]n|cama)\b/i.test(
      text
    ) ||
    /\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/i.test(text) ||
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text) ||
    /\b(?:\+34\s*)?[6789](?:[ .-]*\d){8}\b/.test(text) ||
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(text)
  );
}
/** Amplía una caja con un margen y la limita a las dimensiones de la imagen. */
export function clampBox(box, width, height, padding = 5) {
  const x0 = Math.max(0, Math.min(width, box.x0 - padding)),
    y0 = Math.max(0, Math.min(height, box.y0 - padding));
  const x1 = Math.max(x0, Math.min(width, box.x1 + padding)),
    y1 = Math.max(y0, Math.min(height, box.y1 + padding));
  return { x0, y0, x1, y1 };
}
/** Aplana el resultado de Tesseract (bloques → párrafos → líneas) en { text, bbox, confidence }. */
export function ocrLines(data) {
  const result = [];
  for (const block of data.blocks || [])
    for (const paragraph of block.paragraphs || [])
      for (const line of paragraph.lines || []) {
        if (line.bbox && line.text?.trim())
          result.push({
            text: line.text.trim(),
            bbox: line.bbox,
            confidence: Number(line.confidence ?? 0)
          });
      }
  return result;
}
/** Línea fiable: confianza ≥ 65 % y al menos la mitad de sus caracteres alfanuméricos. */
export function reliableLine(line) {
  const text = line.text || '';
  const meaningful = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  return (
    Number(line.confidence ?? 100) >= 65 &&
    meaningful >= 2 &&
    meaningful / Math.max(1, text.replace(/\s/g, '').length) >= 0.5
  );
}
/** Índices de las líneas propuestas para ocultar; con allText se proponen todas las lecturas fiables. */
export function proposedIndices(lines, allText = true) {
  const selected = new Set();
  lines.forEach((line, i) => {
    if (personalLine(line.text) || (allText && reliableLine(line))) selected.add(i);
    // Solo una etiqueta aislada puede arrastrar el valor contiguo; nunca una línea OCR arbitraria.
    if (
      !allText &&
      /^(?:paciente|nombre|apellidos?|historia|dni|nie|cip|fecha|nacimiento)\s*[:=]?\s*$/i.test(
        line.text
      ) &&
      lines[i + 1]
    ) {
      const next = lines[i + 1],
        height = line.bbox.y1 - line.bbox.y0;
      if (
        next.bbox.y0 >= line.bbox.y1 &&
        next.bbox.y0 - line.bbox.y1 <= Math.max(12, height * 1.5) &&
        Math.abs(next.bbox.x0 - line.bbox.x0) <= Math.max(20, height * 2) &&
        !/^(?:dx|sin|r|l|torax\b|t[oó]rax\b)|\b(?:kv|mas)\b/i.test(next.text)
      )
        selected.add(i + 1);
    }
  });
  return selected;
}
/** Cajas propuestas para ocultar, ya ajustadas a la imagen. */
export function suggestedBoxes(lines, width, height, allText = true) {
  return [...proposedIndices(lines, allText)].map(i => clampBox(lines[i].bbox, width, height));
}
/** Valida las imágenes revisadas de un caso (máx. 5 JPEG en data URL de hasta ~3 MB). */
export function validImages(images = []) {
  if (!Array.isArray(images) || images.length > 5) throw new Error('Máximo 5 imágenes por caso.');
  return images.map(image => {
    if (
      image?.reviewed !== true ||
      typeof image.dataUrl !== 'string' ||
      image.dataUrl.length > 3000000 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl)
    )
      throw new Error('Imagen revisada inválida.');
    return { dataUrl: image.dataUrl, reviewed: true };
  });
}
