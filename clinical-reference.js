import { requestReference } from './api.js';
import { normalize } from './case-data.js';

const plain = value => new DOMParser().parseFromString(value || '', 'text/html').body.textContent.trim();
export function parseMedline(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || !doc.querySelector('nlmSearchResult')) throw new Error('MedlinePlus devolvió un documento no válido.');
  if (doc.querySelector('error')) throw new Error('MedlinePlus no pudo completar la búsqueda.');
  return [...doc.querySelectorAll('health-topic')].map(topic => {
    const url = topic.getAttribute('url') || '';
    if (!/^https:\/\/medlineplus\.gov\/spanish\/[a-z0-9]+\.html$/.test(url)) return null;
    return { title: topic.getAttribute('title') || '', url, id: topic.getAttribute('id') || '',
      aliases: [...topic.querySelectorAll('also-called')].map(item => item.textContent.trim()),
      summary: topic.querySelector('full-summary')?.textContent || '' };
  }).filter(topic => topic?.title && topic.summary);
}

/** Structural extraction, no disease templates or clinical inference. */
export function articleSections(summary) {
  const doc = new DOMParser().parseFromString(summary, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,form').forEach(node => node.remove());
  const sections = []; let current = { title: 'Información general', paragraphs: [], symptoms: [] };
  for (const node of doc.body.children) {
    if (/^H[1-6]$/.test(node.tagName)) {
      if (current.paragraphs.length) sections.push(current);
      current = { title: node.textContent.trim(), paragraphs: [], symptoms: [] };
      continue;
    }
    if (['SCRIPT','STYLE','IFRAME','OBJECT','FORM'].includes(node.tagName)) continue;
    const text = node.textContent.trim(); if (!text) continue;
    current.paragraphs.push(text);
    const title = normalize(current.title);
    // Only explicit symptom/sign headings. Complications and treatment are never suggestions.
    if (/sintomas|signos/.test(title) && !/complic|tratamiento|riesgo|caus|prevencion/.test(title)) {
      for (const item of node.querySelectorAll('li')) {
        if (item.querySelector('li')) continue;
        const value = item.textContent.trim();
        if (value && value.length <= 500) current.symptoms.push(value);
      }
    }
  }
  if (current.paragraphs.length) sections.push(current);
  return { sections, symptoms: [...new Set(sections.flatMap(section => section.symptoms))].slice(0, 40) };
}

export function exactArticle(topics, diagnosis) {
  const title = normalize(diagnosis.title).trim();
  return topics.find(topic => [topic.title, ...topic.aliases].some(value => normalize(value) === title)) || null;
}
export async function findClinicalArticles(term, signal) {
  const result = await requestReference('medline/search', { q: term.slice(0, 120) }, signal);
  return { ...result, topics: parseMedline(result.data.xml), query: result.data.query };
}
