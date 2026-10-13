/** Conservative proposals only: OCR cannot certify anonymity. */
export function personalLine(text) {
  return /(?:paciente|nombre|apellidos?|domicilio|direcci[oó]n|tel[eé]fono|correo|e-?mail|historia|n\.?\s*h\.?\s*c\.?|dni|nie|cip|nacimiento|identificaci[oó]n|fecha|hospital|centro|habitaci[oó]n|cama)\b/i.test(text) ||
    /\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/i.test(text) || /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text) ||
    /\b(?:\+34\s*)?[6789](?:[ .-]*\d){8}\b/.test(text) || /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(text);
}
export function clampBox(box, width, height, padding = 5) {
  const x0 = Math.max(0, Math.min(width, box.x0 - padding)), y0 = Math.max(0, Math.min(height, box.y0 - padding));
  const x1 = Math.max(x0, Math.min(width, box.x1 + padding)), y1 = Math.max(y0, Math.min(height, box.y1 + padding));
  return { x0, y0, x1, y1 };
}
export function ocrLines(data) {
  const result = [];
  for (const block of data.blocks || []) for (const paragraph of block.paragraphs || []) for (const line of paragraph.lines || []) {
    if (line.bbox && line.text?.trim()) result.push({ text: line.text.trim(), bbox: line.bbox, confidence: Number(line.confidence ?? 0) });
  }
  return result;
}
export function reliableLine(line) {
  const text = line.text || '';
  const meaningful = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  return Number(line.confidence ?? 100) >= 65 && meaningful >= 2 && meaningful / Math.max(1, text.replace(/\s/g, '').length) >= .5;
}
export function proposedIndices(lines, allText = true) {
  const selected = new Set();
  lines.forEach((line, i) => {
    if (personalLine(line.text) || (allText && reliableLine(line))) selected.add(i);
    // Only a bare label can include an adjacent value; never the next arbitrary OCR line.
    if (!allText && /^(?:paciente|nombre|apellidos?|historia|dni|nie|cip|fecha|nacimiento)\s*[:=]?\s*$/i.test(line.text) && lines[i + 1]) {
      const next = lines[i + 1], height = line.bbox.y1 - line.bbox.y0;
      if (next.bbox.y0 >= line.bbox.y1 && next.bbox.y0 - line.bbox.y1 <= Math.max(12, height * 1.5) &&
          Math.abs(next.bbox.x0 - line.bbox.x0) <= Math.max(20, height * 2) &&
          !/^(?:dx|sin|r|l|torax\b|t[oó]rax\b)|\b(?:kv|mas)\b/i.test(next.text)) selected.add(i + 1);
    }
  });
  return selected;
}
export function suggestedBoxes(lines, width, height, allText = true) {
  return [...proposedIndices(lines, allText)].map(i => clampBox(lines[i].bbox, width, height));
}
export function validImages(images = []) {
  if (!Array.isArray(images) || images.length > 5) throw new Error('Máximo 5 imágenes por caso.');
  return images.map(image => {
    if (image?.reviewed !== true || typeof image.dataUrl !== 'string' || image.dataUrl.length > 3000000 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl)) throw new Error('Imagen revisada inválida.');
    return { dataUrl: image.dataUrl, reviewed: true };
  });
}
