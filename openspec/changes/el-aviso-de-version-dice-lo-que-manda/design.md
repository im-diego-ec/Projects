---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — el-aviso-de-version-dice-lo-que-manda

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `actions/aviso-version/aviso-version.mjs` | **referenciado** | Ya lo era: `actions/README.md` publica `uses: im-diego-ec/Projects/actions/aviso-version@vX.Y.Z`. Los arreglos viven en el script que viaja con la action, así que un repo que la use los recibe con el bump, sin copiar nada. |
| `actions/aviso-version/action.yml` (input `limite` sin `default`) | **referenciado** | Mismo motivo. Es la única línea de contrato que se toca: ver la decisión 2. |
| `herramientas/aviso-entra-en-el-mensaje.mjs` | **canónico** (vive sólo en este repo, no viaja) | Mide el `CHANGELOG.md` del marco, cuya convención —«Para consumidores» por versión— es del marco. Hacerlo referenciado (un paso de `marco-ci.yml`) le impondría esa convención a los changelogs de los consumidores: sería un rojo nuevo en repos ajenos por una regla que nadie les pidió. Se descartó. |
| Paso nuevo en el job `changelog-en-el-pr` de `.github/workflows/ci.yml` | **canónico** | Es el CI propio del marco; `changelog-en-el-pr` ya excluye `ci.yml` de las superficies que viajan. |
| `.github/workflows/aviso-version.yml` (`run-name`, `::warning::`) | **canónico** | Workflow propio del marco; nadie lo hereda. |
| `.claude/skills/projects-release/SKILL.md` | **canónico** | Skill del procedimiento de release del marco. No se reparte: `plantilla/.claude/skills/` sólo trae `projects-archive-change`, y no es un artefacto que genere el CLI (no hay `generatedBy`). |
| `pruebas/ci-del-marco/{aviso-entra-en-el-mensaje,placeholder-del-release,el-simulacro-avisa}.test.mjs` y los casos nuevos de `actions/aviso-version/pruebas/` | **canónico** | Bancos del marco. Los recoge el `ci.yml` por los patrones que ya existen (`pruebas/**/*.test.mjs`, `actions/**/pruebas/*.test.mjs`). |
| `actions/README.md` | **canónico** (documentación de lo referenciado) | Describe el contrato de la action. |
| Normalización del `CHANGELOG.md` | **canónico** | Superficie del marco. Entregada como parche, ver la decisión 8. |

Nada de esto es **scaffold** ni **regenerado**: ningún archivo de `plantilla/` cambia y
ningún artefacto del CLI de OpenSpec se toca.

## Decisiones, con las alternativas descartadas

### 1. La capability: `pipeline-entrega`, con requirements ADDED

El aviso de versión no tenía spec: la auditoría de cierre de v1
(`docs/16-auditoria-cierre-v1.md`, hallazgo 17) lo anotó como uno de los
comportamientos que «no se pueden auditar contra nada, porque no hay contra qué».

- **Elegida: `pipeline-entrega`.** Anunciar una versión a quienes la consumen es la
  última etapa de la entrega del repositorio que publica, y los requirements están
  escritos para cualquier repo que use el aviso, no para el marco en particular.
- **Descartada: una capability nueva `aviso-de-version`.** Es la ubicación más
  limpia, pero una capability en vuelo obliga a editar
  `openspec/cobertura-de-requirements.md` (la cuenta y la sección de capabilities en
  vuelo), que el lote 18 del porte reescribe en paralelo; y una capability de una sola
  action es demasiado angosta para durar.
- **Descartada: `calidad-codigo`.** Su propósito es lint, formato y scripts de
  verificación; el aviso no es calidad de código.
- **Descartada: `gobierno-contribucion`.** Es la capability de la gobernanza del
  trabajo, con gate del PO; esto es maquinaria.

Los cuatro títulos son nuevos: verificado a mano que ninguno existe en
`openspec/specs/` ni en otro change (`grep -rlF "Requirement: <título>"` → 0 en los
cuatro). No hay MODIFIED, así que ningún escenario vigente puede perderse en el archive.

### 2. El límite: quitar el `default`, no igualarlo ni subirlo

- **Elegida: `action.yml` sin `default` para `limite`**; un vacío cae en
  `LIMITE_POR_DEFECTO`. El banco exige la ausencia (`declarado === null`).
- **Descartada: aceptar un `default` igual a la constante**, que es lo que acepta el
  banco de Rigel. Hoy coinciden y el banco quedaría verde con el número en dos lugares:
  la propiedad que se quiere es «un número, un lugar», no «dos números iguales hoy».
- **Descartada: subir a 7000.** Rigel lo midió contra su destino. El de Projects no
  existe todavía (`AVISO_VERSION_DESTINO` sin configurar, `docs/16`, hallazgo 12) y el
  campo es configurable por `vars.AVISO_VERSION_CAMPO`.

**Contrato:** el valor efectivo no cambia (vacío → 3500 por la constante; explícito →
el explícito), y lo prueba el caso de exactitud, que arma el aviso con el límite que
sale de `action.yml` y lo compara con lo que mide la compuerta. Por eso es **patch** y
no «cambiar un default de forma que cambie el comportamiento». Si el PO lee el
`default` como contrato en sí mismo, el punto pasa por su OK.

### 3. El canal del preámbulo, atado a la configuración y no a una frase

- **Elegida:** el banco lee `plantilla/.github/dependabot.yml` y decide si el andamio
  recibe el marco por Dependabot (una entrada `github-actions` con el grupo `marco`
  cuyo patrón es `{{ORG_MARCO}}/Projects*`, y sin `ignore` que lo saque). El preámbulo
  nombra Dependabot si y sólo si eso es verdad. Una refutación muta el archivo y
  muestra el rojo.
- **Descartada: copiar el texto de Rigel.** Nombra `actualizar-marco.yml` como canal,
  y acá no lo es (decisión D2 del PO).
- **Descartada: atarlo a la prosa de `AGENTS.md` o del `CHANGELOG.md`.** Es prosa: la
  que se tiene que mantener al día es justamente la que el banco quiere dejar de
  depender de alguien que se acuerde.

### 4. Un solo dialecto

La compuerta de Rigel mide `markdown` y `mrkdwn` porque su aviso traduce. El de Projects
manda Markdown tal cual (`action.yml`, «LIMITES DECLARADOS»), así que se mide una vez.
Cuando el lote 36 agregue el dialecto, la compuerta tiene que medir los dos: queda
escrito en su encabezado y en el banco.

**Cerrado por el change `el-aviso-habla-el-dialecto-del-destino` (lote 36):** la
compuerta mide cada dialecto que la action acepta (`FORMATOS`, importado de ella) y
nombra el que no entra. Esta decisión queda como estaba cuando se tomó.

### 5. Dónde corre la compuerta

- **Elegida: un paso del job `changelog-en-el-pr`**, sólo en pull requests, después
  del paso que exige tocar el CHANGELOG, con `actions/setup-node` al mismo SHA que ya
  usa el archivo (ninguna action nueva). Rojo desde el primer día, por el mismo
  argumento del paso vecino: no viaja a ningún consumidor.
- **Descartada: el job `pruebas-actions`**, que corre también en push a `main`, donde
  el PR ya se mergeó y el rojo llega tarde.
- **Descartada: `marco-ci.yml`**, por el motivo de la tabla: viajaría a los consumidores.

Permisos, auditados acción por acción: el job ya declara `contents: read` y
`pull-requests: read`. `actions/checkout` necesita `contents: read`;
`actions/setup-node` no llama a la API con permisos del repo; el paso nuevo sólo lee un
archivo del árbol. **No se agrega ningún permiso.**

### 6. Los enlaces, en una función exportada

Los dos enlaces cuentan para el límite. Rigel los rearmaba en la compuerta y un
`blob/main` en vez de `blob/vX.Y.Z` le hizo medir tres caracteres de menos. Acá
`enlacesDelRelease()` vive en `aviso-version.mjs`, `main()` la usa y la compuerta la
importa: un solo lugar, y el literal de la cuenta sigue apareciendo una sola vez en ese
archivo, que es donde `docs/15-forkear-el-marco.md` manda a buscarlo.

### 7. El «soy el programa principal», por `realpath`

Rigel usa `process.argv[1].endsWith(...)`. Una comparación literal que contesta «no soy
el principal» termina en `exit 0` sin medir nada — en un paso de CI, un verde mudo. Se
usa la misma comparación por `realpath` que ya tiene `aviso-version.mjs`.

### 8. La normalización del `CHANGELOG.md`, como parche

El lote pedía normalizar `[No publicado]` y las 1.9.x en el mismo PR que la compuerta,
porque si no la compuerta nace roja. Pero el porte corre en carriles paralelos que no
editan `CHANGELOG.md`: cada lote deja un fragmento en `.porte/changelog/` y la
integración los funde. Editar el archivo acá garantizaba un conflicto con esa fusión.

Así que la normalización queda **preparada y medida, no aplicada**:
`.porte/08-normalizar-changelog.patch` agrega `### Para consumidores` a
`[No publicado]` (un borrador que la integración tiene que completar con los fragmentos
de los demás lotes) y a cada entrada de la 1.9.0 a la 1.9.6. Aplicado sobre el árbol de
este commit, `git apply --check` pasa y la compuerta sale 0 (`[No publicado]` 1457
caracteres, `[1.9.6]` 552). **Mientras no se aplique, el paso nuevo del CI es rojo** —
que es lo correcto: ese rojo es la compuerta viendo el defecto que motivó el lote.

Las 1.9.x se normalizan aunque la compuerta sólo mida la más alta: el botón del
workflow puede reenviar cualquier versión, y como el destino nunca existió, ninguna se
avisó todavía. Se agrega una sección nueva; el texto publicado de cada versión no cambia.

### 9. El simulacro sigue siendo el default

El arreglo es sobre la señal (`::warning::` y `run-name`), no sobre el default. Bajarlo a
`false` haría que un dispatch descuidado le mande un mensaje al canal de todos los
consumidores, que es peor que un verde que no envió. El banco fija el default.

## Decisiones de la revisión adversarial (2026-09-17)

La revisión encontró cuatro verdes mudos en la compuerta y uno en el emisor. Cada
decisión nombra el hallazgo que la motivó (FO-H1…H4, RV-L4-01…03).

### 10. Qué versiones se miden: las que el PR cambia, medido por lo que su aviso mandaría

La compuerta medía `[No publicado]` y la versión más alta, y declaraba residuo al resto
porque «su mensaje ya salió (o no salió nunca)». Es falso para un backport: cortar la
1.9.7 cuando ya existe la 2.0.0 deja un texto final que el `release` manda apenas se
publique el tag (FO-H2).

- **Elegida: con el `CHANGELOG.md` del commit base del PR, medir además toda versión
  cuyo aviso cambia** —nueva, o que armaría otro mensaje en algún dialecto, o que
  cambiaría el veredicto del centinela—. El paso del CI saca la base con `git show` y la
  pasa como segundo argumento; sin ella, la compuerta mide lo de siempre y lo dice con
  un `::notice::`.
- **Descartada: medir todas las versiones.** Pone rojo cualquier PR por historia que
  no escribió (la 1.3.0 tiene un resumen de 8810 caracteres).
- **Descartada: medir las versiones cuyo CUERPO cambia**, que era la sugerencia de la
  revisión. Una errata en el detalle de una versión vieja la pondría en rojo por un
  resumen escrito antes de esta compuerta, y esa errata no cambia una letra de lo que
  el aviso mandaría. Medir el mensaje mide exactamente lo que el PR escribe del aviso.
- **Descartada: sólo declarar el límite** en el `::notice::`. Deja el backport verde en
  el único PR donde se podía ver.

**Lo que ya encontró:** con los dos parches del porte aplicados, la integración cambia
las 1.9.x, y la 1.9.4 decía «Nada que hacer en el pipeline»: jerga que la compuerta
vieja no veía porque sólo medía la 1.9.6. El parche quedó corregido.

### 11. El resumen vacío: rojo en la compuerta, advertencia en la action

Un `### Para consumidores` sin texto EXISTE, así que no caía en «ausente», y el aviso
mandaba «Qué tiene que hacer un consumidor:» con nada debajo, con la compuerta verde y
la action sin una advertencia (FO-H1, RV-L4-01).

- **Elegida:** la action devuelve `paraConsumidoresVacia` desde `construirMensaje` (un
  predicado, un lugar), emite `::warning::` y lo dice en el resumen de la corrida; la
  compuerta usa ese mismo campo y pone rojo con el arreglo «escribirla». Vacío es sin
  texto, o sólo espacios y comentarios HTML.
- **Diferida, con OK humano: que el mensaje caiga a la rama sin resumen.** Es lo
  coherente con el fail-open de la ausencia, pero cambia el texto que llega al canal y
  la salida `sin_para_consumidores` de una pieza referenciada. El `::warning::` es un
  fail-open ruidoso, que AGENTS.md pide sin preguntar; el cambio de mensaje, no (tarea
  9.9).

### 12. El centinela compara palabras, y la compañía es cualquier cambio

- **El texto de fábrica se reconoce por sus palabras**: sin acentos, puntuación, marcas
  de énfasis ni caja. Sacarle el punto final apagaba el centinela (FO-H4). Se descartó
  buscar «nada» o una distancia de edición: «Nada que hacer hoy.» escrito por una
  persona es suyo y tiene que seguir verde.
- **La compañía es cualquier cambio declarado**, no sólo un `###`: viñetas sueltas bajo
  el encabezado de la versión, o bajo un pseudo-título en negrita, también cuentan
  (RV-L4-03). Comentarios, separadores y líneas vacías no.

### 13. El paso del CI y la guarda de «programa principal» tienen banco

Borrar el paso, cambiar su `run` por `echo`, o romper la guarda con `if (false)` dejaba
toda la suite verde (RV-L4-02). El banco extrae el paso por su nombre
(`scriptDelPaso`, el mismo extractor del paso vecino) y lo corre sobre un repositorio de
prueba con base y cabeza; y lanza la herramienta como proceso por una ruta con `..`
sobre un changelog rojo. Para eso el paso pasó a un bloque `run: |`.

## Qué hace cumplir esto solo

| Propiedad | Compuerta que falla sola |
|---|---|
| El aviso de la próxima versión trae su resumen, con texto, sin texto de fábrica sobre cambios, y entra | Paso «El aviso de la proxima version dice que hacer, sin jerga, y entra sin recortarse» del `ci.yml` (job `changelog-en-el-pr`) |
| Ese paso existe, invoca la compuerta y le pasa la base del PR; la compuerta corre como programa | `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs` (el paso extraído por nombre y corrido sobre un repositorio de prueba; la herramienta lanzada por una ruta con `..`) |
| La compuerta mide el mensaje real, con el límite real | `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs` (exactitud contra el payload de la action y «el límite vive en UN lugar») |
| El placeholder de la skill de release pasa la compuerta y es el que reconoce el centinela | `pruebas/ci-del-marco/placeholder-del-release.test.mjs` |
| BREAKING entero, puntero derivado, canal atado al andamio, consejo según la rama | `actions/aviso-version/pruebas/aviso-version.test.mjs` |
| El simulacro avisa y el default se conserva | `pruebas/ci-del-marco/el-simulacro-avisa.test.mjs` |

Todos los bancos se escribieron primero y se vieron rojos contra el código anterior
(evidencia en `tasks.md`).

## Residuo declarado

- **Una versión cuyo aviso el PR no cambia no se mide.** Si ya estaba mal, el botón que
  la reenvía es un acto deliberado de alguien que la está leyendo; la compuerta no
  re-litiga historia que el PR no escribió (decisión 10).
- **Sin la base del PR, la compuerta mide sólo `[No publicado]` y la más alta**, y lo
  dice con un `::notice::`. Es el caso de correrla a mano sin el segundo argumento; el
  CI la pasa siempre y el banco del paso lo exige.
- **Una sección «Para consumidores» vacía sigue saliendo vacía** si alguien la manda con
  el botón: la action la advierte y no la reemplaza (decisión 11, tarea 9.9).
- **El banco del simulacro verifica que las señales estén escritas**, no que GitHub las
  renderice: correr el workflow exige un dispatch real.
- **Una viñeta BREAKING con un segundo párrafo** lleva al aviso sólo el primero; el
  resto sigue en el CHANGELOG, que el mensaje enlaza.
- **La compuerta no juzga si el resumen es bueno**, sólo que exista, que tenga texto,
  que no sea el texto de fábrica encima de cambios, que no use jerga y que entre.
- **El borrador de «Para consumidores» de `[No publicado]`** del parche trae las notas de
  los tres lotes de este carril (8, 36 y 10); la integración del porte lo tiene que
  completar con las de los demás carriles, y el encabezado del parche lo dice. La
  compuerta cobra que exista, tenga texto, entre y no use jerga; que esté completo no lo
  puede medir ninguna máquina, así que queda como paso de la integración (tarea 6.3).
