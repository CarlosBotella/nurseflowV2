# NurseFlowV2 — versión 0.3 · Calculadoras explicadas

PWA de enfermería sin backend, sin dependencias de producción y con IndexedDB local.
Prototipo sin validar para uso asistencial. Ver [arquitectura](ARCHITECTURE.md).

## Probar localmente

Desde esta carpeta, con Python instalado:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:4173`. No abrir `index.html` mediante `file://`: los módulos
y el Service Worker requieren un origen web. Esperar el mensaje «Aplicación preparada
para uso offline» antes de desconectar. Solo consultas CIMA cacheadas previamente
pueden funcionar sin red; los enlaces externos no se descargan.

## Publicar en GitHub Pages gratuitamente

1. Crear un repositorio público y subir **el contenido de esta carpeta** a su raíz.
2. En Settings → Pages, seleccionar Deploy from a branch, rama main, carpeta / (root).
3. Abrir la URL HTTPS indicada por GitHub. No requiere dominio comprado ni compilación.
4. En iOS, usar Compartir → Añadir a pantalla de inicio y abrir como aplicación web.

No subir casos, exportaciones JSON, referencias `sources/` ni otros archivos del
proyecto ChatGPT. El código contiene solo la aplicación y documentación.

Con cada cambio de recursos precacheados, incrementar `VERSION` en `sw.js`.
No cambia automáticamente pestañas con trabajo abierto; cerrar todas para activar
la siguiente versión. Nunca eliminar IndexedDB como parte de la actualización.

## Incluido

- Interfaz adaptable con cuatro pestañas, temas y metadatos iOS.
- CRUD de casos con guardado **manual**, búsqueda y confirmación de cambios pendientes.
- Favoritos de medicamentos y exportación/importación local sin sobrescribir registros.
- Catálogo de 40 calculadoras/escalas locales en 12 categorías, buscador, filtros
  por especialidad y favoritos guardados en IndexedDB. Ver [catálogo y fuentes](CALCULATORS.md).
- 8 entradas de referencia externa, claramente diferenciadas de las calculadoras locales.
- Explicaciones para las 48 entradas, ejemplos educativos, lectura de resultados y
  ayudas específicas en los 156 campos, también disponibles offline. Los inputs
  enlazan su explicación con `aria-describedby` para lectores de pantalla.
- Búsqueda CIMA por nombre/principio activo, detalle, secciones oficiales y notas.
- App Shell offline y caché temporal de hasta 60 consultas CIMA, con fecha y aviso.

## Pendiente

Autoguardado de borradores, descarga permanente de documentos, OCR local,
apartado Estudiar, historial opcional, suministro por presentación y validación en iPhone real.
Braden, PUSH, NRS-2002, Pfeiffer, NIHSS, CAM-ICU, CPOT y NEWS2 se enlazan a sus
recursos; sus formularios completos no están incorporados. PUSH requiere autorización
de NPIAP para incorporarlo a programas externos. Las fórmulas implementadas y las
escalas traducidas no han recibido validación clínica independiente del producto.
Un favorito conserva identificación, **no garantiza que su ficha esté descargada**.
Este sprint no ha publicado nada ni configurado una cuenta GitHub.

## Pruebas

Con Node.js instalado:

```sh
node --test tests/*.test.mjs
```

## Privacidad

Las notas permanecen en el navegador. El texto libre debe estar anonimizado.
Las búsquedas de medicamentos se envían a AEMPS; GitHub sirve los recursos estáticos.
No hay analítica propia. Copias JSON sin cifrar: conservar bajo control del usuario.
La persistencia del navegador no sustituye las copias de seguridad.
Los valores introducidos en calculadoras no se guardan ni se envían a terceros.
Los favoritos de herramientas se conservan como una preferencia local en IndexedDB;
las copias actuales exportan casos y favoritos de medicamentos, no preferencias.


## Actualización 0.4: Worker y casos rápidos

La aplicación usa `https://nurseflow-api.carlosb-n.workers.dev/` mediante `api.js`, sin credenciales en el cliente. En Cloudflare, configurar `ALLOW_LOCALHOST=true` para `http://localhost:4173` y `http://127.0.0.1:4173`; en producción, configurar el origen exacto de GitHub Pages (sin ruta). El endpoint `/health` no verifica la conexión con la OMS ni autoriza las búsquedas.

- CIMA: búsqueda conjunta por nombre y principio activo, hasta 50 resultados, sin paginación porque el Worker actual no la expone. Detalle con secciones, notas, materiales y suministro. Un recurso `null` indica consulta fallida, nunca ausencia de alertas.
- Casos: título obligatorio, síntomas seleccionables y personalizados, diagnóstico CIE-11 opcional con estado no confirmado por defecto. Confirmación registrada por el usuario, sin inferencia clínica. Contexto, cuidados y etiquetas se muestran bajo «Ampliar el caso».
- Los síntomas rápidos son etiquetas locales de observación, no una relación enfermedad→síntomas extraída de CIE-11. Los diagnósticos muestran descripciones solo cuando la OMS las devuelve.
- Búsqueda local por síntomas, diagnóstico, código, etiquetas y notas, sin distinción de acentos, combinando todas las palabras.
- IndexedDB v1 admite los nuevos campos sin migración destructiva. Casos anteriores e importaciones previas siguen admitidos; exportación/importación conserva los nuevos campos.
- App Shell v9 incluye todos los módulos. Referencias CIMA/CIE-11 se almacenan temporalmente (60 consultas) y se marcan con fecha y aviso al utilizar una copia local. Los casos nunca se envían al Worker.

Tras actualizar, guardar el trabajo, cerrar las pestañas de la app y abrirla de nuevo para activar el Service Worker nuevo.

Verificación: 43 pruebas automatizadas de cálculos, validación de casos, cliente y Worker; guardado, recarga y búsqueda por síntomas comprobados en navegador con un caso ficticio. La API desplegada devuelve 403 al origen localhost en la comprobación actual, por lo que la conexión real CIMA/CIE-11 queda pendiente de habilitar ese origen.


### Corrección 0.4.1
La política CSP autoriza el Worker en connect-src y la caché del App Shell pasa a v10. Se ha añadido una prueba de coherencia entre API_BASE y CSP. Búsquedas reales CIE-11 (neumonía) y CIMA (paracetamol) verificadas dentro de la app desde el navegador después de corregir la copia servida en Desktop/pruebaGPT/v1. El Worker ya admite los dos orígenes locales. Para activar la actualización, guardar y cerrar todas las pestañas de la app de ese origen, y abrir de nuevo.


## 0.5: Información del diagnóstico desde APIs

Se utiliza CIE-11 y la API XML de MedlinePlus, sin plantillas ni catálogo clínico de síntomas en el código. Requiere desplegar el archivo `worker/nurseflow-worker.mjs` (versión 2.1), que añade `/medline/search?q=...`, sin nuevas claves. Se conservan los secretos y orígenes del Worker anterior. Su estado `/health` debe listar `/medline/search`.

Al elegir diagnóstico, se buscan artículos españoles. Solo la coincidencia exacta con título o alias se asocia automáticamente; las coincidencias aproximadas necesitan selección del usuario. Se puede ajustar el término de búsqueda sin modificar el diagnóstico. El enlace con MedlinePlus es por texto, no una equivalencia validada entre códigos.

`clinical-reference.js` interpreta el XML y divide el resumen por sus encabezados reales. Solo listas bajo encabezados de síntomas/signos se ofrecen como casillas, inicialmente sin marcar; no se convierten tratamientos o complicaciones en síntomas. Cuando no hay estructura identificable, se conserva el texto sin generar listas. No se infieren hechos del paciente ni tratamientos personalizados. Orphadata no está integrado en esta versión.

`clinicalReference` guarda título, URL, resumen recibido y fecha en IndexedDB junto al caso y en sus copias exportadas. Los antiguos casos y sus síntomas se conservan. Caché de consultas MedlinePlus de 12 horas (Worker y PWA), conforme a la recomendación NLM; app shell v11. Fuentes siempre visibles. No se envían casos, notas ni síntomas marcados al Worker.

Verificación: 47 pruebas automatizadas; 9 comprobaciones en navegador del parser con una respuesta real de MedlinePlus y pruebas de importación, guardado y recuperación de la ficha. La nueva ruta aún requiere despliegue en Cloudflare; no se afirma una prueba end-to-end con el Worker desplegado.


## 0.6: OCR e imágenes revisadas

Casos → Imágenes del caso → Elegir imagen → Detectar texto (OCR). Motor Tesseract.js 6.0.1 y modelo español incluidos localmente; ninguna imagen se envía a APIs, al Worker o a un servicio OCR. Los recursos públicos del motor se cachean al utilizarlos y no añaden peso a la precarga inicial del App Shell. Vendor completo: unos 32 MB; el navegador carga solo la variante de núcleo necesaria.

Por defecto se cubre todo el texto detectado con bloques opacos. El modo alternativo propone zonas por etiquetas y patrones de identificadores, correo, teléfonos y fechas; no detecta todos los nombres sin etiqueta. Se pueden dibujar rectángulos manuales, tapar cabecera/pie o toda la imagen y deshacer zonas manuales. No se detectan automáticamente rostros, QR ni códigos de barras. La herramienta no certifica anonimización. Confirmación de revisión obligatoria antes de adjuntar.

Se admiten JPG/PNG/WebP hasta 12 MB y 40 megapíxeles. La copia de trabajo se reduce a 1800 px de lado mayor. Se guarda un JPEG reencodificado, sin el nombre original del archivo ni los metadatos EXIF. No es un visor DICOM ni una herramienta de interpretación radiológica: la reducción/recompresión puede perder detalles. Máximo 5 imágenes revisadas por caso, hasta 3 millones de caracteres por imagen. Originales y texto OCR permanecen en memoria durante la edición; no se guardan. La confirmación es una revisión registrada por el usuario, no una garantía de anonimato.

Los casos anteriores siguen admitidos; exportación/importación incluye las imágenes revisadas. Límite de importación: 30 MB. Mantener copia de seguridad, teniendo en cuenta su tamaño. Sin cambios en el Worker. App Shell v13.

Verificación: 43 pruebas de aplicación y 1 prueba de caché OCR. Prueba real en navegador con imagen ficticia: detectadas cuatro líneas, confirmación exigida, imagen procesada adjuntada y recuperada después de recargar. Se comprobó ausencia de EXIF y píxeles negros en las zonas tapadas. La prueba completa con el servidor detenido no se pudo completar en el navegador integrado (se cerró la pestaña de prueba); la caché se verifica automáticamente, sin afirmar una prueba end-to-end offline.


### 0.6.1: revisión de propuestas OCR
Se usa segmentación sparse text (PSM 11), confianza OCR y proporción de caracteres legibles para no ocultar automáticamente sombras leídas como símbolos. Las detecciones dudosas se muestran sin marcar y pueden contener datos personales; requieren revisión. Cada propuesta puede desmarcarse para recuperar los píxeles desde la copia de trabajo antes de adjuntar. Los datos personales identificados por patrón se proponen incluso con confianza baja. La línea siguiente solo se propone cuando hay una etiqueta sin valor y una línea espacialmente cercana; las etiquetas de lateralidad y técnica se conservan. Añadida detección por etiqueta EMAIL aunque el OCR confunda @. En la radiografía ficticia de prueba, ocho lecturas dudosas no se ocultaron y el modo de texto fiable dejó el área pulmonar sin bloques. App Shell v15.

## 0.7: Agenda y estudios opcionales

Agenda está en la barra inferior; Mis estudios se abre desde Más o Agenda. No se pregunta el perfil al abrir. La agenda sirve para clases, prácticas, turnos, exámenes, entregas y tutorías.

El catálogo UCV es una instantánea de 131 entradas de los planes 2025, 2022, 2018 y 2010, obtenida del plan oficial el 13/10/2026. En 2026–2027 conviven 2025 para primero/segundo y 2022 para tercero/cuarto; cada estudiante elige el plan de su matrícula. La selección permite combinar cursos y marcar repetición, sin dar por matriculado todo un curso. Los horarios de clases no se deducen del catálogo: dependen del grupo. Se consultan y seleccionan sin conexión.

Prácticas propone 15:00–22:00 y lunes a viernes, editables. El horario empieza provisional; requiere comprobar periodo, días y excepciones. No se precargan periodos del PDF porque algunas páginas contienen fechas contradictorias, ni festivos sin confirmar. Se admite repetición semanal, hasta 550 días, y exclusiones por fecha. Esta versión admite eventos del mismo día; turnos que crucen medianoche están pendientes. Horas previstas, horas manualmente anotadas y jornadas marcadas como registradas aparecen por separado. Ni las horas previstas ni una media prueban asistencia o aprobación. UCV Evalúa sigue siendo el registro oficial y no hay integración con su cuenta.

Se puede guardar un breve diario por jornada, indicar centro/tutor y crear pendientes. Una lista inicial administrativa se añade solo al pulsar su botón, sin fechas inventadas, y puede quitarse o ampliarse. Archivar un horario conserva su diario. Borradores de jornadas permanecen en memoria al cambiar el día o guardar otra jornada; se avisa antes de cerrar sin guardar. Exportación ICS para Apple Calendar u otra agenda, con horario Europe/Madrid convertido a UTC y sus cambios estacionales; es exportación manual, no sincronización ni notificaciones automáticas.

IndexedDB sube a v2 mediante una migración aditiva que conserva casos y favoritos. La copia JSON v2 incluye agenda, matrícula, jornadas y pendientes; admite importación de copias v1 sin sobrescribir registros existentes. App Shell v16 incluye los tres módulos nuevos. No hay cambios del Worker para esta función.

Comprobación: 53 pruebas automatizadas de aplicación, 9 comprobaciones de migración/copia con IndexedDB real y prueba visual móvil a 390 px. Se verificó matrícula mixta y repetición, horario recurrente 15–22, exclusión de un día (28 h previstas), anotación manual diferente (6,5 h realizadas) y conservación de otro borrador al guardar una jornada.

## 0.7.1: Importar y exportar datos

Acceso desde Más → Importar y exportar, y enlace directo en Casos. Seleccionar un JSON muestra un resumen antes de guardar; cancelar no modifica datos. La importación fusiona sin sobrescribir IDs o ajustes existentes, valida antes de abrir la transacción y no duplica la misma copia. Los errores se muestran en esta pantalla. Se mantiene el límite de 30 MB.

Admite NurseFlowV2 backup v1/v2/v3 y el formato anterior de NurseFlow (settings, cases, schedule, exceptions, etc.). Se ha probado con el archivo proporcionado nurseflow-backup-auto.json: reconoce nueve asignaturas del plan UCV 2025 por código y ocho horarios semanales; las asignaturas corresponden a segundo aunque el perfil del archivo indique primero. El catálogo determina la selección de curso, sin activar onboarding. Como esos horarios no incluyen periodo, se propone el curso académico completo (septiembre–agosto), marcado provisional y con aviso explícito de revisar fechas/vacaciones. Los festivos del archivo se aplican solamente a esas clases; no se modifica el resto de horarios. La configuración de prácticas no se convierte automáticamente en jornadas ni asistencia.

Los casos con estructura compatible y los pendientes reconocidos pueden convertirse; otras estructuras no se adivinan. Los apartados sin equivalente (por ejemplo, procedimientos, cuestionarios, tarjetas, PAE o jornadas de otra estructura) y TODOS los campos originales se conservan localmente en un archivo original descargable. No se presentan como módulos activos ni se ejecuta su contenido. La exportación posterior incluye ese original, permitiendo recuperarlo sin perder datos. Se preserva el JSON por contenido, no el espaciado del archivo.

Exportación v3 incluye casos/imágenes, favoritos, agenda/estudios, ajustes admitidos (apariencia, filtros académicos y favoritos de herramientas) y originales conservados. Credenciales, permisos de archivos, configuración de API y aceptaciones legales no se activan al importar; el original las conserva como datos del archivo. No se envían copias a servicios externos. IndexedDB v3 agrega imports y mantiene los almacenes anteriores. Shell v17 incluye backup-data.js y backup-ui.js; el Worker no cambia.

Verificación: 58 pruebas automatizadas de aplicación; 10 comprobaciones de migración real v1→v3 y compatibilidad de copias antiguas en navegador. Importación del archivo real en origen de prueba aislado, cancelación, segunda importación sin duplicados y exportación/reimportación de la nueva copia. Se comprobó que el original reexportado es idéntico por contenido y que el caso, favorito y horario anteriores siguen presentes. No se ha importado el archivo automáticamente en el origen de uso del usuario.

## 0.7.2: Festivos y días sin clase de Valencia

Agenda → Festivos y días sin clase. Precarga 28 fechas oficiales (14 de 2026 y 14 de 2027) en `holidays-valencia.json`, separadas de la lógica, con enlace a la fuente de cada fecha y fecha de comprobación. Fuente 2026: listado oficial publicado por la Generalitat, sección de fiestas laborales y anexo de localidades (no se trasladan los días inhábiles judiciales a la agenda). Fuente 2027: Decreto 42/2026 y aprobación de los dos festivos locales por el Ayuntamiento de Valencia. San Vicente Ferrer 2027 es 5 de abril; no se reutiliza el 13 de abril de 2026. San José está incluido; San Juan no figura en el calendario autonómico de 2027.

Se contrastaron APIs en vivo: Nager v3 respondió, pero faltaba San José y añadía San Juan en 2027; la API municipal de Cerocoma documenta proyecciones para 2027–2030 y devolvió el 13 de abril estimado como fiesta local de 2027. OpenHolidays no devolvió fechas españolas de 2027 en la consulta realizada. Por tanto, esta versión NO depende de esas respuestas para cancelar clases ni pretende actualización automática por API. El conjunto oficial es una instantánea incluida con la app para consultar sin conexión. Cobertura: Valencia capital, 2026/2027; otras localidades/años requieren fechas comprobadas o un nuevo conjunto publicado en una actualización.

Los periodos activos suprimen únicamente ocurrencias del tipo Clase. No borran horarios guardados ni cambian prácticas, turnos, exámenes, tutorías o horas reales. La exportación ICS y la detección de solapamientos aplican exactamente el mismo filtro. Se puede marcar una clase como excepción que sí se imparte en festivo; sus exclusiones personales siguen teniendo prioridad. Una fecha puede desactivarse y volver a activarse. Las fechas o vacaciones académicas se añaden como un rango inclusivo una sola vez para todas las clases. Se enlaza el calendario oficial UCV 2026–2027, sin confundir un calendario escolar no universitario o las vacaciones docentes con las prácticas hospitalarias.

IndexedDB v3 conserva filas planner de tipo closure y decisiones personales. Se precargan los valores oficiales sin sobrescribir filas existentes, en una transacción. La importación restaura una personalización de calendario sobre un valor inicial todavía no personalizado, pero mantiene una decisión personal local previa. Incluido en copia v3. Shell v18 precarga módulo y JSON. Sin cambios del Worker.

Verificación: 64 pruebas automatizadas de aplicación; navegador real comprobó clase omitida el 22/01/2027 y turno mantenido, periodo académico inclusivo y desactivación persistente al recargar. Cinco comprobaciones adicionales con IndexedDB real verifican restauración de decisiones, preservación de decisiones locales y exportación de periodos sin clase.

## 0.8: Calendario por horas, varias franjas y compatibilidad de copias

La app NurseFlowV2 admite ahora copias `turno-backup` y `NurseFlowV2-backup`, versiones 1–4, además del formato NurseFlow anterior. El cambio de nombre dejaba fuera las exportaciones Turno. Se verificó el archivo proporcionado `turno-copia-2026-10-13 (2).json` (v3, 46 registros de agenda/estudios) y su importación real en un origen de prueba aislado. Se conserva el nombre de la base y la configuración de API de esta carpeta; no se importa automáticamente en el navegador del usuario.

El mes muestra eventos con color y nombre/hora. En pantallas pequeñas muestra abreviaturas y mantiene nombre/hora completos en su etiqueta accesible y en la rejilla horaria. Al seleccionar una fecha aparece una semana de lunes a domingo en horizontal o tres días centrados en la selección en vertical. El día elegido tiene un fondo suave. La rejilla comprende 24 horas, permite desplazamiento vertical y sitúa las citas según su hora real; las coincidencias se distribuyen en columnas para no taparse. Hay navegación entre periodos, leyenda y detalle del evento seleccionado.

Los colores son estables por asignatura y se pueden elegir al editar un horario; la preferencia se comparte con sus otros horarios y se guarda en IndexedDB y en las copias. El formulario admite hasta 28 franjas semanales con días y horas distintos, incluso varias franjas no solapadas en un mismo día. Los horarios anteriores conservan su formato y se expanden correctamente. Al editar clases de la misma asignatura, periodo y condiciones compatibles se reúnen sus franjas; al guardar se archivan los registros redundantes en una transacción, conservando los originales y sin duplicar citas. Series con periodos, excepciones o condiciones diferentes se mantienen independientes.

Un bloque permite cancelar solo su fecha y restablecerla desde el día correspondiente. Se aplica a clases y prácticas y conserva el resto de la serie y las jornadas/diarios ya guardados. Si hay varias franjas en el mismo día dentro de ese horario, se cancela la jornada completa. Los festivos y periodos académicos siguen afectando solamente a las clases sin excepción explícita. Las prácticas conservan sus horarios. Horas previstas se calculan sumando cada franja; exportar ICS conserva las horas distintas y omite las cancelaciones.

El formulario de casos empieza con título y resumen/aprendizaje. Diagnóstico/síntomas, imágenes, contexto/cuidados/etiquetas y referencias para estudiar quedan en apartados opcionales. Mientras se edita, se oculta la lista para no mezclar lectura y formulario. Solo después de confirmar el guardado en IndexedDB se cierra el editor y reaparece el cuaderno. Los errores y las imágenes pendientes mantienen el formulario abierto. Se cancelan consultas pendientes al cerrar tras guardar y se evita el doble envío.

Backup v4 conserva las franjas y colores; el cambio de versión evita que una app antigua acepte la copia e interprete todas las franjas con una única hora. IndexedDB mantiene v3, con propiedades opcionales nuevas; no se elimina ni recrea la base. Service Worker v23 precarga los módulos nuevos. Sin cambios del Worker de Cloudflare. No hay funciones de sincronización o notificaciones automáticas.

Comprobación: 43 pruebas automatizadas (36 de esta carpeta y 7 nuevas), sintaxis de todos los módulos y pruebas en navegador de la copia real, franjas lunes/miércoles con distintas horas, agrupación de dos horarios de Farmacología, cancelación/restauración de una jornada de prácticas y cierre del caso tras guardar. Revisión de anchura móvil a 390 px sin desbordamiento y tres columnas; orientación horizontal con siete columnas. La vista conserva modo oscuro y movimiento reducido.


### Selector de colores de la agenda

La paleta ofrece ocho colores con marca de selección, nombres en español y objetivos táctiles de 44 px. La opción Personalizado abre el selector nativo del navegador. El color se comparte entre los horarios de la asignatura, se guarda localmente y se incluye en las copias de seguridad. Los colores personalizados admiten únicamente valores hexadecimales de seis dígitos. Se conserva compatibilidad con la exportación COLORS del calendario y el valor oculto del formulario permanece fuera del contenedor que se redibuja. App shell v25 incluye color-picker.js para uso offline.

## 0.9: Turnos de noche, turnos rotatorios, borradores y recordatorio de copia

Turnos que cruzan la medianoche: si la hora final es anterior a la inicial (p. ej. 22:00–08:00), la franja termina al día siguiente. La línea de tiempo la divide en dos tramos (hasta las 24:00 y desde las 00:00 del día siguiente), la lista del día muestra «Hasta 08:00» en el día de salida, las horas previstas cuentan la duración real, los solapes se detectan entre días (también domingo → lunes) e ICS exporta DTEND en la fecha siguiente. Una hora final igual a la inicial sigue sin admitirse.

Turnos rotatorios: en el formulario de horario, «Turnos rotatorios» permite escribir un ciclo (p. ej. `M M T T N N L L L L` o `MMTTNNLLLL`) que empieza en la fecha «Desde» y se repite hasta la fecha final. L = libre; cada código de trabajo (1–3 letras o cifras) tiene su horario, con valores propuestos para M, T, N, D y N12. Se rechazan ciclos con turnos consecutivos solapados. Cancelar un día no desplaza el ciclo. Sirve también para prácticas que siguen el turno del tutor.

Borradores de casos: mientras se edita un caso, el formulario se guarda en IndexedDB cada 1,5 s y al pasar la app a segundo plano (iOS no siempre avisa al cerrar). Al volver a Casos aparece «Borrador sin guardar» con Recuperar o Descartar. Se borra al guardar, cancelar o eliminar el caso. Una imagen sin adjuntar en el editor OCR no forma parte del borrador.

Recordatorio de copia: si hay datos propios y nunca se ha exportado una copia o han pasado 14 días, aparece un aviso con «Exportar ahora» y «Más tarde» (3 días). Importar y exportar muestra la fecha de la última copia exportada. El borrador y las fechas del recordatorio son ajustes de este dispositivo: no se exportan ni se importan.

Backup v5: necesario porque las versiones anteriores interpretarían mal los turnos de noche y los ciclos; una app antigua rechaza la copia en lugar de importarla mal. Se siguen importando v1–v4. IndexedDB sin cambios de esquema. Service Worker v27. Sin cambios del Worker.

Verificación: 52 pruebas automatizadas (8 nuevas en `tests/shifts.test.mjs`). Prueba en Chrome a 390 px: turno 22:00–08:00 en dos tramos, ciclo M M T T N N L L L L sobre noviembre de 2026, borrador recuperado tras recargar, aviso visible sin copia previa y oculto después de exportar una copia v5 sin ajustes del dispositivo.
