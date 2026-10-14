// Catálogo de herramientas clínicas: grupos, especialidades, fuentes, campos y validación.
// Cada herramienta lleva su fuente y versión. No se guardan valores de pacientes.

// Grupos: [id, título, color, icono].
export const GROUPS = [
  ['med', 'Medicación e infusiones', 'blue', 'i-med'],
  ['nutrition', 'Estado nutricional', 'green', 'i-apple'],
  ['renal', 'Función renal y hepática', 'red', 'i-drop'],
  ['fluids', 'Líquidos y electrolitos', 'teal', 'i-waves'],
  ['cardio', 'Cardiovascular', 'pink', 'i-heart'],
  ['neuro', 'Neurológica', 'purple', 'i-brain'],
  ['mobility', 'Movilidad y funcionalidad', 'teal', 'i-foot'],
  ['skin', 'Piel y lesiones por presión', 'orange', 'i-bandage'],
  ['resp', 'Respiratorio', 'blue', 'i-wind'],
  ['pain', 'Dolor y sedación', 'orange', 'i-bolt'],
  ['ob', 'Obstetricia y neonatal', 'pink', 'i-baby'],
  ['urgent', 'Valoración general', 'purple', 'i-tools']
];
// Filtros de especialidad que se muestran como chips.
export const SPECIALTIES = [
  'Todas',
  'Planta',
  'UCI',
  'Urgencias',
  'Cardiología',
  'Neurología',
  'Nefrología',
  'Nutrición',
  'Obstetricia'
];
// Fuentes bibliográficas: [descripción, URL].
const SOURCES = {
  math: [
    'Análisis dimensional · cálculo de dosis',
    'https://www.ncbi.nlm.nih.gov/books/NBK430836/'
  ],
  map: ['AHA · medición de presión arterial', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11409525/'],
  shock: [
    'ARIC · definición del índice de shock',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC8557437/'
  ],
  bsa: ['Mosteller · 1987', 'https://pubmed.ncbi.nlm.nih.gov/3657876/'],
  bmi: [
    'OMS · índice de masa corporal',
    'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight'
  ],
  harris: [
    'Roza y Shizgal · revisión 1984',
    'https://nutritionalassessment.mumc.nl/en/calculating-energy-expenditure'
  ],
  cg: [
    'Cockcroft–Gault · 1976; limitaciones NKF',
    'https://www.kidney.org/professionals/kdoqi/cockcroft-gault-equation-estimating-creatinine-clearance'
  ],
  ckd: [
    'NIDDK · CKD-EPI creatinina 2021',
    'https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults'
  ],
  dialysis: [
    'Renal Association · adecuación de hemodiálisis',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC6798406/'
  ],
  child: [
    'Child–Turcotte–Pugh · variante INR',
    'https://www.merckmanuals.com/professional/multimedia/table/child-turcotte-pugh-scoring-system'
  ],
  esc: [
    'ESC · fibrilación auricular 2024',
    'https://academic.oup.com/eurheartj/article/45/36/3314/7738779'
  ],
  has: ['HAS-BLED · Pisters et al., 2010', 'https://pubmed.ncbi.nlm.nih.gov/20299623/'],
  wells: [
    'NICE NG158 · Wells TVP, dos niveles',
    'https://www.nice.org.uk/guidance/ng158/chapter/Recommendations'
  ],
  gcs: ['Glasgow · evaluación estructurada', 'https://www.glasgowcomascale.org/faq/'],
  barthel: [
    'SACYL · Barthel, versión 0–100',
    'https://www.saludcastillayleon.es/profesionales/es/coordinacion-sociosanitaria/procesos-atencion/dependencia.ficheros/283308-Informe%20de%20salud%20para%20solicitar%20prestaciones%20sociales%20mayo%2008.pdf'
  ],
  morse: [
    'AHRQ · Morse; puntos de corte según centro',
    'https://www.ahrq.gov/sites/default/files/publications/files/fallpxtoolkit.pdf'
  ],
  norton: [
    'AHRQ · Norton original, 5–20',
    'https://www.ahrq.gov/patient-safety/settings/hospital/resource/pressureulcer/tool/pu7b.html'
  ],
  ards: [
    'NHLBI · protocolo ARDSNet',
    'https://biolincc.nhlbi.nih.gov/media/studies/factt/Protocol.pdf'
  ],
  curb: ['NICE NG250 · CURB-65', 'https://www.nice.org.uk/guidance/ng250/chapter/recommendations'],
  gas: [
    'MSD · equilibrio ácido-base y Winter',
    'https://www.merckmanuals.com/en-ca/professional/nephrology/acid-base-regulation-and-disorders/acid-base-disorders'
  ],
  rass: [
    'Vanderbilt · recursos RASS',
    'https://www.icudelirium.org/medical-professionals/downloads/resources-by-date-added'
  ],
  apgar: [
    'ACOG/AAP · Apgar',
    'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/10/the-apgar-score'
  ],
  bishop: [
    'Bishop original · tabla del estudio Laughon et al.',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC3297470/'
  ]
};
// ── Constructores de campos ── n: numérico; p: positivo; s: selector; yes: sí/no; units: unidad de masa.
const n = (name, label, min = 0, max = 1000000, integer = false) => ({
  name,
  label,
  type: 'number',
  min,
  max,
  integer
});
const p = (name, label, max = 1000000) => n(name, label, Number.MIN_VALUE, max);
const s = (name, label, options) => ({ name, label, type: 'select', options });
const yes = (name, label) =>
  s(name, label, [
    [0, 'No'],
    [1, 'Sí']
  ]);
const units = name =>
  s(name, 'Unidad de masa', [
    ['mcg', 'mcg (microgramos)'],
    ['mg', 'mg (miligramos)'],
    ['g', 'g (gramos)']
  ]);
// Campos compartidos por varias herramientas.
const sex = s('sex', 'Sexo utilizado por la ecuación', [
  ['male', 'Masculino'],
  ['female', 'Femenino']
]);
const age = n('age', 'Edad (años)', 18, 120, true);
const weight = p('weight', 'Peso (kg)', 500);
const height = n('height', 'Talla (cm)', 100, 250);
const creatinine = p('creatinine', 'Creatinina sérica', 30e3);
const creatinineUnit = s('creatinineUnit', 'Unidad de creatinina', [
  ['mgdl', 'mg/dL'],
  ['umol', 'µmol/L']
]);
const vol = p('volume', 'Volumen (mL)');
const minutes = p('minutes', 'Duración (min)');
const hours = p('hours', 'Duración (h)', 1000);
const mass = p('mass', 'Cantidad de fármaco');
const amountUnit = units('massUnit');
const conc = p('concentration', 'Concentración (mg/mL)');
const pre = p('pre', 'Urea antes de diálisis (misma unidad que después)');
const post = p('post', 'Urea después de diálisis (misma unidad que antes)');
const bp = [p('sbp', 'Presión sistólica (mmHg)', 350), p('dbp', 'Presión diastólica (mmHg)', 250)];
// ── Constructores de herramientas ── base: fórmula; score: escala por puntos; ref: referencia externa.
const base = (
  id,
  title,
  description,
  group,
  specialties,
  fields,
  formula,
  source = 'math',
  note = ''
) => ({
  id,
  title,
  description,
  group,
  specialties,
  fields,
  formula,
  source: SOURCES[source],
  note
});
const score = (id, title, description, group, specialties, fields, source, note = '') => ({
  ...base(
    id,
    title,
    description,
    group,
    specialties,
    fields,
    'Suma de los componentes seleccionados.',
    source,
    note
  ),
  score: true
});
const ref = (id, title, description, group, specialties, source, note) => ({
  id,
  title,
  description,
  group,
  specialties,
  source,
  note,
  reference: true,
  fields: []
});
// Especialidades y campos compartidos.
const ca = ['Cardiología', 'Planta', 'Urgencias'];
const icu = ['UCI', 'Urgencias'];
const chaFields = [
  age,
  yes('heart', 'Insuficiencia cardíaca / disfunción ventricular'),
  yes('hypertension', 'Hipertensión'),
  yes('diabetes', 'Diabetes'),
  yes('stroke', 'Ictus, AIT o embolia arterial previos'),
  yes('vascular', 'Enfermedad vascular')
];

// Catálogo completo de herramientas.
export const TOOLS = [
  base(
    'flow',
    'Velocidad de infusión',
    'Volumen y duración → mL/h',
    'med',
    ['Planta', ...icu],
    [vol, minutes],
    'mL/h = volumen × 60 / minutos'
  ),
  base(
    'drip',
    'Goteo por gravedad',
    'Factor del equipo → gotas/min',
    'med',
    ['Planta', 'Urgencias'],
    [vol, minutes, p('factor', 'Factor del equipo (gotas/mL)', 100)],
    'gotas/min = volumen × factor / minutos',
    'math',
    'Introduce el factor indicado en el equipo; no se presupone ningún valor.'
  ),
  base(
    'dose',
    'Volumen de dosis prescrita',
    'Cantidad indicada y disponible → mL',
    'med',
    ['Planta', ...icu],
    [
      p('prescribed', 'Dosis prescrita'),
      s('prescribedUnit', 'Unidad prescrita', [
        ['mcg', 'mcg'],
        ['mg', 'mg'],
        ['g', 'g']
      ]),
      p('available', 'Cantidad de fármaco disponible'),
      s('availableUnit', 'Unidad disponible', [
        ['mcg', 'mcg'],
        ['mg', 'mg'],
        ['g', 'g']
      ]),
      p('volume', 'Volumen que contiene la cantidad disponible (mL)')
    ],
    'Volumen = dosis prescrita / cantidad disponible × volumen disponible'
  ),
  base(
    'duration',
    'Duración de una infusión',
    'Volumen restante y velocidad → tiempo',
    'med',
    ['Planta', ...icu],
    [vol, p('rate', 'Velocidad (mL/h)')],
    'Horas = volumen / velocidad'
  ),
  base(
    'pump',
    'Perfusión por peso → mL/h',
    'Conversión de una velocidad de dosis prescrita',
    'med',
    icu,
    [
      weight,
      p('doseRate', 'Velocidad de dosis prescrita'),
      s('rateUnit', 'Unidad prescrita', [
        ['mcgmin', 'mcg/kg/min'],
        ['mgh', 'mg/kg/h']
      ]),
      conc
    ],
    'mL/h = dosis en mg/kg/h × peso / concentración',
    'math',
    'La concentración debe ser la final de la preparación. No propone pautas ni límites terapéuticos.'
  ),
  base(
    'reversePump',
    'mL/h → dosis por peso',
    'Comprobar la dosis correspondiente a una velocidad',
    'med',
    icu,
    [
      weight,
      p('rate', 'Velocidad (mL/h)'),
      conc,
      s('rateUnit', 'Unidad del resultado', [
        ['mcgmin', 'mcg/kg/min'],
        ['mgh', 'mg/kg/h']
      ])
    ],
    'mg/kg/h = velocidad × concentración / peso'
  ),
  base(
    'concentration',
    'Concentración final',
    'Cantidad total y volumen final → mg/mL',
    'med',
    ['Planta', ...icu],
    [mass, amountUnit, vol],
    'Concentración = masa en mg / volumen final en mL',
    'math',
    'Introduce el volumen final, no solo el volumen de diluyente.'
  ),
  base(
    'dilution',
    'Dilución matemática',
    'C₁ × V₁ = C₂ × V₂',
    'med',
    ['Planta', ...icu],
    [
      p('initial', 'Concentración inicial (mg/mL)'),
      p('target', 'Concentración objetivo prescrita (mg/mL)'),
      p('finalVolume', 'Volumen final deseado (mL)')
    ],
    'V₁ = C₂ × V₂ / C₁; diluyente = V₂ − V₁',
    'math',
    'Cálculo volumétrico ideal. No determina compatibilidad, estabilidad, diluyente o técnica de reconstitución.'
  ),
  base(
    'convert',
    'Conversor de unidades',
    'Masa, volumen, tiempo y presión',
    'med',
    ['Planta', ...icu],
    [
      n('value', 'Valor', 0, 1e12),
      s('from', 'Unidad de origen', [
        ['mcg', 'mcg'],
        ['mg', 'mg'],
        ['g', 'g'],
        ['ml', 'mL'],
        ['l', 'L'],
        ['min', 'min'],
        ['h', 'h'],
        ['mmhg', 'mmHg'],
        ['kpa', 'kPa']
      ]),
      s('to', 'Unidad de destino', [
        ['mcg', 'mcg'],
        ['mg', 'mg'],
        ['g', 'g'],
        ['ml', 'mL'],
        ['l', 'L'],
        ['min', 'min'],
        ['h', 'h'],
        ['mmhg', 'mmHg'],
        ['kpa', 'kPa']
      ])
    ],
    'Valor destino = valor origen × factor origen / factor destino'
  ),
  base(
    'bmi',
    'Índice de masa corporal (IMC)',
    'Peso / talla² · adultos',
    'nutrition',
    ['Nutrición', 'Planta'],
    [weight, height],
    'IMC = peso / (talla en metros)²',
    'bmi',
    'No aplica clasificación pediátrica ni sustituye valoración nutricional.'
  ),
  base(
    'bsa',
    'Superficie corporal',
    'Mosteller · m²',
    'nutrition',
    ['Nutrición', 'Planta'],
    [weight, height],
    'SC = √(peso en kg × talla en cm / 3600)',
    'bsa'
  ),
  base(
    'weightLoss',
    'Cambio de peso',
    'Porcentaje de pérdida respecto al peso habitual',
    'nutrition',
    ['Nutrición', 'Planta'],
    [p('usual', 'Peso habitual (kg)', 500), weight],
    'Pérdida (%) = (peso habitual − actual) / habitual × 100',
    'bmi',
    'Un resultado negativo indica ganancia de peso. El período y el carácter involuntario se valoran por separado.'
  ),
  base(
    'harris',
    'Gasto energético en reposo',
    'Harris–Benedict revisada · 1984',
    'nutrition',
    ['Nutrición'],
    [age, sex, weight, height],
    'H: 88,362 + 13,397P + 4,799T − 5,677E; M: 447,593 + 9,247P + 3,098T − 4,330E',
    'harris',
    'Estimación basal, sin aplicar factores de estrés o actividad ni prescribir nutrición.'
  ),
  base(
    'cg',
    'Aclaramiento de creatinina',
    'Cockcroft–Gault · mL/min',
    'renal',
    ['Nefrología', 'Planta'],
    [age, sex, weight, creatinine, creatinineUnit],
    'CrCl = (140 − edad) × peso / (72 × creatinina mg/dL) × 0,85 si femenino',
    'cg',
    'No equivale a TFG. El tipo de peso y la aplicabilidad dependen del contexto. No ajustar automáticamente medicación; no válido con creatinina inestable.'
  ),
  base(
    'ckd',
    'TFG estimada CKD-EPI',
    'Creatinina 2021 · sin coeficiente racial',
    'renal',
    ['Nefrología', 'Planta'],
    [age, sex, creatinine, creatinineUnit],
    '142 × min(SCr/κ,1)^α × max(SCr/κ,1)^−1,200 × 0,9938^edad × 1,012 si femenino',
    'ckd',
    'Adultos ≥18 años. Estimación normalizada a 1,73 m²; no es mL/min absoluto ni válida para lesión renal aguda con creatinina inestable.'
  ),
  base(
    'urr',
    'Reducción de urea (URR)',
    'Urea antes y después de hemodiálisis',
    'renal',
    ['Nefrología'],
    [pre, post],
    'URR = (1 − urea post / urea pre) × 100',
    'dialysis',
    'Usa la misma unidad y el protocolo correcto de extracción de muestras.'
  ),
  base(
    'ktv',
    'Adecuación de diálisis (spKt/V)',
    'Daugirdas II · monocompartimental',
    'renal',
    ['Nefrología'],
    [
      pre,
      post,
      hours,
      n('uf', 'Ultrafiltración (L)', 0, 20),
      p('postWeight', 'Peso postdiálisis (kg)', 500)
    ],
    '−ln(R − 0,008t) + (4 − 3,5R) × UF / peso post; R = urea post / pre',
    'dialysis',
    'No equivale a eKt/V ni a Kt/V estándar semanal. Solo se calcula con dominio logarítmico válido.'
  ),
  score(
    'child',
    'Child–Pugh',
    'Función hepática · variante con INR',
    'renal',
    ['Planta'],
    [
      p('bilirubin', 'Bilirrubina total (mg/dL)', 100),
      p('albumin', 'Albúmina (g/dL)', 10),
      p('inr', 'INR', 20),
      s('ascites', 'Ascitis', [
        [1, 'Ausente'],
        [2, 'Leve / controlada'],
        [3, 'Persistente pese a tratamiento']
      ]),
      s('encephalopathy', 'Encefalopatía', [
        [1, 'Ausente'],
        [2, 'Grado I–II'],
        [3, 'Grado III–IV']
      ])
    ],
    'child',
    'Variante estándar, no adaptada a enfermedades colestásicas. Requiere valoración clínica de los componentes.'
  ),
  base(
    'balance',
    'Balance hídrico',
    'Ingresos − egresos en el intervalo seleccionado',
    'fluids',
    ['Planta', ...icu],
    [n('intake', 'Ingresos totales (mL)'), n('output', 'Egresos totales (mL)'), hours],
    'Balance = ingresos − egresos',
    'math',
    'No estima pérdidas insensibles ni prescribe reposición. El resultado corresponde al intervalo introducido, no necesariamente a 24 h.'
  ),
  base(
    'urine',
    'Diuresis por peso',
    'Volumen / peso / horas',
    'fluids',
    ['Planta', ...icu],
    [n('urine', 'Orina recogida (mL)'), weight, hours],
    'Diuresis = orina / peso / horas'
  ),
  base(
    'anion',
    'Anión gap',
    'Sin potasio · electrolitos en la misma unidad',
    'fluids',
    icu,
    [
      p('sodium', 'Sodio (mmol/L)', 250),
      p('chloride', 'Cloro (mmol/L)', 250),
      p('bicarbonate', 'Bicarbonato (mmol/L)', 80)
    ],
    'AG = Na − (Cl + HCO₃)',
    'gas',
    'No corrige por albúmina; usa el intervalo de referencia del laboratorio. Un resultado aislado no establece un diagnóstico.'
  ),
  base(
    'map',
    'Presión arterial media',
    'Aproximación a partir de PAS y PAD',
    'cardio',
    ca,
    bp,
    'PAM ≈ (PAS + 2 × PAD) / 3',
    'map',
    'Aproximación; no sustituye la media medida por el monitor y puede perder precisión con frecuencias extremas.'
  ),
  base(
    'shock',
    'Índice de shock',
    'Frecuencia cardíaca / presión sistólica',
    'cardio',
    ['Urgencias', 'UCI'],
    [
      p('heartRate', 'Frecuencia cardíaca (latidos/min)', 350),
      p('sbp', 'Presión sistólica (mmHg)', 350)
    ],
    'IS = frecuencia cardíaca / PAS',
    'shock',
    'Sin clasificación ni decisión automática. No aplicar umbrales universales a embarazo, infancia o tratamientos que alteran la frecuencia.'
  ),
  score(
    'cha',
    'CHA₂DS₂-VASc',
    'Puntuación histórica de riesgo en fibrilación auricular',
    'cardio',
    ca,
    [...chaFields, sex],
    'esc',
    'Versión histórica con sexo femenino. Disponible también CHA₂DS₂-VA (ESC 2024). No prescribe anticoagulación.'
  ),
  score(
    'chava',
    'CHA₂DS₂-VA',
    'Versión ESC 2024 sin componente de sexo',
    'cardio',
    ca,
    chaFields,
    'esc',
    'Solo en el contexto de fibrilación auricular y evaluación clínica; no prescribe anticoagulación.'
  ),
  score(
    'has',
    'HAS-BLED',
    'Componentes de riesgo hemorrágico · 2010',
    'cardio',
    ca,
    [
      yes('hypertension', 'Hipertensión no controlada: PAS >160 mmHg'),
      yes('renal', 'Función renal anormal: diálisis, trasplante o creatinina ≥2,26 mg/dL'),
      yes('liver', 'Hepatopatía crónica o bilirrubina >2×LSN junto a AST/ALT/FA >3×LSN'),
      yes('stroke', 'Ictus previo'),
      yes('bleeding', 'Sangrado previo o predisposición'),
      yes('labile', 'INR lábil / TTR <60 %'),
      yes('elderly', 'Edad >65 años'),
      yes('drugs', 'Antiagregantes o AINE concomitantes'),
      yes('alcohol', 'Alcohol ≥8 bebidas/semana')
    ],
    'has',
    'No es una orden para suspender anticoagulación. LSN: límite superior de normalidad. Confirma criterios y protocolo local.'
  ),
  score(
    'wells',
    'Wells para TVP',
    'Modelo de dos niveles · no es Wells para TEP',
    'cardio',
    ['Urgencias', 'Planta'],
    [
      yes('cancer', 'Cáncer activo, tratado en últimos 6 meses o paliativo'),
      yes('paralysis', 'Paresia, parálisis o inmovilización en yeso de extremidad inferior'),
      yes(
        'bed',
        'Encamamiento ≥3 días o cirugía mayor en 12 semanas con anestesia general/regional'
      ),
      yes('tender', 'Dolor localizado sobre trayecto venoso profundo'),
      yes('leg', 'Hinchazón de toda la pierna'),
      yes('calf', 'Pantorrilla ≥3 cm mayor, medida 10 cm bajo tuberosidad tibial'),
      yes('edema', 'Edema con fóvea limitado a la pierna sintomática'),
      yes('veins', 'Venas colaterales superficiales no varicosas'),
      yes('previous', 'TVP documentada previa'),
      yes('alternative', 'Otro diagnóstico al menos igual de probable que TVP')
    ],
    'wells',
    'No confirma ni descarta TVP. No se aporta probabilidad porcentual ni pauta terapéutica.'
  ),
  score(
    'gcs',
    'Escala de coma de Glasgow',
    'Desglose ocular, verbal y motor · incluye no valorable',
    'neuro',
    ['Neurología', ...icu],
    [
      s('eye', 'Respuesta ocular', [
        [4, 'Espontánea'],
        [3, 'Al sonido'],
        [2, 'A la presión'],
        [1, 'Ninguna'],
        ['NT', 'No valorable']
      ]),
      s('verbal', 'Respuesta verbal', [
        [5, 'Orientado'],
        [4, 'Confuso'],
        [3, 'Palabras'],
        [2, 'Sonidos'],
        [1, 'Ninguna'],
        ['NT', 'No valorable']
      ]),
      s('motor', 'Respuesta motora', [
        [6, 'Obedece órdenes'],
        [5, 'Localiza'],
        [4, 'Flexión normal'],
        [3, 'Flexión anormal'],
        [2, 'Extensión'],
        [1, 'Ninguna'],
        ['NT', 'No valorable']
      ])
    ],
    'gcs',
    'Valorar interferencias como sedación, intubación o barreras de comunicación. No es la variante pediátrica.'
  ),
  score(
    'barthel',
    'Índice de Barthel',
    'Actividades básicas · versión 0–100',
    'mobility',
    ['Planta', 'Neurología'],
    [
      s('food', 'Comer', [
        [0, 'Dependiente'],
        [5, 'Ayuda para cortar o preparar'],
        [10, 'Independiente']
      ]),
      s('bath', 'Bañarse', [
        [0, 'Necesita ayuda'],
        [5, 'Independiente']
      ]),
      s('dress', 'Vestirse', [
        [0, 'Dependiente'],
        [5, 'Ayuda; hace al menos la mitad'],
        [10, 'Independiente']
      ]),
      s('groom', 'Aseo personal', [
        [0, 'Necesita ayuda'],
        [5, 'Independiente']
      ]),
      s('bowel', 'Deposiciones', [
        [0, 'Incontinencia'],
        [5, 'Accidente ocasional'],
        [10, 'Continencia']
      ]),
      s('bladder', 'Micción', [
        [0, 'Incontinencia o sonda que no maneja'],
        [5, 'Accidente ocasional'],
        [10, 'Continencia o manejo autónomo']
      ]),
      s('toilet', 'Uso del retrete', [
        [0, 'Dependiente'],
        [5, 'Necesita alguna ayuda'],
        [10, 'Independiente']
      ]),
      s('transfer', 'Traslado cama-silla', [
        [0, 'No puede / sin equilibrio sentado'],
        [5, 'Gran ayuda; puede sentarse'],
        [10, 'Ayuda mínima o supervisión'],
        [15, 'Independiente']
      ]),
      s('walk', 'Desplazamiento', [
        [0, 'Inmóvil o no alcanza criterio'],
        [5, 'Silla de ruedas autónoma ≥50 m'],
        [10, 'Camina ≥50 m con ayuda'],
        [15, 'Camina ≥50 m sin ayuda personal']
      ]),
      s('stairs', 'Escaleras', [
        [0, 'No puede'],
        [5, 'Necesita ayuda o supervisión'],
        [10, 'Independiente']
      ])
    ],
    'barthel',
    'Puntuación funcional, no valoración completa de autonomía. No intercambiar con versiones de 0–20.'
  ),
  score(
    'morse',
    'Riesgo de caídas · Morse',
    'Seis componentes · puntos de corte del centro',
    'mobility',
    ['Planta'],
    [
      s('fall', 'Caída inmediata o antecedente', [
        [0, 'No'],
        [25, 'Sí']
      ]),
      s('diagnosis', 'Dos o más diagnósticos', [
        [0, 'No'],
        [15, 'Sí']
      ]),
      s('aid', 'Ayuda para caminar', [
        [0, 'Ninguna / reposo / ayuda de enfermería'],
        [15, 'Bastón, muletas o andador'],
        [30, 'Se apoya en muebles']
      ]),
      s('iv', 'Vía o tratamiento IV', [
        [0, 'No'],
        [20, 'Sí']
      ]),
      s('gait', 'Marcha', [
        [0, 'Normal / reposo / silla'],
        [10, 'Débil'],
        [20, 'Alterada']
      ]),
      s('mental', 'Conciencia de sus limitaciones', [
        [0, 'Las reconoce'],
        [15, 'Las olvida o sobreestima capacidad']
      ])
    ],
    'morse',
    'Los umbrales de intervención deben ser los del centro. No se impone una clasificación universal.'
  ),
  score(
    'norton',
    'Escala de Norton',
    'Riesgo de lesión por presión · original 5–20',
    'skin',
    ['Planta'],
    [
      s('physical', 'Estado físico', [
        [4, 'Bueno'],
        [3, 'Intermedio'],
        [2, 'Malo'],
        [1, 'Muy malo']
      ]),
      s('mental', 'Estado mental', [
        [4, 'Alerta'],
        [3, 'Apático'],
        [2, 'Confuso'],
        [1, 'Estuporoso']
      ]),
      s('activity', 'Actividad', [
        [4, 'Camina'],
        [3, 'Camina con ayuda'],
        [2, 'Silla'],
        [1, 'Encamado']
      ]),
      s('mobility', 'Movilidad', [
        [4, 'Completa'],
        [3, 'Algo limitada'],
        [2, 'Muy limitada'],
        [1, 'Inmóvil']
      ]),
      s('continence', 'Incontinencia', [
        [4, 'Ninguna'],
        [3, 'Ocasional'],
        [2, 'Habitualmente urinaria'],
        [1, 'Urinaria y fecal']
      ])
    ],
    'norton',
    'Una puntuación menor representa mayor riesgo. Interpretar con valoración clínica y protocolo del centro.'
  ),
  base(
    'wound',
    'Área rectangular de una lesión',
    'Largo × ancho · seguimiento de medidas',
    'skin',
    ['Planta'],
    [n('length', 'Largo máximo (cm)', 0, 100), n('width', 'Ancho perpendicular (cm)', 0, 100)],
    'Área rectangular = largo × ancho',
    'math',
    'Aproximación de superficie; no mide área real irregular, profundidad o volumen y no equivale a PUSH.'
  ),
  base(
    'pf',
    'Cociente PaO₂/FiO₂',
    'PaO₂ arterial y fracción inspirada',
    'resp',
    icu,
    [p('pao2', 'PaO₂ arterial (mmHg)', 800), n('fio2', 'FiO₂ (%)', 21, 100)],
    'P/F = PaO₂ / (FiO₂ % / 100)',
    'ards',
    'No clasifica SDRA por sí solo: requiere otros criterios y contexto de soporte respiratorio. No introducir SpO₂ en lugar de PaO₂.'
  ),
  base(
    'tidal',
    'Volumen tidal por peso predicho',
    'PBW ARDSNet · coeficiente introducido por el usuario',
    'resp',
    icu,
    [height, sex, n('mlkg', 'Coeficiente prescrito (mL/kg PBW)', 4, 8)],
    'PBW = 50 (H) o 45,5 (M) + 0,91 × (talla − 152,4); VT = PBW × mL/kg',
    'ards',
    'Adultos. Usa peso predicho, no peso real. No selecciona parámetros del ventilador ni sustituye vigilancia de presiones.'
  ),
  score(
    'curb',
    'CURB-65',
    'Neumonía comunitaria en adultos',
    'resp',
    ['Urgencias', 'Planta'],
    [
      age,
      yes('confusion', 'Confusión nueva'),
      p('urea', 'Urea (mmol/L)', 100),
      p('respRate', 'Frecuencia respiratoria (resp/min)', 100),
      ...bp
    ],
    'curb',
    'Aplicar tras diagnóstico clínico de neumonía comunitaria. Urea no es BUN. No determina por sí sola ingreso o tratamiento.'
  ),
  base(
    'winter',
    'Gasometría · fórmula de Winter',
    'Compensación esperada en acidosis metabólica',
    'resp',
    icu,
    [p('bicarbonate', 'Bicarbonato (mmol/L)', 24)],
    'PaCO₂ esperada = 1,5 × HCO₃ + 8 ± 2 mmHg',
    'gas',
    'Solo cuando se ha identificado acidosis metabólica. No es una interpretación completa de gasometría ni diagnostica trastornos mixtos.'
  ),
  base(
    'pain',
    'Dolor · escala numérica',
    'Intensidad autorreferida de 0 a 10',
    'pain',
    ['Planta', ...icu],
    [n('pain', 'Intensidad indicada por la persona (0–10)', 0, 10, true)],
    'Registro de la intensidad numérica comunicada por la persona',
    'rass',
    'No es una EVA visual continua ni una escala observacional. No inferir dolor si la persona no puede comunicarlo.'
  ),
  base(
    'rass',
    'Escala RASS',
    'Agitación y sedación · de −5 a +4',
    'pain',
    icu,
    [
      s('rass', 'Respuesta observada', [
        [4, '+4 · Combativo; peligro inmediato'],
        [3, '+3 · Muy agitado; intenta retirar dispositivos'],
        [2, '+2 · Agitado; movimientos sin propósito'],
        [1, '+1 · Inquieto, sin movimientos agresivos'],
        [0, '0 · Alerta y tranquilo'],
        [-1, '−1 · Despierta a voz; contacto ocular >10 s'],
        [-2, '−2 · Despierta a voz; contacto ocular <10 s'],
        [-3, '−3 · Movimiento a voz sin contacto ocular'],
        [-4, '−4 · Sin respuesta a voz; movimiento a estímulo físico'],
        [-5, '−5 · Sin respuesta a voz ni estímulo físico']
      ])
    ],
    'Puntuación de la respuesta observada; observar → voz → estímulo físico según protocolo',
    'rass',
    'Requiere evaluación estructurada. No convierte el resultado en una indicación de sedación.'
  ),
  score(
    'apgar',
    'Test de Apgar',
    'Cinco componentes · registrar minuto de evaluación',
    'ob',
    ['Obstetricia'],
    [
      s('minute', 'Momento de evaluación', [
        ['1', '1 minuto'],
        ['5', '5 minutos'],
        ['10', '10 minutos'],
        ['15', '15 minutos'],
        ['20', '20 minutos']
      ]),
      s('color', 'Coloración', [
        [0, 'Pálido o cianótico'],
        [1, 'Tronco rosado; extremidades azuladas'],
        [2, 'Rosado']
      ]),
      s('pulse', 'Frecuencia cardíaca', [
        [0, 'Ausente'],
        [1, 'Menor de 100/min'],
        [2, 'Al menos 100/min']
      ]),
      s('reflex', 'Respuesta a estímulo', [
        [0, 'Sin respuesta'],
        [1, 'Mueca'],
        [2, 'Llanto, tos/estornudo o retirada']
      ]),
      s('tone', 'Tono muscular', [
        [0, 'Flácido'],
        [1, 'Algo de flexión'],
        [2, 'Movimiento activo']
      ]),
      s('breath', 'Respiración', [
        [0, 'Ausente'],
        [1, 'Lenta o irregular'],
        [2, 'Llanto vigoroso']
      ])
    ],
    'apgar',
    'No esperar a obtener Apgar para iniciar reanimación. No predice por sí solo el resultado individual ni establece asfixia.'
  ),
  score(
    'bishop',
    'Índice de Bishop',
    'Versión original con borramiento · 0–13',
    'ob',
    ['Obstetricia'],
    [
      s('dilation', 'Dilatación', [
        [0, 'Cerrado'],
        [1, '1–2 cm'],
        [2, '3–4 cm'],
        [3, '≥5 cm']
      ]),
      s('effacement', 'Borramiento', [
        [0, '0–30 %'],
        [1, '40–50 %'],
        [2, '60–70 %'],
        [3, '≥80 %']
      ]),
      s('station', 'Estación respecto a espinas ciáticas', [
        [0, '−3'],
        [1, '−2'],
        [2, '−1 o 0'],
        [3, '+1 o +2']
      ]),
      s('consistency', 'Consistencia cervical', [
        [0, 'Firme'],
        [1, 'Intermedia'],
        [2, 'Blanda']
      ]),
      s('position', 'Posición cervical', [
        [0, 'Posterior'],
        [1, 'Media'],
        [2, 'Anterior']
      ])
    ],
    'bishop',
    'No es Bishop modificado con longitud cervical. Requiere exploración y no propone inducción.'
  ),
  ref(
    'nrs',
    'Cribado nutricional NRS-2002',
    'Guía ESPEN de cribado hospitalario',
    'nutrition',
    ['Nutrición', 'Planta'],
    ['ESPEN · NRS-2002', 'https://www.espen.org/documents/Screening.pdf'],
    'Referencia externa. Integración del formulario pendiente de revisar versión y reproducción.'
  ),
  ref(
    'braden',
    'Escala de Braden',
    'Valoración de riesgo de lesión por presión',
    'skin',
    ['Planta'],
    [
      'AHRQ · recurso Braden',
      'https://www.ahrq.gov/patient-safety/settings/hospital/resource/pressureulcer/tool/pu7b.html'
    ],
    'Referencia externa; formulario no incorporado hasta revisar las condiciones de reproducción.'
  ),
  ref(
    'push',
    'PUSH Tool',
    'Seguimiento de lesiones por presión',
    'skin',
    ['Planta'],
    ['NPIAP · PUSH y condiciones de uso', 'https://learn.npiap.com/products/push-tool-1'],
    'NPIAP exige autorización para incorporarlo a programas externos. Se enlaza el recurso; no se reproduce el instrumento.'
  ),
  ref(
    'pfeiffer',
    'Cuestionario de Pfeiffer',
    'Cribado cognitivo · SPMSQ',
    'neuro',
    ['Planta', 'Neurología'],
    ['Pfeiffer · estudio original', 'https://pubmed.ncbi.nlm.nih.gov/1159263/'],
    'Referencia externa; adaptación española y correcciones por escolaridad pendientes de validar.'
  ),
  ref(
    'nihss',
    'NIHSS · ictus',
    'Instrumento e instrucciones de evaluación',
    'neuro',
    ['Neurología', 'Urgencias'],
    [
      'NINDS · NIHSS 2024',
      'https://www.ninds.nih.gov/sites/default/files/documents/NIH-Stroke-Scale_updatedFeb2024_508.pdf'
    ],
    'Acceso al instrumento completo; no se sustituye su entrenamiento por una suma abreviada.'
  ),
  ref(
    'cam',
    'CAM-ICU · delirium',
    'Manual de aplicación y algoritmo',
    'neuro',
    ['UCI'],
    [
      'Vanderbilt · CAM-ICU',
      'https://www.icudelirium.org/medical-professionals/downloads/resources-by-date-added'
    ],
    'Referencia externa; requiere aplicar las pruebas de atención y pensamiento, no solo marcar síntomas.'
  ),
  ref(
    'cpot',
    'CPOT',
    'Dolor en personas que no pueden comunicarlo',
    'pain',
    ['UCI'],
    [
      'Vanderbilt · CPOT',
      'https://www.icudelirium.org/medical-professionals/downloads/resources-by-date-added'
    ],
    'Referencia externa; formulario observacional pendiente de revisar traducción y reproducción.'
  ),
  ref(
    'news',
    'NEWS2',
    'Deterioro clínico · escalas de saturación 1 y 2',
    'urgent',
    ['Planta', ...icu],
    [
      'Royal College of Physicians · NEWS2',
      'https://rcp.ac.uk/resources/national-early-warning-score-news-2/'
    ],
    'Se enlaza el material oficial completo. No se implementa una variante parcial ni se elige automáticamente la escala de saturación.'
  )
];

/** Valida y convierte los valores del formulario según los campos de la herramienta. */
export function validateToolValues(tool, raw) {
  const result = {};
  for (const field of tool.fields) {
    const input = String(raw[field.name] ?? '').trim();
    if (field.type === 'select') {
      const option = field.options.find(([value]) => String(value) === input);
      if (!option) throw new Error(`${field.label}: selecciona una opción.`);
      result[field.name] = option[0];
    } else {
      if (!/^\d+(?:[.,]\d+)?$/.test(input))
        throw new Error(`${field.label}: introduce un número, sin separadores de miles.`);
      const value = Number(input.replace(',', '.'));
      if (
        !Number.isFinite(value) ||
        value < field.min ||
        value > field.max ||
        (field.integer && !Number.isInteger(value))
      )
        throw new Error(
          `${field.label}: valor fuera de rango${field.integer ? ' o no entero' : ''}.`
        );
      result[field.name] = value;
    }
  }
  return result;
}
