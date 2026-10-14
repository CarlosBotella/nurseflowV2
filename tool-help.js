// Explicaciones educativas que acompañan a cada herramienta de tool-catalog.js.
// Los ejemplos son aritmética ilustrativa, nunca instrucciones de tratamiento para un paciente.

// what: para qué sirve; read: cómo leer el resultado; example: ejemplo opcional.
const guide = (what, read, example = '') => ({ what, read, example });
// Ayuda general por identificador de herramienta.
export const TOOL_HELP = {
  flow: guide(
    'Convierte un volumen y su duración en la cantidad de líquido que pasa cada hora. Sirve para comprobar una velocidad de infusión ya indicada.',
    'mL/h significa mililitros por hora. El número describe una velocidad, no la dosis de un medicamento.',
    '500 mL durante 240 minutos: 125 mL/h.'
  ),
  drip: guide(
    'Calcula cuántas gotas deben caer por minuto en una infusión por gravedad, usando el factor del equipo.',
    'Las gotas/min dependen del equipo: dos equipos pueden dar distinta cantidad de gotas para el mismo volumen. Se muestra el valor exacto y el redondeo.',
    '120 mL en 60 minutos con un equipo de 20 gotas/mL: 40 gotas/min.'
  ),
  dose: guide(
    'Calcula el volumen que contiene una dosis prescrita cuando conoces cuánto fármaco hay en un volumen disponible.',
    'El resultado es un volumen en mL. No indica qué dosis debería recibir una persona. Las unidades de masa se convierten antes de dividir.',
    'Dosis de 350 mg; preparación con 500 mg en 2 mL: volumen de 1,4 mL.'
  ),
  duration: guide(
    'Calcula el tiempo que tarda en pasar un volumen a una velocidad constante. Puede utilizarse con el volumen que queda por infundir.',
    'Se expresa el mismo tiempo en horas y minutos; no son dos tiempos que haya que sumar.',
    '250 mL a 125 mL/h duran 2 horas, equivalentes a 120 minutos.'
  ),
  pump: guide(
    'Convierte una velocidad de dosis prescrita por kilogramo de peso en mL/h, teniendo en cuenta la concentración final.',
    'El peso y la concentración cambian la conversión. El cálculo no selecciona el fármaco, la pauta ni una velocidad clínicamente adecuada.',
    'Revisa las unidades: mcg/kg/min y mg/kg/h no representan la misma cantidad por hora.'
  ),
  reversePump: guide(
    'Permite comprobar qué cantidad de fármaco por kilogramo y por unidad de tiempo corresponde a una velocidad en mL/h.',
    'Es la conversión inversa de la perfusión por peso. El resultado describe la dosis correspondiente a los datos introducidos, no una recomendación.'
  ),
  concentration: guide(
    'Relaciona la cantidad total de fármaco con el volumen final de una preparación.',
    'mg/mL indica cuántos miligramos hay en cada mililitro. Volumen final incluye el volumen de todos los componentes.',
    '1 g de fármaco en un volumen final de 100 mL: 10 mg/mL.'
  ),
  dilution: guide(
    'Calcula el volumen de una solución inicial necesario para obtener una concentración objetivo en un volumen final.',
    'Se muestran por separado la solución inicial y el diluyente. Su suma da el volumen final, bajo el supuesto de volúmenes aditivos. No se verifica compatibilidad.',
    'Solución inicial 10 mg/mL, objetivo 2 mg/mL y volumen final 50 mL: 10 mL de solución inicial y 40 mL de diluyente.'
  ),
  convert: guide(
    'Expresa la misma cantidad en otra unidad de la misma magnitud: masa, volumen, tiempo o presión.',
    'Cambiar unidades no cambia la cantidad. No es posible convertir mg en mL sin conocer una concentración; eso se calcula en otra herramienta.',
    '1 mg equivale a 1000 mcg. Aquí se escriben los números sin separadores de miles.'
  ),
  bmi: guide(
    'El índice de masa corporal relaciona peso y talla para describir el tamaño corporal en adultos.',
    'Se expresa en kg/m². No mide directamente grasa corporal ni describe por sí solo el estado nutricional; necesita contexto.',
    '81 kg y 180 cm producen un IMC de 25 kg/m².'
  ),
  bsa: guide(
    'Estima la superficie externa del cuerpo a partir de peso y talla mediante la fórmula de Mosteller.',
    'Se expresa en metros cuadrados (m²), no en kg ni como IMC. La superficie estimada no es una dosis de medicamento.',
    '80 kg y 180 cm producen una superficie de 2 m².'
  ),
  weightLoss: guide(
    'Expresa cuánto ha cambiado el peso actual respecto al peso habitual, como porcentaje.',
    'Un valor positivo indica pérdida, cero indica que no ha cambiado y un valor negativo indica ganancia. Valora además el período y si el cambio fue involuntario.',
    'De 80 a 72 kg: pérdida del 10 %. De 80 a 88 kg: −10 %, que indica ganancia.'
  ),
  harris: guide(
    'Estima el gasto energético en reposo a partir de edad, peso, talla y el coeficiente de sexo de la ecuación revisada de 1984.',
    'kcal/día expresa energía por día. Esta estimación no incluye actividad o factores de estrés y no equivale a una prescripción nutricional.'
  ),
  cg: guide(
    'Estima el aclaramiento de creatinina: un indicador calculado de eliminación renal de creatinina. Se utiliza la ecuación histórica de Cockcroft–Gault.',
    'El resultado es mL/min, sin normalización a 1,73 m². No es intercambiable con CKD-EPI. El tipo de peso utilizado y la estabilidad de la creatinina importan.'
  ),
  ckd: guide(
    'Estima la tasa de filtración glomerular (TFG), un indicador de la capacidad de filtración renal, con creatinina y la ecuación CKD-EPI 2021 para adultos.',
    'mL/min/1,73 m² significa que la estimación está normalizada a una superficie corporal de referencia. No equivale a mL/min absoluto ni establece por sí sola un diagnóstico renal.'
  ),
  urr: guide(
    'Expresa la reducción porcentual de la concentración de urea entre una muestra previa y una posterior a hemodiálisis.',
    'Un porcentaje mayor indica una reducción de urea mayor entre esas muestras. No resume por sí solo todos los aspectos de la adecuación de diálisis.',
    'Urea previa 100 y posterior 30, en la misma unidad: URR del 70 %.'
  ),
  ktv: guide(
    'Estima la dosis de depuración de urea de una sesión de hemodiálisis mediante spKt/V, variante monocompartimental de Daugirdas II.',
    'K representa depuración de urea, t tiempo y V volumen de distribución. Kt/V no tiene unidad. sp significa monocompartimental; no equivale a eKt/V ni a la dosis semanal. El muestreo influye en el cálculo.'
  ),
  child: guide(
    'Combina cinco parámetros clínicos y analíticos para resumir la gravedad de la enfermedad hepática en el contexto al que se aplica Child–Pugh.',
    'La suma se agrupa en clases A, B o C según la tabla de referencia. Las letras describen categorías de esta escala, no un diagnóstico completo ni un tratamiento.'
  ),
  balance: guide(
    'Compara todo el líquido registrado como ingreso con todo el registrado como egreso durante un intervalo concreto.',
    'Positivo: se han registrado más ingresos que egresos. Negativo: más egresos que ingresos. No equivale al cambio exacto de agua corporal si hay pérdidas o entradas sin registrar.',
    'Ingresos 1000 mL y egresos 1200 mL en 24 h: balance −200 mL.'
  ),
  urine: guide(
    'Relaciona la orina recogida con el peso corporal y el tiempo observado, para expresar una diuresis por kilogramo y hora.',
    'mL/kg/h significa mililitros de orina por cada kilogramo de peso y por cada hora. No diagnostica por sí sola una alteración renal.',
    '280 mL de orina en 8 h y peso de 70 kg: 0,5 mL/kg/h.'
  ),
  anion: guide(
    'Calcula la diferencia entre el sodio y la suma de cloro y bicarbonato. Es una herramienta de apoyo al estudio del equilibrio ácido-base.',
    'El anión gap es una diferencia calculada, no un ion medido directamente. Esta versión excluye potasio y no corrige por albúmina; usa la referencia de tu laboratorio.'
  ),
  map: guide(
    'Aproxima la presión arterial media a partir de las presiones sistólica y diastólica.',
    'La PAM resume la presión durante el ciclo cardíaco. La estimación no sustituye el valor medido por un monitor y puede ser menos precisa con frecuencias extremas.',
    'PAS 120 mmHg y PAD 60 mmHg: PAM aproximada de 80 mmHg.'
  ),
  shock: guide(
    'Relaciona frecuencia cardíaca y presión arterial sistólica como indicador hemodinámico auxiliar.',
    'Una razón mayor significa más frecuencia cardíaca en relación con la presión sistólica. No establece por sí sola que exista shock ni aplica un umbral universal.',
    '90 latidos/min y PAS 120 mmHg: índice 0,75.'
  ),
  cha: guide(
    'Resume factores asociados al riesgo de ictus o embolia en personas con fibrilación auricular mediante CHA₂DS₂-VASc.',
    'La cifra es una puntuación, no un porcentaje de probabilidad. Incluye el componente de sexo femenino de esta versión; no debe confundirse con CHA₂DS₂-VA.'
  ),
  chava: guide(
    'Resume factores de riesgo tromboembólico en fibrilación auricular utilizando CHA₂DS₂-VA, versión sin componente de sexo.',
    'La puntuación reúne edad y antecedentes concretos. No es un porcentaje ni una decisión automática sobre anticoagulación.',
    'La edad de 65–74 años aporta 1 punto; ≥75 aporta 2. Las dos bandas no se suman entre sí.'
  ),
  has: guide(
    'Reúne factores asociados al riesgo de sangrado en el contexto de anticoagulación mediante HAS-BLED.',
    'Un punto identifica cada componente seleccionado. La cifra no es un porcentaje y no ordena suspender anticoagulación; permite revisar factores y contexto clínico.'
  ),
  wells: guide(
    'Ordena hallazgos y antecedentes para estimar probabilidad clínica de trombosis venosa profunda (TVP) en el modelo de Wells de dos niveles.',
    '“Probable” o “poco probable” son categorías de probabilidad previa a las pruebas. Ninguna confirma o descarta TVP. Un diagnóstico alternativo igual de probable resta puntos.'
  ),
  gcs: guide(
    'Describe el nivel de respuesta de una persona mediante apertura ocular, respuesta verbal y respuesta motora.',
    'Comunica los tres componentes, no solo la suma. Si uno no se puede valorar, se registra NT y se conserva el desglose sin producir un total.',
    'E4, VNT, M6 significa apertura ocular espontánea, respuesta verbal no valorable y obediencia a órdenes; no tiene total calculable.'
  ),
  barthel: guide(
    'Describe el grado de ayuda necesario para actividades básicas de la vida diaria mediante la versión de Barthel de 0–100.',
    'Un valor mayor refleja mayor independencia en las actividades evaluadas. No demuestra por sí solo que la persona pueda vivir sola ni resume toda su autonomía.'
  ),
  morse: guide(
    'Reúne factores de riesgo de caídas, como antecedentes, marcha y reconocimiento de limitaciones.',
    'La cifra es una puntuación de riesgo, no la probabilidad de caerse. Los puntos de corte y las medidas se eligen según el protocolo del centro.'
  ),
  norton: guide(
    'Valora factores relacionados con riesgo de lesión por presión: estado físico y mental, actividad, movilidad e incontinencia.',
    'En Norton, una puntuación menor representa mayor riesgo: la dirección es importante. No es un diagnóstico de lesión ni sustituye la valoración de la piel.'
  ),
  wound: guide(
    'Obtiene un área rectangular de referencia a partir de largo y ancho de una lesión.',
    'Se expresa en cm². Una lesión irregular no tiene necesariamente esa superficie real; el cálculo no mide profundidad, volumen ni cicatrización.',
    'Largo de 2,5 cm y ancho de 4 cm: área rectangular de 10 cm².'
  ),
  pf: guide(
    'Relaciona la presión parcial de oxígeno arterial con la fracción de oxígeno inspirado para describir la oxigenación.',
    'PaO₂ es un dato de gasometría arterial; FiO₂ es la proporción de oxígeno inspirado. El cociente no clasifica por sí solo el síndrome de distrés respiratorio agudo.',
    'PaO₂ 80 mmHg y FiO₂ 40 %: cociente 200 mmHg. No se introduce 0,40 en el campo de porcentaje.'
  ),
  tidal: guide(
    'Convierte un coeficiente de volumen por kilogramo de peso corporal predicho en un volumen tidal, usando la talla y la ecuación ARDSNet.',
    'Volumen tidal es el volumen por respiración. PBW es peso predicho por talla y coeficiente de sexo, no el peso real medido. No selecciona una pauta de ventilación.'
  ),
  curb: guide(
    'Combina confusión, urea, frecuencia respiratoria, presión arterial y edad para valorar gravedad en neumonía comunitaria en adultos.',
    'La suma es una puntuación de CURB-65, no un porcentaje. Se aplica con un diagnóstico clínico y otros hallazgos; no decide por sí sola el lugar de atención.'
  ),
  winter: guide(
    'Estima la presión de CO₂ esperada por compensación respiratoria cuando ya se ha identificado una acidosis metabólica.',
    'La cifra central y los dos límites forman un intervalo esperado, no una medición de CO₂. Compararlo requiere la gasometría y el contexto; no es un análisis completo.',
    'HCO₃ de 12 mmol/L: PaCO₂ esperada central de 26 mmHg, con intervalo de 24–28 mmHg.'
  ),
  pain: guide(
    'Registra la intensidad de dolor que comunica la propia persona, utilizando una escala numérica de 0 a 10.',
    '0 corresponde a ausencia de dolor y 10 al extremo de dolor definido al explicar la escala a la persona. No es una escala observacional ni una EVA visual continua.'
  ),
  rass: guide(
    'Describe agitación y nivel de respuesta durante una evaluación estructurada de sedación y alerta.',
    'Los valores positivos describen agitación, 0 alerta tranquila y los negativos distintos niveles de disminución de respuesta. RASS no mide directamente intensidad de dolor.'
  ),
  apgar: guide(
    'Describe el estado del recién nacido en un momento concreto mediante color, frecuencia cardíaca, respuesta a estímulo, tono y respiración.',
    'El total debe acompañarse del minuto en que se obtuvo. No predice por sí solo el resultado individual ni se espera a calcularlo para iniciar reanimación.'
  ),
  bishop: guide(
    'Resume hallazgos de exploración cervical y la posición de la presentación fetal mediante Bishop original con borramiento.',
    'La cifra describe características relacionadas con maduración cervical en esta versión. No es una indicación automática de inducción ni se intercambia con Bishop modificado.'
  ),
  nrs: guide(
    'NRS-2002 es un instrumento de cribado nutricional hospitalario que considera afectación nutricional, gravedad de enfermedad y edad.',
    'Cribado significa identificar quién necesita una valoración más completa; no equivale a diagnosticar desnutrición. Aquí se abre el instrumento de referencia.'
  ),
  braden: guide(
    'Braden reúne dimensiones como sensibilidad, humedad, actividad y movilidad para valorar riesgo de lesión por presión.',
    'Riesgo de desarrollar una lesión no es lo mismo que gravedad de una lesión existente. Consulta el instrumento completo y el protocolo del centro.'
  ),
  push: guide(
    'PUSH es un instrumento de seguimiento de una lesión por presión a lo largo del tiempo.',
    'Se utiliza para evolución de una lesión, no para riesgo de aparición. Esta entrada abre el recurso oficial; la calculadora no reproduce el instrumento.'
  ),
  pfeiffer: guide(
    'El cuestionario de Pfeiffer es un cribado cognitivo basado en respuestas a preguntas estructuradas.',
    'El resultado necesita la versión y las correcciones correspondientes, incluida escolaridad. Un cribado no establece un diagnóstico de demencia.'
  ),
  nihss: guide(
    'NIHSS describe déficits neurológicos mediante una exploración estructurada utilizada en el contexto de ictus.',
    'Requiere las instrucciones y tareas completas de evaluación. No es una herramienta de autodiagnóstico ni sustituye una valoración urgente.'
  ),
  cam: guide(
    'CAM-ICU es un instrumento para evaluar delirium, que incluye curso del estado mental y pruebas de atención y pensamiento.',
    'Delirium es una alteración aguda del estado mental; no es sinónimo de demencia. El manual explica cómo realizar las pruebas y cuándo son evaluables.'
  ),
  cpot: guide(
    'CPOT valora conductas relacionadas con dolor en personas que no pueden comunicarlo de forma fiable.',
    'El resultado observacional no se intercambia con la intensidad de dolor autorreferida de 0–10. Se necesita aplicar los criterios completos del instrumento.'
  ),
  news: guide(
    'NEWS2 combina parámetros fisiológicos y estado de conciencia para ayudar a identificar deterioro clínico.',
    'La puntuación se interpreta con el protocolo de respuesta del centro. Las escalas de saturación tienen condiciones de aplicación; no se elige una por conveniencia.'
  )
};

// Ayuda de cada campo por su nombre, común a todas las herramientas.
const COMMON = {
  volume:
    'Cantidad de líquido en mililitros. Comprueba si la herramienta pide volumen total, restante o final.',
  minutes: 'Tiempo en minutos. Convierte las horas antes de introducirlo: 1 hora = 60 minutos.',
  hours: 'Tiempo en horas. Puedes usar decimales: 30 minutos = 0,5 horas.',
  factor:
    'Número de gotas que el equipo produce por cada mL. Se obtiene del envase del equipo, no del medicamento.',
  rate: 'Velocidad de paso de líquido en mL/h: cuántos mililitros pasan durante una hora.',
  weight: 'Peso en kilogramos; no en gramos ni libras. Revisa qué tipo de peso exige esta fórmula.',
  height: 'Talla en centímetros: por ejemplo, 1,70 m se introduce como 170 cm.',
  age: 'Edad en años cumplidos. Estas ecuaciones para adultos no aplican una adaptación pediátrica.',
  sex: 'Selecciona el coeficiente de sexo previsto por esta ecuación; cambia sus constantes. No se deduce automáticamente.',
  prescribed: 'Cantidad de fármaco indicada en la prescripción. Es una masa, no un volumen en mL.',
  prescribedUnit: 'Unidad de la dosis prescrita: g, mg o mcg. 1 g = 1000 mg; 1 mg = 1000 mcg.',
  available:
    'Cantidad de fármaco contenida en el volumen disponible. Copia la concentración de la presentación correctamente.',
  availableUnit:
    'Unidad de la cantidad de fármaco disponible. Puede ser distinta a la prescrita; la app hace la conversión de masa.',
  doseRate:
    'Cantidad prescrita por kilogramo de peso y por unidad de tiempo. No es una cantidad total aislada.',
  rateUnit:
    'mcg/kg/min son microgramos por kg y minuto; mg/kg/h son miligramos por kg y hora. No son unidades intercambiables sin conversión.',
  concentration:
    'Miligramos presentes en cada mililitro de la preparación final. No uses la concentración del vial si la preparación se ha diluido.',
  mass: 'Cantidad total de fármaco presente en la preparación. Selecciona la unidad en el campo siguiente.',
  massUnit:
    'mcg son microgramos, mg miligramos y g gramos. La app expresa después la concentración en mg/mL.',
  initial: 'Cantidad de fármaco por mL de la solución de partida, antes de añadir diluyente.',
  target:
    'Cantidad por mL que se desea obtener según una indicación ya establecida. Diluir no permite aumentar la concentración.',
  finalVolume:
    'Volumen total de la mezcla al terminar, incluyendo solución de partida y diluyente; no solo el volumen añadido.',
  value:
    'Cantidad que quieres convertir. Escribe coma o punto decimal y omite separadores de miles.',
  from: 'Unidad en la que está expresado el dato original.',
  to: 'Unidad en la que quieres ver la misma cantidad. Debe medir la misma magnitud que la de origen.',
  usual:
    'Peso de referencia con el que comparas el peso actual. Anota por separado cuándo se midió y si la pérdida fue involuntaria.',
  creatinine:
    'Creatinina medida en sangre, no en orina. Es un dato de laboratorio; copia el valor y la unidad del mismo informe.',
  creatinineUnit:
    'mg/dL y µmol/L son formas distintas de expresar creatinina. La app convierte µmol/L dividiendo entre 88,4.',
  pre: 'Concentración de urea de la muestra previa a hemodiálisis. Usa el protocolo de muestreo y la misma unidad que en la muestra posterior.',
  post: 'Concentración de urea de la muestra posterior a hemodiálisis. No intercambies las muestras ni mezcles urea y BUN.',
  uf: 'Volumen de líquido retirado por ultrafiltración durante la sesión, en litros. No es el volumen de dializado.',
  postWeight:
    'Peso medido al terminar esa sesión, en kg. No sustituyas este dato por un peso objetivo sin comprobar el protocolo.',
  bilirubin:
    'Bilirrubina total del análisis, en mg/dL. No introducir bilirrubina directa ni un valor en µmol/L sin convertirlo.',
  albumin: 'Concentración de albúmina en sangre. Aquí se pide g/dL; 35 g/L equivalen a 3,5 g/dL.',
  inr: 'Razón internacional normalizada: una forma estandarizada de expresar el tiempo de protrombina. No tiene unidad y no es el TTPa.',
  ascites:
    'Líquido acumulado en la cavidad abdominal. El grado de esta escala requiere valoración clínica, incluida su respuesta al tratamiento.',
  encephalopathy:
    'Alteración neuropsiquiátrica atribuida a enfermedad hepática y graduada clínicamente. No equivale a cualquier episodio de confusión.',
  intake:
    'Suma de las entradas de líquido registradas durante ese intervalo, por las vías que incluya el protocolo.',
  output:
    'Suma de las salidas registradas en el mismo intervalo: por ejemplo, orina y drenajes. No añadas estimaciones no recogidas en el protocolo.',
  urine:
    'Volumen total de orina recogido durante el tiempo indicado. No es toda la suma de egresos del balance.',
  sodium:
    'Concentración de sodio del análisis en mmol/L. Usa valores del mismo contexto analítico que cloro y bicarbonato.',
  chloride:
    'Concentración de cloro del análisis en mmol/L; se suma al bicarbonato para este cálculo.',
  bicarbonate:
    'HCO₃⁻ es bicarbonato, componente del equilibrio ácido-base. Introduce el valor en mmol/L, no el pH.',
  sbp: 'Presión arterial sistólica (PAS): la cifra superior de una lectura de presión, en mmHg.',
  dbp: 'Presión arterial diastólica (PAD): la cifra inferior de una lectura de presión, en mmHg.',
  heartRate:
    'Número de latidos por minuto. Utiliza una medición del mismo momento que la presión arterial.',
  heart:
    'Antecedente de insuficiencia cardíaca o disfunción ventricular según los criterios de la escala, no cualquier enfermedad del corazón.',
  hypertension:
    'Antecedente de hipertensión según los criterios de la escala; no lo deduzcas de una sola lectura aislada.',
  diabetes:
    'Diagnóstico de diabetes según la historia clínica; no equivale a una glucemia aislada alta.',
  stroke:
    'Antecedente clínico documentado de ictus. Revisa en la etiqueta si esta escala incluye además AIT o embolia arterial.',
  vascular:
    'Enfermedad vascular según la definición de la escala, como infarto previo o enfermedad arterial periférica. No equivale a cualquier factor de riesgo.',
  eye: 'Evalúa cómo se abren los ojos: espontáneamente, a sonido o a presión. Usa NT si existe una interferencia que impide valorarlo.',
  verbal:
    'Evalúa la respuesta verbal siguiendo los criterios de Glasgow. Si la intubación impide evaluarla, no asignar 1 por defecto: registrar NT.',
  motor:
    'Evalúa la mejor respuesta motora observada siguiendo el procedimiento de Glasgow. NT significa que no se puede valorar, no ausencia de respuesta.',
  length:
    'Longitud máxima de la lesión en cm. Utiliza la misma técnica de medida si comparas registros sucesivos.',
  width:
    'Ancho medido perpendicular al largo, en cm. El producto ofrece un rectángulo de referencia, no un trazado exacto del borde.',
  pao2: 'PaO₂: presión parcial de oxígeno en sangre arterial, obtenida en gasometría y expresada aquí en mmHg. No es SpO₂ ni PaCO₂.',
  fio2: 'FiO₂: porcentaje de oxígeno inspirado conocido para esa medición. Aire ambiente: aproximadamente 21 %. No deducir automáticamente FiO₂ de un caudal de oxígeno.',
  mlkg: 'Volumen por respiración y por kg de peso predicho, según una indicación establecida. No se calcula con el peso real.',
  confusion:
    'Confusión de nueva aparición en el contexto de esta evaluación, no simplemente un deterioro cognitivo previo estable.',
  urea: 'Urea del análisis en mmol/L. BUN mide nitrógeno ureico y tiene otro valor; no copiar BUN en este campo.',
  respRate:
    'Respiraciones completas por minuto. No confundir con la frecuencia cardíaca ni con saturación de oxígeno.',
  pain: 'Número comunicado por la persona tras explicarle los extremos de la escala. No estimarlo por su aspecto si no puede responder.',
  rass: 'Respuesta de agitación o alerta observada siguiendo la secuencia de RASS. Si no conoces el procedimiento, consulta la fuente completa.',
  minute:
    'Tiempo transcurrido desde el nacimiento cuando se realiza esa evaluación. Se informa junto al Apgar y no suma puntos.',
  color:
    'Coloración observada según los criterios de Apgar; revisa las condiciones de la evaluación y no sustituyas el componente por una saturación.',
  pulse:
    'Frecuencia cardíaca del recién nacido en latidos/min, no la de la persona que ha dado a luz.',
  reflex:
    'Respuesta del recién nacido al estímulo del procedimiento de evaluación. No es la respuesta motora de Glasgow.',
  tone: 'Tono y actividad muscular observados: desde flacidez hasta movimiento activo, según Apgar.',
  breath:
    'Respiración observada del recién nacido en ese momento. No esperar al total de Apgar para actuar si necesita reanimación.',
  dilation: 'Apertura del cuello uterino en cm, determinada por exploración clínica.',
  effacement:
    'Porcentaje de acortamiento o borramiento cervical. Esta versión no utiliza longitud cervical en cm.',
  station:
    'Nivel de la presentación fetal respecto a las espinas ciáticas: los valores negativos están por encima y los positivos por debajo.',
  consistency:
    'Consistencia del cuello uterino apreciada en la exploración: firme, intermedia o blanda.',
  position: 'Orientación del cuello uterino en la exploración: posterior, media o anterior.'
};
// Ayuda de campos específica de una herramienta; prevalece sobre COMMON.
const SPECIFIC = {
  flow: {
    volume: 'Volumen total que se ha indicado infundir, en mL. No es la cantidad de fármaco en mg.'
  },
  duration: {
    volume:
      'Volumen que falta por pasar, o volumen total si calculas desde el inicio. La velocidad debe corresponder a ese intervalo.'
  },
  dose: {
    volume:
      'Volumen que contiene exactamente la cantidad de fármaco disponible del campo anterior. Ejemplo: si hay 500 mg en 2 mL, introduce 2.'
  },
  concentration: {
    volume:
      'Volumen final completo en el que está contenida la cantidad de fármaco, incluyendo todos los componentes.'
  },
  cg: {
    weight:
      'Peso que corresponda aplicar según el protocolo y la situación corporal. La app no decide entre peso real, ideal o ajustado.'
  },
  ktv: {
    hours:
      'Duración de esa sesión de hemodiálisis en horas. No es el tiempo entre la muestra previa y otra sesión distinta.'
  },
  balance: {
    hours:
      'Duración del intervalo al que pertenecen tanto ingresos como egresos. Introduce 24 solo si el registro cubre 24 horas.'
  },
  urine: {
    hours:
      'Horas durante las que se recogió el volumen de orina del primer campo. Los datos deben cubrir el mismo intervalo.'
  },
  has: {
    hypertension:
      'En HAS-BLED este componente se refiere a presión sistólica no controlada >160 mmHg, no solo a tener un diagnóstico de hipertensión.',
    renal:
      'Comprueba los criterios de HAS-BLED de la etiqueta. La función renal anormal y la hepática anormal se puntúan por separado.',
    liver:
      'LSN es límite superior de normalidad del laboratorio. AST y ALT son transaminasas; FA aquí significa fosfatasa alcalina. Se deben comprobar los criterios conjuntos.',
    bleeding:
      'Antecedentes de sangrado relevante o predisposición según la escala. No marcar por cualquier hematoma aislado sin revisar el criterio.',
    labile:
      'INR lábil es control inestable. TTR significa tiempo en rango terapéutico, expresado como porcentaje de tiempo con INR en el objetivo establecido.',
    elderly:
      'Este componente aplica estrictamente a edad mayor de 65 años en la versión utilizada.',
    drugs:
      'AINE son antiinflamatorios no esteroideos; los antiagregantes actúan sobre plaquetas. Revisa los tratamientos concomitantes según la escala.',
    alcohol:
      'Cantidad habitual expresada según las unidades de bebida de la escala. No equivale al número de vasos sin considerar su contenido.'
  },
  wells: {
    cancer:
      'Cáncer activo según la ventana temporal o situación paliativa descrita en la etiqueta.',
    paralysis:
      'Pérdida o disminución de movimiento de una extremidad inferior, o inmovilización en yeso, según el criterio.',
    bed: 'Comprueba tanto duración del encamamiento como fecha, tipo de cirugía y anestesia; no toda intervención cumple el criterio.',
    tender:
      'Dolor a la exploración localizado en el recorrido del sistema venoso profundo, no cualquier dolor de pierna.',
    leg: 'Hinchazón que afecta a toda la pierna sintomática; no se refiere solo a la pantorrilla.',
    calf: 'Diferencia entre ambas pantorrillas medida en el lugar indicado, no el perímetro total de una sola pierna.',
    edema:
      'Edema con fóvea deja una depresión tras presionar. Aquí debe limitarse a la pierna sintomática según el criterio.',
    veins: 'Venas colaterales superficiales visibles que no son varices habituales.',
    previous:
      'TVP previa documentada: trombosis venosa profunda, no simplemente antecedentes de varices.',
    alternative:
      'Juicio clínico sobre si otra causa explica los hallazgos al menos igual de bien. Al seleccionarla se restan 2 puntos, no se suman.'
  },
  barthel: {
    food: 'Valora si necesita ayuda personal para comer una vez preparada la comida. La ayuda para cortar o untar corresponde a una opción específica.',
    bath: 'Valora si realiza el baño o ducha sin ayuda personal. No se trata de si existe acceso a una ducha.',
    dress:
      'Considera ponerse y quitarse la ropa y cierres habituales; indica cuánta parte puede realizar sin ayuda.',
    groom: 'Aseo como cara, manos, dientes y peinado según el instrumento. No es el baño completo.',
    bowel:
      'Control de deposiciones según el período y criterios del instrumento. Revisa allí qué se considera un accidente ocasional.',
    bladder:
      'Control de micción o manejo autónomo del dispositivo según Barthel. No basta con indicar que lleva una sonda.',
    toilet:
      'Capacidad para utilizar el retrete, manejar ropa e higiene, con o sin ayuda según las opciones.',
    transfer:
      'Paso entre cama y silla y capacidad de mantenerse sentado. La ayuda mínima y la gran ayuda se distinguen en el instrumento.',
    walk: 'Capacidad de desplazarse al menos la distancia de referencia, distinguiendo caminar y usar silla de ruedas.',
    stairs: 'Capacidad para subir y bajar escaleras y necesidad de ayuda o supervisión.'
  },
  morse: {
    fall: 'Presencia de caída actual o antecedente dentro del período que aplique el instrumento/protocolo del centro.',
    diagnosis:
      'Dos o más diagnósticos médicos en la historia, no la suma de síntomas o de fármacos.',
    aid: 'Distingue ayuda personal, ayudas técnicas como andador y apoyo en muebles. Cada situación puntúa distinto.',
    iv: 'Presencia de vía o terapia intravenosa, incluido el acceso descrito por el instrumento.',
    gait: 'Calidad de la marcha observada. Consulta los criterios completos que diferencian marcha débil y alterada.',
    mental:
      'Si reconoce sus propias limitaciones al movilizarse. No es una puntuación general de orientación o memoria.'
  },
  norton: {
    physical:
      'Valoración global del estado físico según Norton original. No elegir la opción a partir de una sola constante.',
    mental:
      'Estado mental en el momento de evaluar: alerta, apatía, confusión o estupor según los criterios de la escala.',
    activity:
      'Actividad que efectivamente realiza: caminar, caminar con ayuda, permanecer en silla o en cama.',
    mobility:
      'Capacidad de cambiar o controlar la posición corporal. No es lo mismo que la actividad de caminar.',
    continence: 'Frecuencia y tipo de incontinencia: urinaria, fecal o ambas según las opciones.'
  }
};
/** Texto de ayuda de un campo: el específico de la herramienta o, si no existe, el común. */
export function fieldHelp(tool, field) {
  const help = SPECIFIC[tool.id]?.[field.name] || COMMON[field.name];
  if (!help) throw new Error(`Falta ayuda para ${tool.id}.${field.name}`);
  return help;
}
// Fuentes de las explicaciones de términos: [título, URL].
export const HELP_SOURCES = [
  ['MedlinePlus · INR', 'https://medlineplus.gov/lab-tests/prothrombin-time-test-and-inr-ptinr/'],
  [
    'MedlinePlus · gasometría arterial',
    'https://medlineplus.gov/lab-tests/arterial-blood-gas-abg-test/'
  ],
  [
    'NIDDK · hemodiálisis',
    'https://www.niddk.nih.gov/health-information/kidney-disease/kidney-failure/hemodialysis'
  ]
];
