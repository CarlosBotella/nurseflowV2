# NurseFlowV2 — Arquitectura y primer sprint

Fecha: 13 de octubre de 2026. Estado: versión 0.3, prototipo local sin publicar.

## 1. Producto y límites

PWA estática para enfermeros y estudiantes en España. Prioriza consultas breves,
cálculos transparentes y un cuaderno de aprendizaje anonimizado. Sin cuentas,
servidor propio, servicios de pago, telemetría ni bases de datos remotas.

El primer sprint estableció el App Shell, IndexedDB y la caché offline; incorporó
CRUD manual de casos, favoritos, copia/importación local, tres calculadoras y una
integración inicial con CIMA. La versión 0.2 amplía el catálogo a 40 calculadoras y
escalas locales y 8 referencias externas. No constituye un producto validado para uso asistencial.

Los casos y las calculadoras funcionan offline después de una primera instalación
completa. CIMA necesita conexión para consultas nuevas y actualización de contenidos.
Los datos del navegador pueden desaparecer si el usuario los borra o el sistema
recupera espacio. Solicitar persistencia reduce ese riesgo, no garantiza conservación.

## 2. Directorios

```text
enfermeria-pwa/                 # raíz que se publicará en GitHub Pages
├── index.html                 # DOM accesible y metadatos iOS
├── manifest.json              # instalación standalone, rutas relativas
├── styles.css                 # tokens, temas y layout adaptable
├── app.js                     # eventos, navegación y presentación
├── db.js                      # IndexedDB; CRUD y copias transaccionales
├── calculators.js             # funciones aritméticas puras
├── clinical-calculators.js     # fórmulas, conversiones y criterios de puntuación
├── tool-catalog.js             # definiciones, unidades, versiones y fuentes
├── tool-help.js                # explicación de uso, campos y resultados
├── tools-ui.js                 # catálogo, formularios, filtros y favoritos
├── cima.js                    # cliente REST, cancelación y timeout
├── package.json               # modo módulos y comando de pruebas; sin dependencias
├── sw.js                      # App Shell y caché temporal de CIMA
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
├── tests/
│   ├── calculators.test.mjs
│   └── clinical-calculators.test.mjs
├── CALCULATORS.md              # catálogo funcional y referencias externas
├── ARCHITECTURE.md
└── README.md
```

No compilación ni dependencias de producción. Los módulos JavaScript nativos
mantienen separadas presentación, persistencia y aritmética. Se utiliza navegación
por hash para evitar errores 404 al recargar en Pages. Todas las rutas de recursos,
scope e instalación son relativas y soportan `/nombre-del-repositorio/`.

Los archivos de `sources/` del proyecto ChatGPT son referencias de solo lectura y
no forman parte de la aplicación ni del despliegue.

## 3. Datos en IndexedDB

Base: `NurseFlowV2-nursing`, versión 1. Envoltura nativa pequeña; ninguna dependencia CDN.

| Store | Clave | Índices | Campos |
| --- | --- | --- | --- |
| `cases` | `id` UUID | `updatedAt`, `tags` multiEntry | `title`, `tags[]`, `context`, `assessment`, `learning`, `createdAt`, `updatedAt` |
| `favorites` | `nregistro` string | `savedAt` | `nombre`, `savedAt` |
| `settings` | `key` | — | `value` (tema de color y lista `toolFavorites`) |

Un caso no contiene campos para identidad, cama ni número de historia. El texto
libre se debe revisar: el software no puede garantizar su anonimización.

API inicial: `createCase`, `getCase`, `listCases`, `updateCase`, `deleteCase`;
`saveFavorite`, `listFavorites`, `deleteFavorite`; `getSetting`, `setSetting`;
`exportBackup`, `importBackup`. Las escrituras resuelven al completar la transacción,
no al completar una petición aislada. Editar un caso conserva `id` y `createdAt`;
lectura y actualización se realizan en una misma transacción. Los errores no
producen un estado de «Guardado» falso.

Importación: JSON con `format: NurseFlowV2-backup`, `version: 1`, casos y favoritos.
Valida antes de escribir, máximo 10 MB en la interfaz y 5.000 registros por store.
Importa de forma atómica sin sustituir IDs existentes; las copias no incluyen caché
temporal ni preferencias. No hay cifrado de aplicación: las copias contienen texto
legible y requieren el mismo cuidado que las notas originales.

La búsqueda inicial recorre los casos locales y normaliza tildes. Para volúmenes
grandes se añadirá paginación y un índice de búsqueda; no se promete respuesta
constante con miles de notas extensas.

Evolución prevista, mediante migración de versión: `medicineDocuments` para
descargas explícitas, con clave `[nregistro, section]`, contenido, origen,
`fetchedAt`, versión de ficha cuando esté disponible y estado de descarga.
Se diferenciará «favorito» de «disponible offline». Notas independientes e historial
opcional tendrán stores separados únicamente cuando se implemente esa funcionalidad.

## 4. Service Worker

### App Shell

Instalación: precache completo de HTML, CSS, módulos, manifest e iconos. Si falla
algún recurso, falla la instalación; la interfaz no anuncia disponibilidad offline.
Activación: elimina solamente cachés propias de versiones antiguas y reclama clientes.
No borra IndexedDB. No emplea `skipWaiting`: una actualización no interrumpe un
formulario abierto. Se aplica cuando se cierran todos los clientes de la versión anterior.

Navegación y recursos del shell: cache-first, para servir HTML y JavaScript de una
misma versión. Incrementar `VERSION` en `sw.js` con cada cambio del shell. El
registro usa `updateViaCache: none`. HTTPS en Pages; localhost durante desarrollo.

### CIMA

Solo peticiones GET a `https://cima.aemps.es/cima/rest/`. Network-first, timeout de
6 segundos en SW y 12 segundos en cliente. Ante error o timeout, devuelve la copia
local exacta de la URL, si existe. Sin copia devuelve 503 y mensaje explícito.

Solo almacena respuestas correctas y legibles, nunca respuestas opacas. Una
petición usa `Accept: application/json`. La caché temporal tiene un máximo de 60
consultas, con eliminación por orden de inserción. Un fallo de almacenamiento no
bloquea una respuesta online correcta. Conserva `X-NurseFlowV2-Fetched-At` y añade
`X-NurseFlowV2-Offline: 1` al recurrir a caché, incluso con red disponible y CIMA caída.
La fecha indica descarga, no fecha de revisión clínica.

La caché temporal no es una biblioteca garantizada. Los PDFs/HTML oficiales abiertos
en pestañas externas no se precachean ni se anuncian como descargados. El siguiente
sprint deberá implementar descargas fijadas en IndexedDB, comprobación de todas
sus secciones y gestión de cuota. No se descargará el catálogo completo por defecto.

### Qué significa offline

| Operación | Disponible offline |
| --- | --- |
| Abrir interfaz después de instalar correctamente | Sí |
| CRUD de casos, exportación y calculadoras | Sí |
| Ver identificación de favoritos | Sí |
| Consultar URL CIMA previamente almacenada y aún en caché | Sí, copia fechada |
| Buscar un término nuevo o consultar una sección nunca descargada | No |
| Conocer alertas nuevas o garantizar actualidad | No |

No se usa `navigator.onLine` como prueba de funcionamiento de CIMA: es solo un
indicador de red. Las respuestas y sus errores determinan el estado real.

## 5. Integración CIMA

Base: `https://cima.aemps.es/cima/rest/`.

| Función | Recurso |
| --- | --- |
| Búsqueda por nombre | `medicamentos?nombre=…&pagina=…&autorizados=1` |
| Búsqueda por principio activo | `medicamentos?practiv1=…&pagina=…&autorizados=1` |
| Detalle | `medicamento?nregistro=…` |
| Secciones 4.2, 4.3, 4.4 y 4.5 | `docSegmentado/contenido/1?nregistro=…&seccion=…` |
| Notas de seguridad | `notas?nregistro=…` |

Debounce 300 ms, mínimo 3 caracteres, cancelación de búsquedas anteriores y control
de generación para que las respuestas antiguas no sustituyan la consulta actual.
Paginación explícita con «Ver más». Las secciones se cargan al abrirlas.

Se verificaron por HTTP búsqueda, detalle y sección 4.2 de un medicamento
autorizado, con `Access-Control-Allow-Origin: *`; también la respuesta de notas.
Esto verifica la configuración observada, no garantiza disponibilidad futura ni
equivale a una prueba de despliegue real desde Pages. No se utiliza proxy público.

El HTML remoto se reconstruye mediante lista de etiquetas permitidas, sin estilos,
scripts, imágenes, handlers ni URLs remotas incrustadas. Se preservan tablas y
párrafos para mantener relaciones entre dosis y condiciones. Los enlaces externos
se limitan a HTTPS en dominios AEMPS. La ficha oficial completa sigue accesible.
No se interpreta ausencia de notas como ausencia de riesgo. El suministro se
presenta como un indicador del detalle: consulta desglosada por presentación pendiente.

## 6. UI/UX y variables CSS

Adaptación web de las Human Interface Guidelines; no reproducción certificada de
una app nativa ni uso de tipografías descargadas o SF Symbols con licencia específica.

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#f2f2f7` | `#101114` | Fondo agrupado |
| `--surface` | `#ffffff` | `#1c1d22` | Paneles |
| `--text` | `#17191d` | `#f4f4f7` | Texto principal |
| `--muted` | `#626570` | `#aaadb9` | Texto secundario |
| `--line` | `#dcdde4` | `#35363e` | Separadores |
| `--accent` | `#0066cc` | `#78b7ff` | Acciones y selección |
| `--accent-soft` | `#e7f0ff` | `#1c2d48` | Fondos de selección |
| `--glass` | `rgba(250,250,253,.88)` | `rgba(26,27,32,.88)` | Navegación |
| `--radius` | `22px` | `22px` | Paneles |

Estos valores son decisiones del producto inspiradas en colores semánticos; Apple
no impone esta paleta hexadecimal. Tipografía: `-apple-system`, `BlinkMacSystemFont`,
`Segoe UI`, sans-serif. Cuerpo 17 px; entradas nunca inferiores a 16 px. Controles
táctiles ≥44 px, iconos SVG con etiquetas, foco visible, navegación por teclado,
regiones de estado y preferencia `prefers-reduced-motion`. Zoom no restringido.

Modo oscuro por `prefers-color-scheme`, con override persistido en IndexedDB.
Desenfoque solo en barra inferior; fondo semitransparente utilizable sin soporte de
`backdrop-filter`. Safe areas mediante `env(safe-area-inset-*)`. Tres columnas en
escritorio, tarjetas en una columna en móvil. Sin animaciones largas ni banners.

## 7. Cálculos y verificación

Funciones puras separadas. mL/h = volumen × 60 / minutos. Gotas/min = volumen ×
factor / minutos. Volumen de dosis = dosis prescrita / cantidad disponible × volumen
disponible, normalizando g/mg/mcg. No cálculo automático de dosis terapéutica.

Coma o punto decimal; valores positivos, unidades compatibles y resultado finito.
Sin separadores de miles, factor de goteo sin valor por defecto, campos reiniciados
al abrir una herramienta y precisión mostrada explícitamente. Goteo redondeado a
gota entera; otros resultados hasta 3 decimales con valor sin redondear.

Pruebas automáticas de fórmulas, conversiones, entrada inválida y desbordamiento.
Verificar además en navegador CRUD, conservación tras recarga, modo oscuro, búsqueda,
offline después de instalar, respuestas CIMA cacheadas y estados de error.
Los tiempos objetivo son presupuestos pendientes de medición en iPhone real:
apertura offline <1 s y respuesta local <100 ms. No se promete latencia de CIMA.

Validación realizada en el primer sprint: 7 pruebas aritméticas superadas, sintaxis
de los cinco módulos comprobada, tamaños de iconos y recursos de precache correctos.
En navegador: creación, lectura y edición de un caso ficticio conservado tras recarga;
exportación e importación de la copia sin duplicar registros; búsqueda real CIMA,
detalle, posología, favorito y enlace de nota de seguridad; modo oscuro y layout
móvil sin desbordamiento horizontal. La interfaz y el caso guardado abrieron después
de apagar el servidor local. Esa prueba verifica independencia del servidor del
shell; no simula una desconexión global de Internet ni valida el fallback offline
de todas las consultas CIMA. Safari en iPhone y uso asistencial siguen pendientes.

## 8. Catálogo de calculadoras, versión 0.2

La referencia visual aportada se adapta con tarjetas de categoría desplegables,
buscador con tildes normalizadas y abreviaturas, chips de especialidad y estrellas.
Las referencias externas llevan una etiqueta y no simulan resultados locales.
Ver inventario en [CALCULATORS.md](CALCULATORS.md). La categoría general aloja NEWS2.

Todas las selecciones clínicas empiezan sin respuesta, sin presuponer normalidad.
El resultado se invalida al modificar una entrada; al abrir otra herramienta se
reinician los campos. No se guarda historial de valores ni se transmiten datos.
Los resultados admiten cero y signo negativo donde corresponde. Números pequeños
que redondearían a cero se muestran en notación científica. La fórmula, valores y
fuente aparecen junto al resultado. Las fechas corresponden a consulta de fuentes,
no a validación clínica de las traducciones ni del software.

Glasgow conserva NT sin total; Apgar no suma el minuto de evaluación; CHA2DS2-VA
se distingue de VASc; Cockcroft-Gault se etiqueta aclaramiento; CKD-EPI 2021 no
usa raza y mantiene unidades normalizadas; FiO2 se introduce en porcentaje; spKt/V
se distingue de eKt/V. Winter no se anuncia como interpretación gasométrica completa.
Los 30 tests verifican aritmética, conversiones, fronteras y selecciones inválidas;
no equivalen a una validación clínica de las escalas ni autorizan uso asistencial.

## 9. Próximos sprints

La versión 0.3 incorpora una capa educativa para las 48 entradas del catálogo y
sus 156 campos. «Para qué sirve» aparece antes del formulario; «Cómo entender el
resultado» y el ejemplo se despliegan a petición. Cada campo tiene una ayuda visible
y vinculada con `aria-describedby`. Tras calcular se añade «Qué significa», sin
nuevas clasificaciones clínicas ni cambios de fórmula. `tool-help.js` se precachea;
los enlaces de ampliación necesitan conexión. Las explicaciones se basan en las
fuentes identificadas por cada instrumento y en MedlinePlus/NIDDK para términos.

1. Revisión profesional de formularios y traducciones, validación clínica del producto
   y estudio de integración de los 8 instrumentos actualmente enlazados. PUSH exige autorización.
2. Descargas fijadas de fichas/secciones, actualización explícita, problemas de
   suministro por presentación y tratamiento de respuestas parciales.
3. Autoguardado de borradores transaccional, notas independientes e historial opt-in.
4. Pruebas en Safari/iOS instalado, accesibilidad, cuota, migración de DB, actualizaciones
   del SW y medición de rendimiento. Revisión profesional previa al uso asistencial.

## 10. Fuentes

- [CIMA REST oficial](https://cima.aemps.es/cima/resources/docs/CIMA_REST_API.pdf).
- [Datos abiertos AEMPS](https://sede.aemps.gob.es/datos-abiertos/).
- [Apple: tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars).
- [Apple: diseño táctil](https://developer.apple.com/design/tips/).
- [WebKit: almacenamiento](https://webkit.org/blog/14403/updates-to-storage-policy/).
- [GitHub Pages: límites](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- [Glasgow: FAQ](https://www.glasgowcomascale.org/faq/).


## Integración 0.4

`api.js` centraliza el Worker y los errores/abortos; `cima.js` consume `/cima/search` y `/cima/clinical`; `icd.js` consume `/icd/search` y `/icd/detail`, extrayendo texto de títulos con marcado sin inyectar HTML. `cases-ui.js` gestiona el formulario y descarta respuestas tardías. `case-data.js` valida campos importados y búsqueda local.

`cases` añade `symptoms: string[]`, `diagnosis: { title, uri, code, release } | null` y `diagnosisStatus: confirmed | unconfirmed`. Campos ausentes se interpretan como vacíos/no confirmados; no cambia la versión del almacén ni se eliminan datos. Foundation guarda `release=null`.

Los términos del buscador de diagnóstico son consultas externas explícitas. Ningún texto de contexto, nota, título o lista de síntomas se transmite automáticamente. El Service Worker admite caché de referencias del proxy y mantiene avisos de copia local; errores HTTP explícitos se muestran sin ocultarlos con una respuesta exitosa antigua.


### Referencias 0.5
`clinical-reference.js` contiene interpretación estructural XML/HTML, sin datos clínicos escritos manualmente. `cases-ui.js` descarta respuestas tardías mediante una generación independiente para referencias. `cases.clinicalReference` es una instantánea opcional de MedlinePlus `{source,title,url,summary,fetchedAt}` validada en importación y guardado. Se mantiene IndexedDB v1. Worker 2.1 fija host, idioma y formato de MedlinePlus, valida tamaño y cabecera XML, conserva CORS y métodos existentes; cachea internamente durante 12 h en Cache API de Cloudflare, sin base de datos externa.


### OCR 0.6
`ocr-ui.js` gestiona el canvas, el Worker local Tesseract y el estado de revisión; `redaction.js` obtiene líneas y cajas, propone zonas y valida imágenes persistibles. El Worker OCR se termina después de cada análisis. Caja negra incorporada a píxeles antes de `canvas.toDataURL(image/jpeg)`. IndexedDB v1 añade `cases.images` opcional: lista `{dataUrl,reviewed:true}`; no almacena el original, EXIF ni transcripción. CSP permite `worker-src self` y compilación WASM mediante `wasm-unsafe-eval`; no se permite JS eval general ni motores remotos. Recursos vendor se cachean en `NurseFlowV2-ocr-assets-v1`, conservado entre versiones del App Shell. Dependencias npm verificadas con SHA512 del registro; modelo español versionado y SHA256 en vendor/ocr/VERSIONS.txt.

### Agenda y estudios 0.7

- `ucv-catalog.js`: catálogo oficial por plan y código, con fuente y fecha de consulta. Separado del estado personal.
- `planner-data.js`: validación, expansión semanal por días civiles (UTC para evitar saltos DST), exclusiones, detección de solapamientos y exportación ICS en hora española.
- `planner-ui.js`: matrícula por curso académico sin exclusión entre cursos; agenda mensual y próximos siete días; formulario recurrente; diario y pendientes. Los textos externos se muestran mediante textContent.
- IndexedDB v2, almacén `planner` con keyPath `id` e índice `type`. Discriminantes: `enrollment` (year, subjectId, title, repeated), `event`/`rotation` (title, category, subjectId, startDate, endDate, start, end, weekdays[0..6], excluded[], confirmed, archived, place, tutor), `day` (eventId, date, actualMinutes, registered, note), `task` (title, eventId opcional, due, done). IDs estables por matrícula/año y por jornada/rotación evitan duplicados. No se rellenan automáticamente hechos de asistencia.
- Migración aditiva v1→v2. Copia v2 validada antes de escribir, incluye planner; acepta copias v1 y fusiona sin sobrescribir. Índices y contenido anteriores se mantienen.
- Shell v16 precarga módulos y catálogo para disponibilidad sin conexión. No se consulta el Worker al usar agenda o estudios. Exportar .ics no otorga acceso a un calendario externo. No hay cuenta, sincronización, avisos push o integración con UCV Evalúa.

### Copias 0.7.1

`backup-data.js` reconoce el formato anterior NurseFlow y transforma solo campos explícitos hacia la estructura actual. Selección UCV por códigos; horarios sin periodo se limitan provisionalmente al curso académico y se excluyen festivos con fechas exactas del archivo. Las demás colecciones se conservan en el JSON original, sin inventar equivalencias de datos clínicos. SHA-256 del contenido serializado identifica el original para evitar duplicarlo.

`backup-ui.js` separa selección/revisión de guardado, muestra límites de migración, admite cancelación y ofrece descarga de originales. Solo crea DOM de texto, sin inyectar HTML ni alterar el Worker. `db.prepareImport` valida datos antes de la transacción; `importBackup` fusiona cases/favorites/planner/settings/imports en una sola transacción y conserva claves existentes. Filtros, favoritos y apariencia se actualizan tras importar.

IndexedDB v3 añade `imports` (keyPath id) con `{id,format:'nurseflow',source:JSONstring}`. Backup v3 contiene los cinco almacenes de usuario; mantiene compatibilidad con v1/v2 y el formato sin envoltura anterior. El archivo original puede contener datos privados y no se muestra como guía clínica ni imagen validada por OCR. Su conservación no convierte los módulos antiguos en funciones nuevas de esta app. App Shell v17 incorpora ambos módulos.

### Calendario de festivos 0.7.2

`holidays-valencia.json` es un conjunto de datos oficiales por localidad/año con trazabilidad por fecha. No se calculan fiestas locales a partir de patrones ni se activan estimaciones externas. `holidays-ui.js` asegura la carga inicial del conjunto, permite activar/desactivar días y añadir periodos académicos. No transmite información al consultar o editar el calendario local.

Nuevo discriminante `planner.type=closure`: `{id,title,startDate,endDate,kind:holiday|academic,locality,source,active,customized}`. Validación de fechas y periodos; fuentes HTTPS. `customized` diferencia decisiones personales de valores iniciales. `seedPlanner` solo añade IDs ausentes, con transacción atómica. Copia/importación v3 conserva el nuevo tipo; al importar un ajuste personal sobre un valor inicial no personalizado se permite restaurarlo, preservando decisiones personales locales previas.

Eventos de tipo Clase añaden `ignoreClosures`. `occurrences`, `conflicts` y `calendarFile` reciben el mismo conjunto de periodos activos; únicamente suprimen clases sin excepción y respetan exclusiones por fecha de cada horario. No se reescribe la serie ni se eliminan jornadas guardadas. El calendario marca los días sin clase y muestra sus motivos. No hay cambios de esquema IndexedDB ni del Worker; Shell v18 precarga los recursos nuevos. Los días de vacaciones UCV se registran desde fechas comprobadas para el campus/grado, no se derivan de los festivos laborales.

### Calendario y casos 0.8

`calendar-layout.js` resuelve rango de fechas según orientación, colores por clave de asignatura y distribución de solapamientos en columnas. `calendar-ui.js` construye el mes y la rejilla de 24 horas por DOM, con posicionamiento CSS y contenido de texto seguro. La selección controla un inspector del evento/día, sin una lista de siete días posteriores.

`planner.slots` opcional = `[{id,day:0..6,start:HH:mm,end:HH:mm}]`, máximo 28. Validación de horas y solapamientos dentro de una misma serie. `eventSlots` adapta la estructura anterior (weekdays/start/end) sin migrar ni alterar datos al leer. `occurrences` devuelve slotId y sus horas para vista, cálculo de horas e ICS. UID de ICS incluye slot para diferenciar varias franjas en la misma fecha. Exclusiones por fecha cancelan todas las franjas de la jornada y permiten recuperación; no afectan a las demás fechas ni eliminan logs.

`settings.subjectColors` guarda el mapa de clave de asignatura a uno de ocho colores validados. Al editar clases compatibles, `savePlannerGroup` guarda la serie y archiva las series redundantes en una transacción, conservando datos originales. Se comparan periodo, localidad/aula, tutor, confirmación, excepciones y tratamiento de festivos antes de agrupar. No se fusionan rotaciones ni se trasladan sus diarios.

Copias nativas aceptadas: turno-backup/NurseFlowV2-backup v1–v4. Exportación v4; lectura anterior preservada. El espacio IndexedDB NurseFlowV2-nursing y su versión 3 se mantienen. Shell v23 incluye calendar-layout.js/calendar-ui.js. El caso se cierra únicamente después del commit correcto; consultas y edición de imágenes se limpian, sin descartar cambios ante errores de guardado.
