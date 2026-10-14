/** Vista «Herramientas»: catálogo filtrable de calculadoras, favoritos y formulario de cálculo. */
import { GROUPS, SPECIALTIES, TOOLS } from './tool-catalog.js';
import { calculateTool } from './clinical-calculators.js';
import { getSetting, setSetting } from './db.js';
import { TOOL_HELP, fieldHelp, HELP_SOURCES } from './tool-help.js';

const $ = id => document.getElementById(id);
// Crea un elemento con texto y clase opcionales.
const create = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
// Icono del sprite SVG definido en index.html.
const icon = id => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  svg.setAttribute('aria-hidden', 'true');
  return svg;
};
// Texto sin tildes y en minúsculas para las búsquedas.
const normalize = value =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
// «1 calculadora» / «3 calculadoras».
const counted = (amount, singular, plural) => `${amount} ${amount === 1 ? singular : plural}`;

/** Inicializa el catálogo de herramientas. Devuelve { refresh } para recargar los favoritos. */
export function initTools() {
  let selected = 'Todas',
    favorites = new Set(),
    onlyFavorites = false,
    current,
    previousTrigger;
  let writing = false;
  const report = message => {
    $('tool-status').textContent = message;
  };
  /** Pinta los grupos de herramientas que coinciden con la búsqueda, la especialidad y los favoritos. */
  function render() {
    const term = normalize($('tool-query').value.trim());
    // Sinónimos y siglas para encontrar las herramientas por otros nombres.
    const aliases = {
      gcs: 'GCS Glasgow',
      flow: 'Infusión mL/h',
      drip: 'Gotas goteo',
      pf: 'P/F PaO2 FiO2',
      map: 'PAM',
      ckd: 'CKD EPI TFG eGFR',
      cg: 'CrCl Cockcroft Gault',
      ktv: 'Kt/V spKt/V',
      cha: 'CHA2DS2 VASc',
      chava: 'CHA2DS2 VA',
      bmi: 'BMI IMC',
      bsa: 'BSA SC',
      pain: 'EN NRS dolor EVA'
    };
    const matches = TOOLS.filter(
      tool =>
        (selected === 'Todas' || tool.specialties.includes(selected)) &&
        (!onlyFavorites || favorites.has(tool.id)) &&
        normalize(
          [
            tool.id,
            aliases[tool.id] || '',
            tool.title,
            tool.description,
            GROUPS.find(g => g[0] === tool.group)?.[1],
            ...tool.specialties
          ].join(' ')
        ).includes(term)
    );
    $('tool-groups').replaceChildren();
    $('tool-count').textContent =
      `${counted(matches.filter(t => !t.reference).length, 'calculadora local', 'calculadoras locales')} · ${counted(matches.filter(t => t.reference).length, 'referencia externa', 'referencias externas')}`;
    for (const [id, title, color, glyph] of GROUPS) {
      const rows = matches.filter(tool => tool.group === id);
      if (!rows.length) continue;
      const group = create('details', undefined, `calculator-group group-${color}`);
      group.open = Boolean(term) || onlyFavorites || selected !== 'Todas' || id === 'med';
      const summary = create('summary');
      const badge = create('span', undefined, `tool-icon ${color}`);
      badge.append(icon(glyph));
      const localCount = rows.filter(t => !t.reference).length,
        refCount = rows.filter(t => t.reference).length;
      const counts = [
        localCount ? counted(localCount, 'calculadora', 'calculadoras') : '',
        refCount ? counted(refCount, 'referencia', 'referencias') : ''
      ]
        .filter(Boolean)
        .join(' · ');
      const captions = create('span', undefined, 'group-caption');
      captions.append(create('strong', title), create('span', counts));
      summary.append(badge, captions, create('span', '⌄', 'group-chevron'));
      group.append(summary);
      for (const tool of rows) {
        const row = create('div', undefined, 'calculator-row');
        const open = create('button', undefined, 'calculator-open');
        open.type = 'button';
        open.dataset.tool = tool.id;
        open.append(
          create('strong', tool.title),
          create(
            'span',
            tool.reference ? 'Referencia externa · necesita conexión' : tool.description
          )
        );
        open.addEventListener('click', () => showTool(tool, open));
        const star = create('button', favorites.has(tool.id) ? '★' : '☆', 'favorite-tool');
        star.type = 'button';
        star.setAttribute(
          'aria-label',
          `${favorites.has(tool.id) ? 'Quitar' : 'Añadir'} favorito: ${tool.title}`
        );
        star.setAttribute('aria-pressed', String(favorites.has(tool.id)));
        star.disabled = writing;
        // Alterna el favorito y lo guarda en los ajustes.
        star.addEventListener('click', async () => {
          if (writing) return;
          writing = true;
          star.disabled = true;
          const next = new Set(favorites);
          if (next.has(tool.id)) next.delete(tool.id);
          else next.add(tool.id);
          try {
            await setSetting('toolFavorites', [...next]);
            favorites = next;
            report('Favoritos guardados en este dispositivo.');
          } catch {
            report('No se pudo guardar el favorito. Comprueba el almacenamiento.');
          } finally {
            writing = false;
            render();
          }
        });
        row.append(open, star);
        group.append(row);
      }
      $('tool-groups').append(group);
    }
    if (!matches.length)
      $('tool-groups').append(
        create(
          'p',
          onlyFavorites
            ? 'No hay favoritos que coincidan. Marca una estrella en el catálogo.'
            : 'No hay coincidencias. Prueba otra búsqueda o especialidad.',
          'empty'
        )
      );
  }
  /** Abre el formulario de una herramienta con su ayuda, fuente y campos. */
  function showTool(tool, trigger) {
    current = tool;
    previousTrigger = trigger;
    $('tool-library').hidden = true;
    $('calculator').hidden = false;
    $('calc-result').hidden = true;
    $('calc-result').replaceChildren();
    $('calc-title').textContent = tool.title;
    $('calc-description').textContent = tool.description;
    const help = TOOL_HELP[tool.id];
    $('calc-help').replaceChildren();
    $('calc-help').append(create('h3', 'Para qué sirve'), create('p', help.what));
    const reading = create('details');
    reading.append(create('summary', 'Cómo entender el resultado'), create('p', help.read));
    if (help.example)
      reading.append(create('p', `Ejemplo educativo: ${help.example}`, 'help-example'));
    $('calc-help').append(reading);
    $('calc-note').textContent =
      tool.note ||
      'Comprueba las unidades y el contexto. Esta herramienta no prescribe tratamientos.';
    $('calc-form').hidden = Boolean(tool.reference);
    $('calc-fields').replaceChildren();
    $('calc-source').textContent = tool.source[0] + ' ↗';
    $('calc-source').href = tool.source[1];
    $('calc-version').textContent = tool.reference
      ? 'Referencia externa: no es una calculadora local. El documento requiere conexión.'
      : 'Fórmula o criterios identificados · fuentes revisadas el 13/10/2026. Pendiente de validación clínica del producto.';
    $('calc-formula').textContent = tool.formula || '';
    $('calc-formula').hidden = Boolean(tool.reference);
    // Un campo por entrada: selector con opciones o texto numérico.
    for (const field of tool.fields) {
      const group = create('div');
      const label = create('label', field.label);
      label.htmlFor = `calc-${field.name}`;
      const input = create(field.type === 'select' ? 'select' : 'input');
      input.name = field.name;
      input.id = label.htmlFor;
      input.required = true;
      if (field.type === 'select') {
        const placeholder = create('option', 'Selecciona…');
        placeholder.value = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        input.append(placeholder);
        for (const [value, text] of field.options) {
          const option = create('option', text);
          option.value = String(value);
          input.append(option);
        }
      } else {
        input.inputMode = field.integer ? 'numeric' : 'decimal';
        input.autocomplete = 'off';
        input.maxLength = 30;
        input.type = 'text';
      }
      const hint = create('p', fieldHelp(tool, field), 'field-help');
      hint.id = `help-${field.name}`;
      input.setAttribute('aria-describedby', hint.id);
      group.append(label, input, hint);
      $('calc-fields').append(group);
    }
    $('calc-title').focus();
    window.scrollTo(0, 0);
  }
  $('close-calculator').addEventListener('click', () => {
    $('calculator').hidden = true;
    $('tool-library').hidden = false;
    current = undefined;
    if (previousTrigger?.isConnected) previousTrigger.focus();
  });
  // Cualquier cambio en el formulario oculta el resultado anterior.
  const invalidate = () => {
    $('calc-result').hidden = true;
    $('calc-result').replaceChildren();
  };
  $('calc-form').addEventListener('input', invalidate);
  $('calc-form').addEventListener('change', invalidate);
  // Cálculo y presentación del resultado.
  $('calc-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!current) return;
    $('calc-result').replaceChildren();
    $('calc-result').hidden = false;
    try {
      const raw = Object.fromEntries(new FormData(event.target));
      const answer = calculateTool(current.id, raw);
      for (const row of answer.results) {
        // Evita mostrar cero cuando un resultado pequeño no nulo queda por debajo de la precisión.
        const display =
          row.value !== 0 && Math.abs(row.value) < 0.5 * 10 ** -row.precision
            ? row.value.toExponential(4)
            : new Intl.NumberFormat('es-ES', { maximumFractionDigits: row.precision }).format(
                row.value
              );
        const line = create('p', undefined, 'answer-line');
        line.append(create('span', row.label), create('strong', `${display} ${row.unit}`));
        $('calc-result').append(line);
        if (current.id === 'drip')
          $('calc-result').append(
            create(
              'p',
              `Valor antes de redondear: ${row.value} gotas/min. Redondeo a gota entera.`,
              'fine-print'
            )
          );
      }
      if (answer.explanation) $('calc-result').append(create('p', answer.explanation));
      $('calc-result').append(
        create('h3', 'Qué significa'),
        create('p', TOOL_HELP[current.id].read, 'result-help')
      );
      const details = create('details');
      details.append(
        create('summary', 'Ver fórmula y datos introducidos'),
        create('p', answer.formula)
      );
      for (const field of current.fields) {
        const label =
          field.type === 'select'
            ? field.options.find(([value]) => String(value) === raw[field.name])?.[1]
            : raw[field.name];
        details.append(create('p', `${field.label}: ${label}`));
      }
      $('calc-result').append(
        details,
        create(
          'p',
          'Resultados numéricos mostrados con precisión limitada; utiliza el protocolo y el dispositivo para determinar el redondeo operativo.',
          'fine-print'
        )
      );
    } catch (error) {
      $('calc-result').append(create('p', error.message));
    }
  });
  // Filtros de especialidad y de favoritos.
  for (const specialty of SPECIALTIES) {
    const chip = create('button', specialty, 'specialty-chip');
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(specialty === selected));
    chip.addEventListener('click', () => {
      selected = specialty;
      $('tool-specialties')
        .querySelectorAll('button')
        .forEach(node => node.setAttribute('aria-pressed', String(node === chip)));
      render();
    });
    $('tool-specialties').append(chip);
  }
  $('tool-query').addEventListener('input', render);
  $('tool-only-favorites').addEventListener('click', () => {
    onlyFavorites = !onlyFavorites;
    $('tool-only-favorites').setAttribute('aria-pressed', String(onlyFavorites));
    render();
  });
  render();
  // Fuentes de las explicaciones de términos.
  const sources = create('details', undefined, 'help-sources');
  sources.append(create('summary', 'Fuentes de las explicaciones de términos'));
  for (const [title, url] of HELP_SOURCES) {
    const p = create('p');
    const a = create('a', `${title} ↗`);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    p.append(a);
    sources.append(p);
  }
  $('calc-help-sources').append(sources);
  // Carga los favoritos guardados, ignorando identificadores que ya no existen.
  const refresh = async () => {
    const saved = await getSetting('toolFavorites');
    if (Array.isArray(saved?.value))
      favorites = new Set(saved.value.filter(id => TOOLS.some(t => t.id === id)));
    render();
  };
  refresh().catch(() =>
    report('Los favoritos no están disponibles. Las calculadoras siguen funcionando.')
  );
  return { refresh };
}
