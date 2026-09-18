---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — los-bancos-dicen-por-que

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `pruebas/porque.mjs` | no viaja (banco del marco) | Solo lo importan los bancos de este repo. El job `changelog-en-el-pr` ya declara que `pruebas/` no es superficie distribuida. |
| `pruebas/aserciones-con-evidencia.mjs` | no viaja (banco del marco) | En Rigel vive en `herramientas/`. Acá `herramientas/` es superficie que **viaja** (el job del CHANGELOG la cuenta), y esto es disciplina interna de los bancos. Ponerla ahí le exigiría CHANGELOG a cada ajuste y la haría parecer una herramienta del consumidor. Tampoco lleva el sufijo `.test.mjs`, porque el CI junta las suites con `pruebas/**/*.test.mjs`. |
| bancos nuevos (`pruebas/**/*.test.mjs`) | no viaja (banco del marco) | Caen bajo los patrones del CI, y eso lo vigila `pruebas/banco/integridad.test.mjs`. |
| `pruebas/marco-ci/util.mjs`, `extraer.mjs` | no viaja (banco del marco) | Son ayudantes de los bancos. |
| job `aserciones-con-evidencia` de `.github/workflows/ci.yml` | no viaja (CI propio) | `ci.yml` es el CI de Projects sobre sí mismo. Ningún consumidor lo hereda. |
| `.github/workflows/reproducir-intermitente.yml` | no viaja (CI propio) | Se dispara a mano, en este repo, sobre los bancos de este repo. |
| paso «Permisos del agente sin escritura» de `marco-ci.yml` | **referenciado** | Es el workflow reusable: el cambio llega a cada consumidor con su bump. Por eso es la única pieza con impacto en consumidores (ver el proposal). |
| delta de `calidad-codigo` | canónico | Contrato del marco. |

Ninguna pieza es scaffold ni regenerada: `plantilla/` no se toca.

## Decisiones

### D1. La herramienta mira el diff, y los bancos tocados enteros

**Elegido:** portar el diseño de Rigel. Se juzgan solo los `*.test.mjs` que el PR toca, y
esos **completos**, no solo las líneas nuevas. La deuda del árbol se publica en cada corrida.

**Descartado:**

- **Barrer el árbol entero.** Nacería rojo sobre 285 aserciones en 60 archivos, medidas el
  2026-09-17. Un rojo que no se puede cerrar se destraba con apuro.
- **Mirar solo las líneas agregadas.** Es más preciso, pero exige parsear hunks, y deja que
  un banco se toque cien veces sin que su deuda baje nunca. «El banco que tocás sale
  limpio» es la regla que hace bajar la deuda por área.
- **Estrenar en aviso.** Mismo argumento que el job del CHANGELOG: este check vive en el
  `ci.yml` de Projects y no le llega a ningún consumidor. D1 del PO también lo pide en rojo.

**Diff de tres puntos** (`BASE...CABEZA`), no de dos como en Rigel. `pull_request.base.sha`
es la punta de main al actualizarse el PR, no la base común. Con dos puntos, un banco que
cambió en main después de abrir el PR aparece como tocado, y el rojo cae sobre deuda
ajena. Lo prueba un caso del banco del paso con una mutación que vuelve a dos puntos.

**Un diff que falla no se lee como «no toca bancos».** La lista va a un archivo y no a una
sustitución de proceso, porque el código de salida de `< <(...)` se pierde. Tampoco se
declara verde sin la base en el clon.

### D2. El blanqueo reconoce los literales de regex (desvío respecto de Rigel)

La herramienta de Rigel, portada tal cual, se midió contra el AST de `acorn`. Se usó la
copia del caché de npx, solo lectura y fuera del repo: **no entra como dependencia**. Sobre
los 106 bancos, el AST contó **285** aserciones ciegas y la herramienta **246**. Las 39 que
faltaban eran todas reales, y venían después de una regex con una comilla. Se arregló con la
regla de cualquier lexer de JavaScript: una `/` abre una regex cuando lo anterior no puede
cerrar una expresión. Ahora las dos cuentas coinciden línea por línea en los 106 archivos.

**Descartado:**

- **Usar un parser de verdad.** Sería la primera dependencia de npm del marco, que corre con
  cero dependencias a propósito. Además AGENTS.md exige OK humano para agregar dependencias.
- **Dejarlo como en Rigel.** Un falso negativo del 14% es la dirección peligrosa: el check
  deja pasar justo lo que existe para frenar.

**Límite declarado:** no se sigue un template anidado dentro de `${}`. Sobre el árbol de hoy
no cambia el conteo, y la medición contra el AST lo acredita.

### D3. El instrumento reproduce la invocación de `ci.yml`, que acá son tres

En Rigel el CI corría todos los bancos juntos. En Projects, `ci.yml` hace tres invocaciones:
`actions/**/pruebas`, `pruebas/**` sin `pruebas/init`, y `pruebas/init` con techo por
archivo. La forma `banco` corre **el grupo del banco pedido**, con los patrones de `ci.yml`
letra por letra. Un banco del instrumento ata esos patrones, el techo por archivo, la versión
de Node y el `TOPE_MINUTOS` contra el `timeout-minutes`.

**Descartado:**

- **Un patrón único con todo.** Mediría una concurrencia que el CI no tiene.
- **`fetch-depth: 0` y `corepack enable` como en Rigel.** Allá el job real los tenía y acá
  no. Copiar el entorno de Rigel en vez del de Projects sería repetir su falso positivo al
  revés. La vuelta cero es la que delata una desalineación futura.
- **Una action de terceros nueva para los logs.** `actions/upload-artifact` ya está en el
  repo, pinada por SHA en el andamio (`330a01c…`, v5), y se reusa ese mismo SHA. El
  Dependabot del marco vigila `.github/workflows/`.

**Límite declarado:** el bash 3.2 de macOS no tiene `globstar`. En la forma `banco`, sobre
`pruebas/**` y `actions/**`, el paso se niega en voz alta. El banco del instrumento ejercita
esa negativa en macOS y la selección real en el runner de CI, que tiene bash 5. El
instrumento solo corre en `ubuntu-latest`.

### D4. Los dos lectores de `permiso` se atan corriendo el paso real

Se sigue la técnica de Rigel (ac55ddc): comparar comportamiento sobre una tabla, no texto.
Pero no se extrae una función del heredoc, como hizo Rigel con `norma`. Acá el predicado del
paso no es una expresión aislada: vive repartido en un bucle, así que se **corre el paso
entero** con un repo de juguete por entrada. El veredicto del paso sale del código de
salida, más la anotación `::warning file=.projects-desvios.json`. En modo aviso esa
anotación es la única diferencia observable entre un desvío completo y uno a medias, y es
lo que ve el consumidor.

El banco encontró cuatro discrepancias. **Se alinea la copia con la referencia**, no al
revés:

- **Fecha.** El paso pasa a usar exactamente el predicado de `esFecha`. Su propio comentario
  decía que ese era el objetivo, y la action es la que valida la forma («la forma se valida
  en UN solo lado»). Endurecer la action para que exija fechas existentes haría rojo lo que
  hoy pasa, y eso es breaking. Queda para v2, en los dos lectores a la vez.
- **Regla y permiso a la vez.** El paso **avisa**. El modo aviso del change
  `un-solo-predicado-del-desvio` se respeta: sigue absorbiendo.

**Descartado:**

- **Declarar las discrepancias como «conocidas» en el banco.** Dejaría vivo un aviso que
  afirma algo falso.
- **Refactorizar el heredoc a una función extraíble.** Toca más líneas de un archivo
  referenciado sin cambiar nada observable, y el paso real ya es extraíble tal cual.

**Límite declarado:** la tabla es de cadenas. Con valores que no son cadena, la action hace
`String()` y el paso los descarta. Queda como pendiente.

### D5. El extractor corta en cualquier ítem de la lista y en el fin de la lista

Rigel corta en `- (name|id|uses|with|if):` con la sangría fija de 6 espacios. Acá la sangría
se toma **del paso pedido**, porque el mismo extractor lee `marco-ci.yml`, `ci.yml` y el
andamio. Se corta en **cualquier** `- ` a esa sangría y en cualquier línea de sangría menor.
Rigel no cubría ese segundo borde: el último paso de un job sin `run:` se llevaba el del job
siguiente. Hay un caso rojo para cada borde, más una propiedad sobre los workflows reales,
calculada por otro camino: del `run:` hacia atrás hasta su ítem.

### D6. Continuaciones: lo que no es continuación no se marca

El control de Rigel marcaba toda línea terminada en `\`. Acá se excluyen dos formas que
bash no toma por continuación: una línea que es un comentario, y un número par de barras.
Un control que caza lo correcto enseña a ignorarlo.

## Cómo se hace cumplir solo

| Propiedad | Check que falla sin que nadie se acuerde |
|---|---|
| aserción que tapa su evidencia | job `aserciones-con-evidencia` de `ci.yml`, más `pruebas/banco/aserciones-con-evidencia.test.mjs` y `pruebas/ci-del-marco/aserciones-en-el-pr.test.mjs` |
| el veredicto no depende de la máquina | `pruebas/marco-ci/util-aisla-la-config.test.mjs` (fuerza la config global que dispara el defecto) |
| el instrumento distingue su entorno | `pruebas/banco/reproducir-intermitente.test.mjs` (ata patrones, techo, Node y tope) |
| dos lectores de `permiso` | `pruebas/marco-ci/desvio-de-permiso-una-sola-norma.test.mjs` |
| el extractor devuelve el paso pedido | `pruebas/marco-ci/extraer.test.mjs` |
| continuaciones cortadas | `pruebas/marco-ci/sintaxis-de-los-run.test.mjs` |

**Deuda declarada, que depende de alguien:** la tabla del banco de `permiso` la escribe una
persona. Una grafía nueva que nadie agregue no se compara. Es el límite de toda tabla, y el
de Rigel es el mismo.

Nada de afuera del change depende de una ruta dentro de `openspec/changes/los-bancos-dicen-por-que/`.
