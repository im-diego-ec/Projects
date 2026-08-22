---
artefacto: design
dri: Builder 1
aprueba: Builder 1 (builder) # gate de `calidad-codigo`, no del PO
informado: PO / Builder 2
estado: pendiente-de-revision
---

# marca-verificada — Design

## D1 — El marco no guarda el design system: transporta lo que el build necesita

**Decisión.** Ninguna de las tres piezas copia el sistema de diseño. Se referencia
la skill como manual, y solo se transportan los archivos que el navegador
necesita tener en el árbol.

**Por qué.** La skill ya está distribuida a toda la organización. Guardar una
copia crea una segunda casa, y este repo ya tiene la enfermedad diagnosticada por
escrito en otro contexto: «pondría las decisiones en dos casas, y la divergencia
entre dos casas es cuestión de tiempo». El primer principio del README del marco
es **referenciar > copiar**.

**El recorte, medido.** De 189 archivos y 960K, **9 archivos y 63K** necesitan
poder actualizarse solos: 7 CSS de tokens (13.862 bytes) menos `fonts.css` (D5),
más 3 logos SVG (9.156 bytes). Todo lo demás —45 componentes, 24 guidelines HTML,
el bundle, el documento maestro de 1.082 líneas— se lee, no se copia.

**Alternativa descartada: vendorar el kit completo en `plantilla/`.** Agrega 24
HTML que el censo de fuentes y `format:check` tendrían que excluir a mano, y
congela una copia por proyecto cuya divergencia solo detectaría una revisión
trimestral. Un detector que corre cada tres meses no es un detector.

**Alternativa descartada: un paquete npm privado de la organización.** Es la
respuesta ortodoxa y sería la correcta en otro contexto. Acá cuesta un repo nuevo
más una dependencia nueva, y el marco **ya midió** que un distribuible privado sin
acceso de Dependabot falla en silencio: pasó con el propio marco esta semana, y a
la fecha de este documento el censo de consumidores todavía no produjo una sola
entrada. Se reevalúa cuando el censo funcione.

## D2 — `actions/marca` es hermana de `actions/constitucion`, nunca parte de ella

**Decisión.** Una action nueva. No se le agrega CSS a la constitución.

**Por qué, con la evidencia.** `actions/constitucion/constitucion.mjs` filtra sus
fuentes con `/^\d{2}-.+\.md$/`, escribe en `utf8` normalizando CRLF, y su
invariante declarada es **un cuerpo único renderizado a N superficies**. Meterle
archivos CSS rompe exactamente eso: no son markdown, no son un cuerpo único, y su
destino depende del paquete de frontend del proyecto y no de una superficie de
agente. El propio archivo ya lo dice: «una superficie nueva es un change de
Projects, no una config».

**Consecuencia aceptada.** Son dos ledgers de versión y dos ventanas de gracia en
vez de una. Se acepta porque la alternativa —un transportador que sirve dos
naturalezas— es la que se vuelve imposible de razonar en el tercer caso.

## D3 — Las reglas van a ESLint, no se adopta oxlint

**Decisión.** Las reglas portables se escriben en el `eslint.config.mjs` que el
andamio reparte. **Cero dependencias nuevas.**

**Por qué.** Las tres claves de regla del `_adherence.oxlintrc.json` son
`no-restricted-syntax`, `no-restricted-imports` y `react/forbid-elements`:
las dos primeras son **core de ESLint** y la tercera viene del plugin de React
que el andamio ya usa. oxlint implementa un subconjunto compatible; adoptarlo
sería una herramienta nueva para reglas que ya se pueden expresar.

**Alternativa descartada: consumir el `_adherence.oxlintrc.json` tal cual.** No se
puede, y el motivo es medible: de sus **67 selectores, 64 no son portables**. Son
45 allowlists de props y 19 enumeraciones atadas a los nombres de los componentes
del kit. Medidos contra el consumidor real, dos de ellos dan **16 hits y 16
falsos positivos cada uno** —cazan cosas como `disabled={update.isPending}`—.
Portarlos sería estrenar con 32 rojos falsos el día uno, que es la forma más
rápida de que un equipo aprenda a ignorar un check.

**Y hay que decir esto:** la regla de mayor valor —blanco sobre naranja, la más
dura del design system— **no existe en el `_adherence`**. Hay que escribirla.

## D4 — Dos correcciones obligatorias al portar las reglas

Sin estas dos, el estreno mide mal y el equipo lo nota en la primera semana.

**1. Los gemelos de `TemplateElement`.** De los cinco casos reales de blanco
sobre naranja en el consumidor, **tres están dentro de un template literal**. El
`_adherence` solo mira `Literal`, así que no los vería. Cada selector de texto
lleva su gemelo sobre `TemplateElement`.

**2. El alcance por ruta, no solo el ancla del patrón.** El archivo de
configuración de estilos del proyecto es el **lugar legítimo** de los colores de
la marca. Una regla que lo enrojece está mal escrita. El alcance se acota con
`files`, no con un regex más astuto.

## D5 — `fonts.css` no entra: es una sustitución, no la marca

**Decisión.** El canónico transporta **7 archivos, no 8**, y su `styles.css`
lleva **6 `@import`, no 7**. La tipografía entra como **hueco declarado**, con
aviso visible en cada corrida mientras esté abierto.

**Por qué.** `tokens/fonts.css` son cinco líneas y **cuatro son el disclaimer**:
«No font binaries were provided with the master package; Inter Tight is loaded
from Google Fonts. Replace with self-hosted @font-face rules if the brand supplies
licensed binaries.» El readme del sistema lo repite dos veces.

Es el único de los ocho que no es marca: es la resolución de un agente sobre cómo
cargar la fuente que el documento maestro pidió. Si el marco lo regenera en
cuatro repos, **convierte una sustitución declarada en el estándar verificado del
área**, con el sello del marco encima y un rojo para quien la corrija con el valor
verdadero. Eso es estrictamente peor que el statu quo: hoy la sustitución se lee
como advertencia; mañana sería la norma con check.

**Consecuencia dicha derecho:** mientras el hueco esté abierto, cada proyecto
elige su tipografía y el marco no dice nada. El consumidor actual ya eligió dos y
ninguna es la del maestro. **Cerrar el hueco no es trabajo del marco: es un
archivo que la marca tiene que entregar.**

**Los iconos tampoco entran**, y por dos razones sumadas: son componentes (que no
se copian por D1) y el kit los carga desde CDN con `@latest` **sin pin**, lo que
viola `ejecutores-con-version-exacta` del propio canónico. El consumidor actual
ya elige mejor: usa el paquete versionado.

## D6 — Se verifica contra el re-render, no contra un sello guardado

**Decisión.** El check regenera el artefacto desde el canónico de la versión
pinada y compara. No se guarda un hash junto al archivo.

**Por qué.** Es la lección que la action hermana ya tiene escrita: «recomputar un
sello es un `git commit` y cambiar el canónico no». Un sello guardado se puede
actualizar sin que el contenido sea correcto; un re-render no.

**Lo que esto cierra y lo que no**, y la diferencia importa:

- **Cierra:** «mi copia divergió de la versión que tengo pinada». Verificable.
- **No cierra:** «mi pin quedó viejo». El ledger con las fechas viaja **dentro de
  la action pinada**, así que un repo trabado en una versión vieja calcula su
  ventana contra su ledger viejo y sale «al día». Es un punto ciego heredado del
  marco entero, no de esta action, y con el censo de consumidores sin funcionar no
  es teórico.
- **No cierra, y no puede:** que el canónico del marco haya quedado atrás del
  árbol de la skill. La skill no es un repo —vive bajo UUID de sesión, sin `.git`,
  sin tag y **sin un campo de versión legible por máquina**: solo aparece en
  prosa—. Mitigación: el manifiesto guarda el `sha256` de cada archivo tal como se
  tomó, con fecha y con quién. No detecta el desvío; hace **contestable** la
  pregunta «de qué snapshot salió esto», que hoy no tiene respuesta posible.

## D7 — El asesino silencioso: el token eliminado

**Decisión.** La regla de `var()` huérfano va en esta action, no en un TODO.

**Por qué.** Cuando una versión futura retire un token, el CSS regenerado deja de
definirlo y el `var(--token-viejo)` del proyecto **resuelve a nada**: en runtime,
sin error de construcción, y sin aparecer en el diff del archivo regenerado. Es la
única forma de desvío de este change que no se ve por ninguna otra vía.

Hay precedente de que pasa: `tokens/deprecated.css` ya tiene siete alias
declarados «se eliminan en v3.0.0», y ninguno emite aviso de nada.

## D8 — En el lint no hay «modo aviso», y el estreno gradual no hace falta ahí

**Decisión.** Las siete reglas entran con severidad de **error** en el
`eslint.config.mjs` del andamio. **No hay estreno gradual en el lint.** El estreno
con fecha sí existe, pero en el bloque 3 y por otra vía.

**Por qué, y esto empezó siendo un error de este diseño.** La primera versión de
este documento decía «se estrena en modo aviso con fecha», por la doctrina del
marco de que un endurecimiento no enrojece a nadie de un día para el otro. Es
**imposible**: tanto el andamio como el consumidor corren
`eslint . --max-warnings=0`, así que **un `warn` ES un rojo**. No existe una
severidad intermedia en este pipeline.

**Y al medirlo apareció que tampoco hacía falta.** El `eslint.config.mjs` es un
archivo del **andamio**: se copia una vez al crear el repo. Entonces:

| A quién llega | Cuántas violaciones tiene | Qué necesita |
|---|---|---|
| Un proyecto **nuevo** | cero: nace vacío | nada. `error` desde el día uno es gratis |
| Un consumidor **que ya existe** | 27 en el caso real | **no recibe el archivo nunca.** El andamio no llega a un repo ya creado |

O sea que el estreno gradual estaba resolviendo un problema que en este carril no
existe. Los 27 hits del consumidor actual no se disparan por este change: se
dispararían el día que alguien decida adoptar el bloque en ese repo, y ese es un PR
suyo, con su propio criterio y su propio momento.

**Dónde el estreno con fecha SÍ es necesario:** en el bloque 3, el job
`marca_cableada` de `marco-ci.yml`, que es lo único que alcanza a un consumidor
existente sin que él haya movido un archivo. Ahí el aviso no es una severidad de
eslint sino una anotación del workflow, así que sí se puede avisar sin fallar, y ahí
va la fecha y la ventana de 28 días del ledger.

**La lección, escrita porque se repitió:** «se estrena en modo aviso» es una
doctrina correcta que no se puede aplicar a ciegas. Depende de que el mecanismo
tenga un estado intermedio, y `--max-warnings=0` no lo tiene. Hay que mirar el
pipeline antes de invocar la regla.

## D9 — Los PNG van por scaffold; los SVG, regenerados

**Decisión.** Los tres logos SVG se regeneran. Los tres PNG se copian una vez.

**Por qué.** Los SVG son texto —no están en la lista de binarios del
`.gitattributes` del marco— así que viajan por el mismo carril que los CSS y su
divergencia se detecta. Los PNG son 71K de binario que cambian una vez por década:
el scaffold es el transporte correcto, y es el único grupo donde un fail-open no
cuesta nada.

## Lo que falta y no lo resuelve este design

**El sistema de diseño entrega dos de las cinco piezas de marca que la hoja de
marca declara.** Faltan `la organización-workmark-dark`, `la organización-workmark-light` y
`la organización-star-orange`. Los tres son derivables sin dibujar: en el componente
`Wordmark` la estrella es un único `<path>` con relleno de acento y las letras son
un grupo aparte en `currentColor`, limpiamente separables.

**Pero publicar assets de marca es del dueño de la marca, no del marco.** Queda
nombrado acá para que la decisión exista; el change no la toma. Y la pieza que más
se va a pedir —la estrella sola, para un favicon o un avatar— hoy no existe ni
como archivo ni como propiedad del componente, que solo acepta `size` y `label`.
