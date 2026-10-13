# Calculadoras y escalas — Turno 0.3

40 herramientas locales y 8 referencias externas. Fuentes consultadas el 13/10/2026. Prototipo pendiente de revisión y validación clínica independiente.

Cada entrada tiene una explicación de qué es, para qué sirve y cómo leer el resultado.
Los 156 campos incluyen definiciones visibles, unidades y aclaraciones de datos que
no deben confundirse, como PaO₂/SpO₂, urea/BUN, actividad/movilidad o volumen final/diluyente.
Los ejemplos son educativos: no se insertan automáticamente como datos clínicos.
Estas ayudas están incluidas en la descarga offline del App Shell.

Verificación de la versión 0.3: cobertura comprobada de las 48 entradas y los 156
campos, las 30 pruebas aritméticas siguen pasando. En navegador se comprobaron la
ayuda de factor de goteo, el vínculo accesible con su campo y la explicación tras
calcular 40 gotas/min. Con el servidor local apagado se recargó la aplicación y se
consultaron las ayudas de PaO₂/FiO₂, obteniendo 200 mmHg para 80 mmHg y 40 %.

Los formularios calculables funcionan offline después de instalar el App Shell. Los enlaces de fuentes y los instrumentos externos necesitan conexión. Ningún dato de calculadora se persiste.

## Medicación e infusiones

### Velocidad de infusión

**Herramienta local.** Volumen y duración → mL/h.

Fórmula/criterios: mL/h = volumen × 60 / minutos

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Goteo por gravedad

**Herramienta local.** Factor del equipo → gotas/min.

Fórmula/criterios: gotas/min = volumen × factor / minutos

Introduce el factor indicado en el equipo; no se presupone ningún valor.

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Volumen de dosis prescrita

**Herramienta local.** Cantidad indicada y disponible → mL.

Fórmula/criterios: Volumen = dosis prescrita / cantidad disponible × volumen disponible

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Duración de una infusión

**Herramienta local.** Volumen restante y velocidad → tiempo.

Fórmula/criterios: Horas = volumen / velocidad

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Perfusión por peso → mL/h

**Herramienta local.** Conversión de una velocidad de dosis prescrita.

Fórmula/criterios: mL/h = dosis en mg/kg/h × peso / concentración

La concentración debe ser la final de la preparación. No propone pautas ni límites terapéuticos.

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### mL/h → dosis por peso

**Herramienta local.** Comprobar la dosis correspondiente a una velocidad.

Fórmula/criterios: mg/kg/h = velocidad × concentración / peso

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Concentración final

**Herramienta local.** Cantidad total y volumen final → mg/mL.

Fórmula/criterios: Concentración = masa en mg / volumen final en mL

Introduce el volumen final, no solo el volumen de diluyente.

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Dilución matemática

**Herramienta local.** C₁ × V₁ = C₂ × V₂.

Fórmula/criterios: V₁ = C₂ × V₂ / C₁; diluyente = V₂ − V₁

Cálculo volumétrico ideal. No determina compatibilidad, estabilidad, diluyente o técnica de reconstitución.

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Conversor de unidades

**Herramienta local.** Masa, volumen, tiempo y presión.

Fórmula/criterios: Valor destino = valor origen × factor origen / factor destino

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

## Estado nutricional

### Índice de masa corporal (IMC)

**Herramienta local.** Peso / talla² · adultos.

Fórmula/criterios: IMC = peso / (talla en metros)²

No aplica clasificación pediátrica ni sustituye valoración nutricional.

Fuente: [OMS · índice de masa corporal](https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight).

### Superficie corporal

**Herramienta local.** Mosteller · m².

Fórmula/criterios: SC = √(peso en kg × talla en cm / 3600)

Fuente: [Mosteller · 1987](https://pubmed.ncbi.nlm.nih.gov/3657876/).

### Cambio de peso

**Herramienta local.** Porcentaje de pérdida respecto al peso habitual.

Fórmula/criterios: Pérdida (%) = (peso habitual − actual) / habitual × 100

Un resultado negativo indica ganancia de peso. El período y el carácter involuntario se valoran por separado.

Fuente: [OMS · índice de masa corporal](https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight).

### Gasto energético en reposo

**Herramienta local.** Harris–Benedict revisada · 1984.

Fórmula/criterios: H: 88,362 + 13,397P + 4,799T − 5,677E; M: 447,593 + 9,247P + 3,098T − 4,330E

Estimación basal, sin aplicar factores de estrés o actividad ni prescribir nutrición.

Fuente: [Roza y Shizgal · revisión 1984](https://nutritionalassessment.mumc.nl/en/calculating-energy-expenditure).

### Cribado nutricional NRS-2002

**Referencia externa; sin cálculo local.** Guía ESPEN de cribado hospitalario.

Referencia externa. Integración del formulario pendiente de revisar versión y reproducción.

Fuente: [ESPEN · NRS-2002](https://www.espen.org/documents/Screening.pdf).

## Función renal y hepática

### Aclaramiento de creatinina

**Herramienta local.** Cockcroft–Gault · mL/min.

Fórmula/criterios: CrCl = (140 − edad) × peso / (72 × creatinina mg/dL) × 0,85 si femenino

No equivale a TFG. El tipo de peso y la aplicabilidad dependen del contexto. No ajustar automáticamente medicación; no válido con creatinina inestable.

Fuente: [Cockcroft–Gault · 1976; limitaciones NKF](https://www.kidney.org/professionals/kdoqi/cockcroft-gault-equation-estimating-creatinine-clearance).

### TFG estimada CKD-EPI

**Herramienta local.** Creatinina 2021 · sin coeficiente racial.

Fórmula/criterios: 142 × min(SCr/κ,1)^α × max(SCr/κ,1)^−1,200 × 0,9938^edad × 1,012 si femenino

Adultos ≥18 años. Estimación normalizada a 1,73 m²; no es mL/min absoluto ni válida para lesión renal aguda con creatinina inestable.

Fuente: [NIDDK · CKD-EPI creatinina 2021](https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults).

### Reducción de urea (URR)

**Herramienta local.** Urea antes y después de hemodiálisis.

Fórmula/criterios: URR = (1 − urea post / urea pre) × 100

Usa la misma unidad y el protocolo correcto de extracción de muestras.

Fuente: [Renal Association · adecuación de hemodiálisis](https://pmc.ncbi.nlm.nih.gov/articles/PMC6798406/).

### Adecuación de diálisis (spKt/V)

**Herramienta local.** Daugirdas II · monocompartimental.

Fórmula/criterios: −ln(R − 0,008t) + (4 − 3,5R) × UF / peso post; R = urea post / pre

No equivale a eKt/V ni a Kt/V estándar semanal. Solo se calcula con dominio logarítmico válido.

Fuente: [Renal Association · adecuación de hemodiálisis](https://pmc.ncbi.nlm.nih.gov/articles/PMC6798406/).

### Child–Pugh

**Herramienta local.** Función hepática · variante con INR.

Fórmula/criterios: Suma de los componentes seleccionados.

Variante estándar, no adaptada a enfermedades colestásicas. Requiere valoración clínica de los componentes.

Fuente: [Child–Turcotte–Pugh · variante INR](https://www.merckmanuals.com/professional/multimedia/table/child-turcotte-pugh-scoring-system).

## Líquidos y electrolitos

### Balance hídrico

**Herramienta local.** Ingresos − egresos en el intervalo seleccionado.

Fórmula/criterios: Balance = ingresos − egresos

No estima pérdidas insensibles ni prescribe reposición. El resultado corresponde al intervalo introducido, no necesariamente a 24 h.

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Diuresis por peso

**Herramienta local.** Volumen / peso / horas.

Fórmula/criterios: Diuresis = orina / peso / horas

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Anión gap

**Herramienta local.** Sin potasio · electrolitos en la misma unidad.

Fórmula/criterios: AG = Na − (Cl + HCO₃)

No corrige por albúmina; usa el intervalo de referencia del laboratorio. Un resultado aislado no establece un diagnóstico.

Fuente: [MSD · equilibrio ácido-base y Winter](https://www.merckmanuals.com/en-ca/professional/nephrology/acid-base-regulation-and-disorders/acid-base-disorders).

## Cardiovascular

### Presión arterial media

**Herramienta local.** Aproximación a partir de PAS y PAD.

Fórmula/criterios: PAM ≈ (PAS + 2 × PAD) / 3

Aproximación; no sustituye la media medida por el monitor y puede perder precisión con frecuencias extremas.

Fuente: [AHA · medición de presión arterial](https://pmc.ncbi.nlm.nih.gov/articles/PMC11409525/).

### Índice de shock

**Herramienta local.** Frecuencia cardíaca / presión sistólica.

Fórmula/criterios: IS = frecuencia cardíaca / PAS

Sin clasificación ni decisión automática. No aplicar umbrales universales a embarazo, infancia o tratamientos que alteran la frecuencia.

Fuente: [ARIC · definición del índice de shock](https://pmc.ncbi.nlm.nih.gov/articles/PMC8557437/).

### CHA₂DS₂-VASc

**Herramienta local.** Puntuación histórica de riesgo en fibrilación auricular.

Fórmula/criterios: Suma de los componentes seleccionados.

Versión histórica con sexo femenino. Disponible también CHA₂DS₂-VA (ESC 2024). No prescribe anticoagulación.

Fuente: [ESC · fibrilación auricular 2024](https://academic.oup.com/eurheartj/article/45/36/3314/7738779).

### CHA₂DS₂-VA

**Herramienta local.** Versión ESC 2024 sin componente de sexo.

Fórmula/criterios: Suma de los componentes seleccionados.

Solo en el contexto de fibrilación auricular y evaluación clínica; no prescribe anticoagulación.

Fuente: [ESC · fibrilación auricular 2024](https://academic.oup.com/eurheartj/article/45/36/3314/7738779).

### HAS-BLED

**Herramienta local.** Componentes de riesgo hemorrágico · 2010.

Fórmula/criterios: Suma de los componentes seleccionados.

No es una orden para suspender anticoagulación. LSN: límite superior de normalidad. Confirma criterios y protocolo local.

Fuente: [HAS-BLED · Pisters et al., 2010](https://pubmed.ncbi.nlm.nih.gov/20299623/).

### Wells para TVP

**Herramienta local.** Modelo de dos niveles · no es Wells para TEP.

Fórmula/criterios: Suma de los componentes seleccionados.

No confirma ni descarta TVP. No se aporta probabilidad porcentual ni pauta terapéutica.

Fuente: [NICE NG158 · Wells TVP, dos niveles](https://www.nice.org.uk/guidance/ng158/chapter/Recommendations).

## Neurológica

### Escala de coma de Glasgow

**Herramienta local.** Desglose ocular, verbal y motor · incluye no valorable.

Fórmula/criterios: Suma de los componentes seleccionados.

Valorar interferencias como sedación, intubación o barreras de comunicación. No es la variante pediátrica.

Fuente: [Glasgow · evaluación estructurada](https://www.glasgowcomascale.org/faq/).

### Cuestionario de Pfeiffer

**Referencia externa; sin cálculo local.** Cribado cognitivo · SPMSQ.

Referencia externa; adaptación española y correcciones por escolaridad pendientes de validar.

Fuente: [Pfeiffer · estudio original](https://pubmed.ncbi.nlm.nih.gov/1159263/).

### NIHSS · ictus

**Referencia externa; sin cálculo local.** Instrumento e instrucciones de evaluación.

Acceso al instrumento completo; no se sustituye su entrenamiento por una suma abreviada.

Fuente: [NINDS · NIHSS 2024](https://www.ninds.nih.gov/sites/default/files/documents/NIH-Stroke-Scale_updatedFeb2024_508.pdf).

### CAM-ICU · delirium

**Referencia externa; sin cálculo local.** Manual de aplicación y algoritmo.

Referencia externa; requiere aplicar las pruebas de atención y pensamiento, no solo marcar síntomas.

Fuente: [Vanderbilt · CAM-ICU](https://www.icudelirium.org/medical-professionals/downloads/resources-by-date-added).

## Movilidad y funcionalidad

### Índice de Barthel

**Herramienta local.** Actividades básicas · versión 0–100.

Fórmula/criterios: Suma de los componentes seleccionados.

Puntuación funcional, no valoración completa de autonomía. No intercambiar con versiones de 0–20.

Fuente: [SACYL · Barthel, versión 0–100](https://www.saludcastillayleon.es/profesionales/es/coordinacion-sociosanitaria/procesos-atencion/dependencia.ficheros/283308-Informe%20de%20salud%20para%20solicitar%20prestaciones%20sociales%20mayo%2008.pdf).

### Riesgo de caídas · Morse

**Herramienta local.** Seis componentes · puntos de corte del centro.

Fórmula/criterios: Suma de los componentes seleccionados.

Los umbrales de intervención deben ser los del centro. No se impone una clasificación universal.

Fuente: [AHRQ · Morse; puntos de corte según centro](https://www.ahrq.gov/sites/default/files/publications/files/fallpxtoolkit.pdf).

## Piel y lesiones por presión

### Escala de Norton

**Herramienta local.** Riesgo de lesión por presión · original 5–20.

Fórmula/criterios: Suma de los componentes seleccionados.

Una puntuación menor representa mayor riesgo. Interpretar con valoración clínica y protocolo del centro.

Fuente: [AHRQ · Norton original, 5–20](https://www.ahrq.gov/patient-safety/settings/hospital/resource/pressureulcer/tool/pu7b.html).

### Área rectangular de una lesión

**Herramienta local.** Largo × ancho · seguimiento de medidas.

Fórmula/criterios: Área rectangular = largo × ancho

Aproximación de superficie; no mide área real irregular, profundidad o volumen y no equivale a PUSH.

Fuente: [Análisis dimensional · cálculo de dosis](https://www.ncbi.nlm.nih.gov/books/NBK430836/).

### Escala de Braden

**Referencia externa; sin cálculo local.** Valoración de riesgo de lesión por presión.

Referencia externa; formulario no incorporado hasta revisar las condiciones de reproducción.

Fuente: [AHRQ · recurso Braden](https://www.ahrq.gov/patient-safety/settings/hospital/resource/pressureulcer/tool/pu7b.html).

### PUSH Tool

**Referencia externa; sin cálculo local.** Seguimiento de lesiones por presión.

NPIAP exige autorización para incorporarlo a programas externos. Se enlaza el recurso; no se reproduce el instrumento.

Fuente: [NPIAP · PUSH y condiciones de uso](https://learn.npiap.com/products/push-tool-1).

## Respiratorio

### Cociente PaO₂/FiO₂

**Herramienta local.** PaO₂ arterial y fracción inspirada.

Fórmula/criterios: P/F = PaO₂ / (FiO₂ % / 100)

No clasifica SDRA por sí solo: requiere otros criterios y contexto de soporte respiratorio. No introducir SpO₂ en lugar de PaO₂.

Fuente: [NHLBI · protocolo ARDSNet](https://biolincc.nhlbi.nih.gov/media/studies/factt/Protocol.pdf).

### Volumen tidal por peso predicho

**Herramienta local.** PBW ARDSNet · coeficiente introducido por el usuario.

Fórmula/criterios: PBW = 50 (H) o 45,5 (M) + 0,91 × (talla − 152,4); VT = PBW × mL/kg

Adultos. Usa peso predicho, no peso real. No selecciona parámetros del ventilador ni sustituye vigilancia de presiones.

Fuente: [NHLBI · protocolo ARDSNet](https://biolincc.nhlbi.nih.gov/media/studies/factt/Protocol.pdf).

### CURB-65

**Herramienta local.** Neumonía comunitaria en adultos.

Fórmula/criterios: Suma de los componentes seleccionados.

Aplicar tras diagnóstico clínico de neumonía comunitaria. Urea no es BUN. No determina por sí sola ingreso o tratamiento.

Fuente: [NICE NG250 · CURB-65](https://www.nice.org.uk/guidance/ng250/chapter/recommendations).

### Gasometría · fórmula de Winter

**Herramienta local.** Compensación esperada en acidosis metabólica.

Fórmula/criterios: PaCO₂ esperada = 1,5 × HCO₃ + 8 ± 2 mmHg

Solo cuando se ha identificado acidosis metabólica. No es una interpretación completa de gasometría ni diagnostica trastornos mixtos.

Fuente: [MSD · equilibrio ácido-base y Winter](https://www.merckmanuals.com/en-ca/professional/nephrology/acid-base-regulation-and-disorders/acid-base-disorders).

## Dolor y sedación

### Dolor · escala numérica

**Herramienta local.** Intensidad autorreferida de 0 a 10.

Fórmula/criterios: Registro de la intensidad numérica comunicada por la persona

No es una EVA visual continua ni una escala observacional. No inferir dolor si la persona no puede comunicarlo.

Fuente: [Vanderbilt · recursos RASS](https://www.icudelirium.org/medical-professionals/downloads/resources-by-date-added).

### Escala RASS

**Herramienta local.** Agitación y sedación · de −5 a +4.

Fórmula/criterios: Puntuación de la respuesta observada; observar → voz → estímulo físico según protocolo

Requiere evaluación estructurada. No convierte el resultado en una indicación de sedación.

Fuente: [Vanderbilt · recursos RASS](https://www.icudelirium.org/medical-professionals/downloads/resources-by-date-added).

### CPOT

**Referencia externa; sin cálculo local.** Dolor en personas que no pueden comunicarlo.

Referencia externa; formulario observacional pendiente de revisar traducción y reproducción.

Fuente: [Vanderbilt · CPOT](https://www.icudelirium.org/medical-professionals/downloads/resources-by-date-added).

## Obstetricia y neonatal

### Test de Apgar

**Herramienta local.** Cinco componentes · registrar minuto de evaluación.

Fórmula/criterios: Suma de los componentes seleccionados.

No esperar a obtener Apgar para iniciar reanimación. No predice por sí solo el resultado individual ni establece asfixia.

Fuente: [ACOG/AAP · Apgar](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/10/the-apgar-score).

### Índice de Bishop

**Herramienta local.** Versión original con borramiento · 0–13.

Fórmula/criterios: Suma de los componentes seleccionados.

No es Bishop modificado con longitud cervical. Requiere exploración y no propone inducción.

Fuente: [Bishop original · tabla del estudio Laughon et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297470/).

## Valoración general

### NEWS2

**Referencia externa; sin cálculo local.** Deterioro clínico · escalas de saturación 1 y 2.

Se enlaza el material oficial completo. No se implementa una variante parcial ni se elige automáticamente la escala de saturación.

Fuente: [Royal College of Physicians · NEWS2](https://rcp.ac.uk/resources/national-early-warning-score-news-2/).

## Verificación

30 pruebas automáticas superadas, incluidas conversiones de dosis, fronteras de puntuaciones, componentes no valorables, casos con resultado cero/negativo, valores inválidos y dominio logarítmico. Se requiere revisión profesional adicional de la población, la traducción y los criterios antes de uso asistencial.

En navegador se verificaron búsqueda por GCS, filtros por especialidad, favoritos tras recarga, Glasgow con NT sin total, balance negativo, invalidación del resultado al editar y representación científica de un resultado pequeño. Las referencias externas no muestran un formulario de cálculo. No hubo errores en la consola. Layout móvil sin desbordamiento horizontal. Tras apagar el servidor local se recargó la app y se calculó una duración de 2 h para 250 mL a 125 mL/h. Esta prueba verifica el App Shell y cálculos locales sin servidor; Safari/iPhone real y desconexión completa de red siguen pendientes.
