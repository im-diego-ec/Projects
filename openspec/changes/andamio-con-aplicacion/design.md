---
artefacto: design
dri: Builder 1
aprueba: Builder 1 (builder) # gate de `calidad-codigo`, no del PO
informado: PO / Builder 2
estado: pendiente-de-revision
---

# andamio-con-aplicacion — Design

## D0 — La capability es `calidad-codigo`, y no una nueva

**Decisión.** El delta va a `calidad-codigo`.

**Por qué.** Las cuatro garantías que este change toca **ya viven ahí**, y tres de
ellas son literalmente las que el esqueleto rompía: «Scripts de verificación sin
enmascaramiento de fallo» (el `|| true` y el `--passWithNoTests`), «La cobertura
de pruebas alcanza el mínimo acordado y no retrocede» (el 39,18 % heredado y el
cableado ausente), «Ningún archivo fuente fuera del alcance de la verificación»
(los tres excluidos del andamio sin declarar) y «Un repositorio nacido del
scaffold no conserva marcadores sin resolver» (el andamio, que es lo que este
change engorda). Escribir lo nuevo en otra capability partiría en dos casas la
descripción de un mismo objeto: qué entrega el scaffold y qué se le exige a lo
entregado.

**Alternativa descartada: `pipeline-entrega`.** Su requirement «CI verifica todos
los paquetes de forma bloqueante» es tentador porque este change hace que haya
paquetes que verificar. Pero esa capability describe la TOPOLOGÍA de las
compuertas —qué corre, en qué orden, qué bloquea—, y acá no cambia ninguna
compuerta: cambia lo que el repositorio nuevo TRAE para que las compuertas ya
existentes tengan sujeto. El pipeline es el mismo antes y después.

**Alternativa descartada: una capability nueva, `andamio` o `scaffold`.** Sería
la tercera casa del mismo tema: el scaffold ya está descrito en
`calidad-codigo` (marcadores sin resolver) y en `gobierno-contribucion` (lo que
el scaffold deja para el humano). Una capability nueva obligaría a mover
requirements existentes para no duplicar, y eso es un change de reorganización
del contrato, no de comportamiento. Si el andamio sigue creciendo, esa
reorganización se hace **aparte y a propósito**.

**Alternativa descartada: `base-tecnologica`.** Es la capability que nace con
`stack-estandar` (change activo) y describe cuál es la base fijada y cómo se
aparta uno de ella. Este change no elige la base: la asume y la EMPAQUETA. Cuando
`stack-estandar` archive, el esqueleto va a ser la encarnación de esa base, y ahí
sí conviene un puntero cruzado en los specs — un puntero, no el requirement.

## D1 — El esqueleto vive DENTRO del andamio, no en un repositorio aparte

**Decisión.** `plantilla/` pasa a contener el código de aplicación.

**Por qué, y es la lección que acabamos de pagar.** Un esqueleto en su propio
repositorio es exactamente lo que estamos borrando. `projects-starter`
funcionaba: React + Vite + Tailwind + Clerk, Express + Prisma, todo levantando.
Y contra las compuertas que el marco exige hoy tenía **diez defectos**, ninguno
malicioso y ninguno detectable: nadie compara dos repositorios sin un check que
lo haga, y ese check no existe ni puede existir sin acoplarlos. La deriva no fue
un descuido, fue el resultado normal de la estructura.

Adentro del andamio la propiedad se invierte: el esqueleto y la mecánica que lo
verifica **cambian en el mismo PR, bajo el mismo review**. Un `|| true` en un
manifiesto del esqueleto es un diff que un builder mira, no una diferencia entre
dos repositorios que nadie abre a la vez.

**Alternativa descartada: mantener el starter y referenciarlo desde el andamio.**
Es el primer principio del marco (referenciar > copiar) aplicado mal. Referenciar
sirve cuando lo referenciado es un ARTEFACTO VIVO con dueño y versiones — la
skill del design system, el workflow reusable —. Un esqueleto no es eso: se copia
UNA vez, al nacer el proyecto, y después nadie vuelve. Referenciar algo que se
consume una sola vez no ahorra deriva, la traslada al otro repositorio y le
saca el review.

**Alternativa descartada: publicar el esqueleto como paquete npm privado
(`create-la organización-app`).** La respuesta ortodoxa. Cuesta un repositorio nuevo más
una dependencia nueva, y el marco **ya midió** que un distribuible privado sin
acceso de Dependabot falla en silencio. Se reevalúa si algún día hay más de tres
adoptantes por año.

**Alternativa descartada: template repository de GitHub.** Resuelve la copia y no
resuelve nada de lo demás: los marcadores no se sustituyen, `openspec init` no
corre, la constitución no se renderiza, y el template deriva igual que el starter
porque tampoco lo verifica nadie. Sería cambiar `projects init` por un botón que
hace menos.

## D2 — El lockfile no viaja en el andamio: nace en el destino

**El problema.** `pnpm install --frozen-lockfile` exige un lockfile, y un
lockfile no puede vivir en un andamio con marcadores sin volverse una trampa.

**Decisión.** El andamio trae los manifiestos **con sus rangos de versión** y el
lockfile **nace en el destino**, no viaja. Hoy lo genera el `pnpm install` que el
proyecto corre como paso 0 (está escrito en `comandos-levantar-servicios.txt`), y
entra al commit fundacional.

**Lo que este change NO automatiza, y por qué se dice acá en vez de dejarlo
implícito.** La primera versión de esta decisión decía que `projects init` corría el
`pnpm install`, y **no lo corre**: se escribió como intención y se leyó como hecho.
Automatizarlo es lo correcto —es exactamente la clase de paso que este change
existe para eliminar— y no entra acá por dos razones concretas: es un cambio de
**comportamiento de la herramienta**, con su propia superficie de pruebas (las 21
del banco de `projects init`, más el camino de `--sin-herramientas`, más el modo sin
red); y este change ya mueve 57 archivos del andamio. Entra como change propio, y
mientras no entre, el paso 0 es humano y está escrito donde se lo va a leer.

**Por qué ahí y no en `plantilla/`.**

1. **El andamio no tiene quién actualice un lockfile.** Projects no tiene
   `package.json`, así que Dependabot no ve nada del andamio (ya está medido: un
   distribuible privado sin acceso falla en silencio). Un lockfile en
   `plantilla/` se congela el día que se escribe y cada proyecto nuevo nacería con
   las versiones de ese día, incluidas las vulnerables.
2. **`--frozen-lockfile` revienta con el primer apartamiento legítimo.** El
   camino documentado «si el proyecto no tiene frontend, borrá los bloques
   `[FRONT]`» deja un lockfile que ya no corresponde a los manifiestos: la
   instalación no avisa, **falla**. Un artefacto derivado que viaja junto a su
   fuente parametrizada es un artefacto que va a discrepar.
3. **Generarlo en el destino es la única versión honesta de «reproducible».** El
   lockfile fija lo que ESTE proyecto instaló el día que nació. Es lo que un
   proyecto nuevo quiere: la resolución más reciente dentro de sus rangos,
   congelada desde el primer commit.

**La consecuencia, cuando se automatice.** `projects init` va a necesitar red para
instalar. Ya la necesita: corre `npx @fission-ai/openspec@<pin> init`. La bandera
`--sin-herramientas` tendría que cubrir las dos cosas, y la salida nombrar que sin
lockfile el primer CI sale rojo en su cuarto paso.

**Alternativa descartada: sacar `--frozen-lockfile` del `ci.yml`.** Convierte una
compuerta de reproducibilidad en una sugerencia para todos los consumidores, para
arreglar un problema de un solo día en la vida de un repositorio. No.

## D3 — Los paquetes van en directorios literales, y eso hay que protegerlo

**Decisión.** `api/`, `web/`, `e2e/`. Los marcadores `{{PAQUETE_*}}` se usan solo
DENTRO de los archivos.

**Por qué.** `projects init` sustituye contenido y copia rutas tal cual. Un
directorio llamado `{{PAQUETE_API}}` llegaría con ese nombre al repositorio nuevo.

**Y acá hay un defecto real que este change destapa.**
`marcadoresQueSobreviven()` recorre el destino, **descarta lo que no es archivo**
y busca el patrón en el CONTENIDO. La ruta se usa nada más que para reportar. O
sea: un marcador en un nombre de archivo o de directorio sobrevive intacto y la
herramienta imprime **«cero marcadores sobrevivientes»**. Hoy es inofensivo
porque el andamio no tiene marcadores en rutas; desde este change el andamio
tiene directorios de paquetes, y la tentación de parametrizarlos es evidente para
cualquiera que lea `REQUERIDOS` y vea `PAQUETE_API`.

Se cierra con una comprobación en las pruebas del marco: **ninguna ruta del
andamio contiene un marcador**. Es la razón del scenario nuevo en el requirement
de marcadores. Un control que firma «cero» sobre un repositorio que tiene uno es
peor que no tener control.

**Alternativa descartada: enseñarle a `projects init` a renombrar rutas.** Suena
mejor y es peor: los `import` relativos, el `pnpm-workspace.yaml`, el
`eslint.config.mjs`, los `--filter` del `ci.yml` y los `extends` de los tsconfig
tendrían que coincidir con el nombre elegido, y la primera vez que uno no
coincida el fallo llega en runtime del pipeline, no en la sustitución. Los
directorios literales cuestan que el nombre del paquete sea `api` en todos los
proyectos, y ese costo es cero.

## D4 — Los nombres de los scripts se LEEN del `ci.yml`, no se eligen

**Decisión.** Los manifiestos del esqueleto declaran exactamente lo que el
`ci.yml` del andamio invoca. Leído del archivo:

| Dónde | Script | Cómo lo invoca el pipeline |
|---|---|---|
| raíz | `lint` | `pnpm lint`, una vez, `eslint .` sobre todo el árbol |
| raíz | `format:check` | `pnpm format:check`, una vez, `prettier --check .` |
| cada paquete | `typecheck` | `SCRIPTS: "typecheck test build"`, parado dentro del paquete |
| cada paquete | `test` | idem, y **con cobertura** (D5) |
| cada paquete | `build` | idem |
| `api` | el generador del cliente de datos | `pnpm --filter {{PAQUETE_API}} --fail-if-no-match exec {{GENERAR_CLIENTE_DATOS}}` |

Y las dos **excepciones** que el `ci.yml` ya declara: `{{PAQUETE_E2E}}:test` y
`{{PAQUETE_E2E}}:build`.

**Lo que hay que arreglar del starter, medido.** La raíz declaraba
`"lint": "pnpm -r lint"` y ningún `format:check`. `pnpm -r lint` es
justamente lo que el `ci.yml` documenta como agujero (saltea en silencio el
paquete que no declara el script y sale 0), y además dejaría fuera del alcance
todo lo que vive **fuera** de los paquetes: `eslint.config.mjs`,
`vitest.config.base.mjs`, los workflows. En la raíz va `eslint .` y
`prettier --check .`, sin `-r`. Y `web` no declaraba `typecheck`: lo hacía dentro
de `build` (`tsc -b && vite build`), que es la forma de que la señal más barata
llegue junto con la más cara.

**La divergencia se comprueba, no se recuerda.** Una prueba del marco lee los
scripts que el `ci.yml` invoca y los busca en los manifiestos del andamio. Sin
eso, renombrar un script en cualquiera de los dos lados es un rojo que descubre
el próximo proyecto que nazca.

## D5 — La deuda de cobertura no se hereda: se paga en el andamio

**El hecho de partida.** El código heredado del esqueleto archivado daba
**39,18 % de líneas** en `api`, con `server.ts` y `lib/prisma.ts` al 0 %. El
mínimo del marco es 80.

**Decisión.** El esqueleto nace **en verde y sin bloque `deuda`**: pruebas reales
donde hay lógica, y exclusión declarada con motivo donde no la hay.

Lo construido salió **mejor que esta decisión**, y conviene que quede dicho porque
la versión anterior de este párrafo mandaba a excluir lo que terminó probado:

- `app.ts` y `middleware/auth.ts` **se prueban**: son reglas (rutas, verificación
  de token, el bypass de desarrollo) y son exactamente lo que un proyecto nuevo va
  a copiar y modificar. Una prueba acá es la plantilla de cómo se prueba allá.
- `server.ts` **se prueba**, no se excluye. El diseño lo daba por inprobable
  («nueve líneas cuyo efecto es abrir un socket») y resultó que sí: hay
  `server.test.ts`.
- `lib/prisma.ts` **se prueba**, con `prisma.test.ts`. Tampoco quedó excluido.
- Y aparecieron piezas que el marco EXIGE y el esqueleto heredado no tenía:
  `lib/log.ts` (la constitución manda que todo log pase por ahí),
  `middleware/errorHandler.ts`, `middleware/requestId.ts` y `lib/asyncHandler.ts`,
  cada una con su prueba salvo `requestId.ts`.

**Lo único excluido, y son dos archivos de configuración**: `vitest.config.ts` y
`prisma.config.ts`, cada uno con su motivo escrito en el manifiesto del paquete.
Ninguna suite puede importarlos, y el analizador ya los ignora por el patrón
`**/*.config.ts`.

**Medido sobre el repo instanciado:** `api` 46 pruebas con 100 % de líneas,
93,54 % de ramas, 100 % de funciones y 100 % de sentencias; `web` 8 pruebas con
100 % en las cuatro. Contra un mínimo de 80 y **sin bloque `deuda`**.

**Por qué no se declara deuda, que sería lo más rápido.** La deuda del marco es
un mecanismo de TRANSICIÓN para un repositorio con historia: motivo + fecha. Un
esqueleto no tiene historia. Y una fecha escrita en una plantilla es una bomba de
relojería: el proyecto que nazca después de ese día arranca con el plazo
**vencido**, o sea rojo, por una promesa que nadie de ese proyecto hizo.

**Alternativa descartada: que `projects init` calcule la fecha (hoy + 90 días).**
Quita la bomba y deja algo peor: la herramienta escribiendo un compromiso que
ningún humano acordó, sobre un código que ningún humano de ese proyecto escribió.

**Alternativa descartada: bajar los umbrales en `vitest.config.base.mjs`.** El
marco ya midió que bajar los cuatro números a 40 daba **EXIT 0 en toda la
integración**. Es la palanca que la compuerta existe para no tener.

**Alternativa descartada: apagar `all: true` en el esqueleto.** El archivo que
ninguna prueba importa deja de existir en el reporte y el promedio sube solo. Es
el fail-open más barato que hay acá y está documentado en el propio
`vitest.config.base.mjs`.

## D6 — El `pnpm-workspace.yaml` de `api/` no se borra: se disuelve

**Decisión.** El workspace se declara una sola vez, en la raíz — pero el archivo
suelto **no se borra a secas**.

**Por qué, y este es el detalle que se lleva una tarde si se pasa por alto.** Ese
archivo no declara ningún workspace: declara `allowBuilds` para `@clerk/shared`,
`@prisma/client`, `@prisma/engines`, `esbuild` y `prisma`. Es la lista de paquetes
autorizados a correr scripts de instalación. Borrarlo sin mudar su contenido deja
a Prisma sin postinstall: no se descargan los engines, `prisma generate` falla o
genera de menos, y **el rojo aparece en el paso del cliente de datos**, tres pasos
después y con un mensaje que no menciona workspaces. El contenido se muda al
`pnpm-workspace.yaml` de la raíz, junto a `packages:`.

## D7 — El paquete `e2e` existe porque su ausencia es roja

**El hallazgo.** El material de partida tiene `api` y `web`. El `ci.yml` del
andamio declara `EXCEPCIONES: "{{PAQUETE_E2E}}:test {{PAQUETE_E2E}}:build"`, y su
propio verificador considera **fallo** una excepción que no corresponde a ningún
paquete del workspace («excepción muerta»). Sin paquete `e2e`, el repositorio
nuevo nace rojo por una excepción que el andamio escribió.

**Decisión.** El esqueleto trae `e2e/` mínimo: Playwright, un spec que golpea el
health del API desplegado, su `tsconfig.json` extendiendo la base, y `typecheck`
declarado (no está exento: lo exento es `test` y `build`).

**Y su exclusión de cobertura, declarada.** El plano del diff de la compuerta
enrojece cuando un PR agrega líneas fuente que ningún reporte de cobertura
reclama — y el `e2e` no corre en el CI del cambio por diseño. Así que
`e2e/package.json` declara `projects.cobertura.excluidos` con su motivo: *la suite
E2E corre con navegadores contra un ambiente ya desplegado; su workflow es el de
promoción, no el CI del PR*. Verificado contra el comportamiento de la action: el
plano del TOTAL solo emite veredicto sobre paquetes que aparecen en algún
reporte, así que un `e2e` sin lcov no queda en rojo por el total; el plano del
diff sí lo reclamaría, y para eso está la exclusión.

**Alternativa descartada: borrar las dos excepciones del `ci.yml`.** Deja al
esqueleto sin E2E, contra el stack fijado (Playwright), y le regala al primer
proyecto la tarea de armar la suite desde cero — que es la parte que más se
parece a lo que un esqueleto debería resolver.

## D8 — Los tres excluidos del andamio viajan en el manifiesto, no en la consola

**Decisión.** El `package.json` de la raíz del andamio nace con
`projects.cobertura.excluidos` para `eslint.config.mjs`, `vitest.config.base.mjs` y
`.claude/skills/**/*.mjs`, cada uno con su motivo.

**Por qué.** Hoy `projects init` los imprime para que alguien los pegue. Son
archivos que **el marco mismo reparte** y que su propia compuerta reclama: el
marco poniendo en rojo al proyecto por algo que puso el marco, si el humano no se
acordó de pegar seis líneas. Un paso que la herramienta puede hacer y no hace es
un fail-open con testigo.

Nota fina, y es la razón de que esto no sea gratis: la compuerta también falla
cuando **una exclusión no corresponde a ningún archivo** («que no sobrevivan al
problema que las justificaron»). Los tres patrones apuntan a archivos que el
andamio siempre copia, así que están a salvo; pero cualquier exclusión que se
agregue a futuro sobre un archivo condicional nace con esa trampa.

## D9 — Cómo se acredita todo esto: el ensayo de bootstrap

**Decisión.** Un banco que instancia el andamio en un directorio temporal,
instala, y corre las compuertas en el orden del `ci.yml` hasta la cobertura. Se
acredita por **código de salida**, y es la evidencia de casi todas las tareas.

**Por qué no corre en el CI de Projects.** El marco no tiene `package.json` ni
`node_modules`, y eso es una propiedad deliberada: no le impone dependencias a
nadie, ni a sí mismo. El ensayo necesita red y un `pnpm install` de verdad, o sea
minutos y un cache. Corre a mano —igual que el banco de ESLint de
`marca-verificada`— y su salida va al PR.

**Consecuencia aceptada, y hay que decirla.** Un banco que corre a mano es un
banco que alguien puede no correr. Se mitiga en dos planos: las comprobaciones
ESTÁTICAS (scripts declarados, sin enmascaramiento, cobertura cableada, marcador
en ruta) sí corren en el CI del marco sin instalar nada, y son las que atrapan la
clase de regresión más probable — la edición de un manifiesto. El ensayo completo
es la red de la instalación real.

**Alternativa considerada y aplazada: un workflow programado que corra el ensayo
semanalmente.** Es la respuesta correcta al hueco «nadie comprueba que el stack
del esqueleto siga instalando» (Dependabot no ve el andamio). Queda como tarea
4.2 y no bloquea este change: primero que el ensayo exista y sea verde a mano.

## Lo que este design no resuelve

- **La versión de pnpm del andamio.** El esqueleto trae
  `"packageManager": "pnpm@9.15.0"`, y el propio `ci.yml` documenta que en 9.15
  un `--filter` con script ausente **sale 0** mientras en 11.18 sale 1. Las
  comprobaciones del marco ya no dependen de ese código de salida, así que el pin
  no es urgente; subirlo es cambio de dependencia y se pregunta antes.
- **Las versiones de todo lo demás.** React 18, Express 4, Prisma 7, vitest 2,
  Vite 6: son las del material de partida y se absorben como están. Actualizarlas
  es otro change, con su orden de riesgo.
- **Que el esqueleto envejezca.** Nada avisa cuando el stack del andamio queda
  atrás. Declarado en el proposal y con la tarea 4.2 como camino.
