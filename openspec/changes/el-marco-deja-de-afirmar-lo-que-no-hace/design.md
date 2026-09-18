---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — el-marco-deja-de-afirmar-lo-que-no-hace

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
| --- | --- | --- |
| `actions/cobertura-diff/medir-cobertura-diff.mjs`, `action.yml` | Referenciado | Es la action que los consumidores invocan por versión exacta: el arreglo tiene que viajar con el PR de bump, sin que nadie copie nada. |
| `.github/workflows/marco-ci.yml` (paso del umbral, paso «Detectar el carril de docs», prosa del piso y del encabezado) | Referenciado | Es el workflow reusable. El aviso del carril tiene que vivir donde se decide el carril; el paso del umbral solo actúa en el repositorio que distribuye el andamio y se omite, diciéndolo, en un consumidor. |
| `plantilla/.github/workflows/ci.yml` | Scaffold | El `upload-artifact` es del job `constitucion` del proyecto, que el andamio copia una vez. No se puede mover a lo referenciado sin cambiar quién manda sobre el job (pregunta primero, `AGENTS.md`) y sin que el job deje de ver el `steps.*.outputs` de la action. Por eso el arreglo para los repos ya nacidos va en «Para consumidores». |
| `plantilla/api/src/lib/log.ts`, `log.test.ts` | Scaffold | Son código del proyecto desde el día uno. |
| `plantilla/.claude/skills/projects-archive-change/SKILL.md` | Scaffold | La skill `projects-*` no la genera el CLI de OpenSpec (no es regenerado): se copia una vez. |
| `openspec/changes/.../specs/*` | Canónico | Los requirements viven solo en Projects; los consumidores los cumplen. |
| `AGENTS.md`, `.claude/skills/projects-archive-change/SKILL.md`, `actions/README.md`, `.github/workflows/ci.yml`, `openspec/cobertura-de-requirements.md` | No viaja | Constitución, herramienta y documentación del propio marco. `actions/README.md` lo lee el consumidor en GitHub, pero no se copia. |
| Bancos (`pruebas/**`, `actions/*/pruebas/**`) | No viaja | Corren en el CI de Projects. |

## D1 — Los mensajes nombran `coverage.include`, y la forma vieja solo como historia

Se trae el texto de Rigel (`fabe1e6`) con `rigel.*` → `projects.*`. La forma vieja
queda entre paréntesis con «en vitest 2.x era `all: true`» en tres de los siete
mensajes porque un consumidor que conoce la opción la va a buscar; en los otros
cuatro se nombra solo el mecanismo vigente.

**Descartada: borrar toda mención de `all: true`.** El que llega con la opción en
la cabeza no encuentra el puente, y la busca igual en la documentación vieja.
**Descartada: dejar los mensajes y documentar en el README.** El mensaje es lo
único que se lee cuando el check está rojo.

## D2 — El paso del umbral lee líneas de código, con `grep`, y no importa la config

El paso descarta las líneas que empiezan con `//`, `*` o `/*` y exige ahí las
cuatro métricas y un `include: [`. `all: true` sale de la lista.

**Descartada: importar `vitest.config.base.mjs` con node y leer el objeto que
devuelve `coberturaDelMarco()`.** Sería más fuerte (lee la configuración efectiva,
no su texto), pero ejecuta un archivo del árbol del PR dentro de `higiene`, y el
encabezado del job `cambios` promete que bajo `pull_request_target` ningún job del
marco ejecuta código del PR. El paso solo actúa en el distribuidor, que no usa ese
evento, pero una promesa con excepciones deja de ser verificable. Límite declarado
en el paso y en el banco: un comentario de bloque cuyas líneas no empiecen con `*`
se leería como código; el andamio no escribe así.

## D3 — La exención de cobertura es por la ruta `.github/`, no por el alcance del paquete

`archivo === ".github" || archivo.startsWith(".github/")`, después de anotarlo en
`noReclamados` (el resumen lo lista como fuera de la medición) y con un
`::notice::` propio que nombra hasta cinco archivos.

**Descartada: «fuera de todo paquete».** Fue el primer arreglo de Rigel y quedó
inerte: con un `package.json` en la raíz, todo archivo cae en algún paquete. Se
reprodujo acá con un sabotaje (tarea 2.3). **Descartada: pedirle a cada
consumidor que declare la exclusión en `projects.cobertura.excluidos`.** Pone en
cada repo una carga que la plataforma ya define, y el archivo de raíz de
`.github/` no pertenece al manifiesto de ningún paquete de aplicación.

## D4 — `startup_failure` se cita de la medición de Rigel, no se reproduce acá

La corrida 33971175258 de Rigel midió el caso exacto que importa para los
consumidores de Projects: un reusable que declara el alcance en su **encabezado**
—como `marco-ci.yml` desde su primer commit (`d243235`)— y un llamador que no lo
concede, por ruta local; los ocho repositorios con `uses:` remoto ya lo confirmaban.
Reproducirlo desde esta sesión exige escribir en otro repositorio o abrir un PR
experimental en este, y las dos cosas son actos que esta sesión no hace. Queda
como tarea abierta (4.3): un PR del marco con el pedido temporal, al estilo de
`9ab7b24`/`b18889b`.

**Qué NO se tocó, y por qué.** El `::warning::` de ejecución «pinta a permisos: el
workflow llamador debe declarar...» del paso de detección sigue igual: con el
permiso declarado, la falta de concesión no llega a ese paso, así que ese 403 viene
de otra causa, y cuál es no está medido. Reescribirlo sin medir sería repetir el
defecto que este change corrige.

## D5 — `actions/README.md` dice cuál es el canal, y fecha lo que midió de `v1`

La sección Versionado afirma el canal (versión exacta + PR de Dependabot), dice que
`v1` existe pero no avanza con cada release, y deja «el 2026-09-17 apuntaba a la
`v1.8.0`» como medición fechada.

**Descartada: el banco de Rigel que exige nombrar el SHA congelado.** Allá la línea
1.x está cerrada y `v1` congelado; acá si se congela o se vuelve a mover es una
decisión pendiente (change `guardrail-deltas-por-version-exacta`). Exigir un SHA
como hecho permanente sería escribir una afirmación que una decisión futura puede
volver falsa. Las frases vencidas van a `FALSAS_DEL_CANAL` en
`pruebas/andamio/pinado.test.mjs`, junto a las otras dos listas de esa clase.

## D6 — La prosa del guardrail de deltas se deriva de correrlo

`pruebas/docs/huecos-del-guardrail-de-deltas.test.mjs` corre el guardrail sobre
dos árboles de juguete (el `MODIFIED` huérfano y el `ADDED` duplicado) y exige que
cuatro superficies digan lo que el guardrail hace: ninguna puede decir que el
huérfano no se caza, y todas tienen que nombrar el hueco del `ADDED` **mientras**
exista. El día que el guardrail lo cierre, el caso se da vuelta y exige sacar la
frase.

**Descartada: cerrar el hueco del `ADDED` en el guardrail en este change.** Es una
compuerta nueva en una action referenciada, fuera de lo que este lote corrige
(prosa vencida); queda como pendiente con destino propio.

## D7 — El carril: la mitad compatible es el aviso; el default queda para `v2`

El aviso sale cuando `solo_docs=true` y algún archivo del cambio vive en un
**subdirectorio** de `.github/` y no termina en `.md`. Ese criterio es exactamente
el conjunto que el default de la `v2` (`^\.github/[^/]*$`, con `\.md$` al lado)
sacaría del carril: el aviso anticipa, archivo por archivo, lo que va a cambiar. El
texto trae el arreglo que el consumidor puede aplicar hoy en su `ci.yml` (pasar
`rutas_carril_docs` con esa línea), sin esperar a la mayor.

Para poder probarlo, el paso ganó un `name:`. El `id` no cambia —las salidas del job
lo leen por `id`— y el nombre de un paso no publica ningún check. Eso saldó la
entrada «(sin name, id: detectar)» de la deuda de `cobertura-de-los-pasos`.

**Descartada: cambiar el default ya.** Un consumidor que mergea el bump sin leerlo
empezaría a correr el build en PRs que hoy lo saltean, y ese build puede estar
rojo: es la definición de breaking de `AGENTS.md`, y D1 del PO manda juntar los
breaking en la línea `v2`. **Descartada: avisar por todo `.github/`.** CODEOWNERS,
`dependabot.yml` y la documentación no definen la verificación; un aviso en cada PR
que los toca enseña a ignorarlo.

## D8 — El artifact: `include-hidden-files: true` y `if-no-files-found: error`

Las dos líneas de Rigel (`06a9c94`). Antes de endurecer a `error` se midió que una
corrida **verde** deja el directorio lleno (tarea 1.4): la action lo escribe siempre
en modo verificar.

**Descartada: que la action escriba en un directorio no oculto.** Cambia el output
`corregidos` de una action referenciada y no arregla a quien ya copió el scaffold; y
las rutas ocultas son la ubicación real de esos archivos en el repo, que es lo que
hay que commitear.

## D9 — `log.ts`: se corrige la promesa; el filtro no se porta

El comentario deja de afirmar un filtro y su mecanismo, dice que hoy nadie lee el
campo y nombra el requirement que fija cómo tiene que leerse. El predicado de
niveles de Rigel (`filtro-de-niveles.mjs`) vive en `one-off-ecs`, que el PO dejó
fuera hasta que haya un consumidor sobre ECS (decisión D4/D5): conectarlo a la
verificación posterior al despliegue de cada adaptador es trabajo propio.

## Qué lo hace cumplir solo

| Defecto | Check que se pone rojo |
| --- | --- |
| Artifact vacío | `pruebas/andamio/artefacto-de-la-constitucion.test.mjs`: toda subida de artifact declara `include-hidden-files`; la de `constitucion-al-dia` con `true` y `error`; y una corrida verde de la action deja el directorio con archivos, todos ocultos. |
| Consejo `all: true` | `actions/cobertura-diff/pruebas/cobertura-diff.test.mjs`: ningún mensaje, cabecera ni párrafo del README lo dicta salvo como historia; el mensaje real del archivo sin datos nombra `coverage.include`. |
| Umbral leyendo comentarios | `pruebas/marco-ci/umbral-del-andamio.test.mjs`, que corre el texto del paso extraído del YAML. |
| `.github/` rojo por cobertura | Dos casos nuevos en `cobertura-diff.test.mjs`, con `package.json` raíz: el de `.github/` verde y nombrado, el de aplicación rojo. |
| Prosa del piso | `pruebas/andamio/piso-del-reusable.test.mjs`: las frases del fail-open, fuera; `startup_failure`, nombrado en los tres archivos. |
| `@v1` como canal | `FALSAS_DEL_CANAL` en `pruebas/andamio/pinado.test.mjs`. |
| Huecos del guardrail | `pruebas/docs/huecos-del-guardrail-de-deltas.test.mjs`. |
| Carril mudo | `pruebas/marco-ci/deteccion-del-carril.test.mjs`, que corre el paso con el default leído del YAML. |
| Filtro inventado | `pruebas/andamio/el-log-no-promete-un-filtro.test.mjs`. |

**Lo que depende de que alguien se acuerde, dicho como deuda.** Las listas de frases
falsas cazan las formas exactas que existieron, no la idea: una redacción nueva la
ve el review. El scaffold ya copiado en los tres consumidores no se arregla solo:
depende de que lean «Para consumidores».

## Riesgos

- **Otro carril toca lo mismo.** El lote 17 porta de Rigel un banco del paso del
  umbral y saca su entrada de la deuda; acá la entrada ya salió y el banco ya existe
  (`umbral-del-andamio.test.mjs`), con la clave `include` y no `all: true`: al
  integrar, el banco de Rigel tiene que adaptarse o descartarse. El lote 38 cambia
  el default del carril: el primer caso de `deteccion-del-carril.test.mjs` fija el
  default actual y se tiene que reescribir ahí, a propósito.
- **`if-no-files-found: error` en un proyecto nuevo.** Si la action falla antes de
  escribir sus salidas, la subida también falla; el job ya estaba rojo en ese caso.

## Revisión

Pendiente: revisión adversarial con lentes independientes, registrada en este
change antes del archive (desvío declarado del marco: un solo mantenedor).
