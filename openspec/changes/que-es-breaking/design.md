---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — que-es-breaking

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `AGENTS.md` (MINOR, MAJOR, «Qué es BREAKING») | **canónico del marco, no viaja** | Gobierna cómo se cambia Projects. Un consumidor no lo lee ni lo recibe: la constitución que viaja es `actions/constitucion/canonico/`, y su `20-marco-version.md` ya dice lo que la regla nueva necesita («si un check nuevo pone este repo en rojo, el rojo aparece dentro de ese PR»), así que no se toca y no hay entrada nueva en su ledger. |
| `.github/PULL_REQUEST_TEMPLATE.md` | **canónico del marco, no viaja** | Es la plantilla de los PRs de ESTE repo. La que reciben los proyectos es `plantilla/.github/PULL_REQUEST_TEMPLATE.md`, que no clasifica incompatibilidades del marco y no cambia. |
| `.claude/skills/projects-release/SKILL.md` | **canónico del marco, no viaja** | Runbook del release del marco; no está en `plantilla/` ni es regenerado por el CLI de OpenSpec. |
| `docs/02-glosario.md`, `docs/11-reglas-no-escritas.md` | **canónico del marco, no viaja** | Documentación del marco. |
| `herramientas/aviso-entra-en-el-mensaje.mjs` y su paso en `.github/workflows/ci.yml` | **canónico del marco, no viaja** | Mide el `CHANGELOG.md` del marco en su CI propio (job `changelog-en-el-pr`). Hacerlo referenciado le impondría a los consumidores la convención de «Para consumidores», que es del marco: mismo criterio que fijaron los lotes 8 y 36. |
| `pruebas/ci-del-marco/que-es-breaking.test.mjs` y los casos nuevos de `aviso-entra-en-el-mensaje.test.mjs` | **canónico del marco, no viaja** | Bancos del marco, recogidos por `pruebas/**/*.test.mjs` del CI. |
| Delta de `pipeline-entrega` | **canónico** | Es el contrato de cómo el marco clasifica lo que publica, al lado de los requirements del aviso de versión que agregan los lotes 8 y 36. |
| Preámbulo y viñeta de `CHANGELOG.md` | **canónico del marco** (lo leen los consumidores) | Viaja como `.porte/10-que-es-breaking.patch` porque los carriles del porte no editan `CHANGELOG.md`; lo aplica la integración. |

Nada es **scaffold** ni **regenerado**, y ninguna pieza **referenciada** cambia: ni
`marco-ci.yml` ni ninguna action.

## Decisiones, con las alternativas descartadas

### 1. Cinco casos, no cuatro: el arreglo fuera del repositorio es un caso de la lista

- **Elegida: el caso 5, «Exigir algo que solo se arregla fuera del repositorio del
  consumidor»**, con sus dos salidas escritas (modo aviso ruidoso que se endurece en la
  mayor siguiente, o la mayor directo). Es la excepción de la D1 del PO.
- **Descartada: la lista de Rigel tal cual (cuatro casos).** Una compuerta cuyo arreglo
  es el ruleset o un secreto de la organización quedaría clasificada MINOR y se
  estrenaría en rojo, dentro de un PR de bump que ningún commit puede poner verde. Es
  exactamente el PR «que nadie mergea» del que avisa el catálogo del porte.
- **Descartada: mantener la regla vieja.** Es la alternativa que la D1 cerró.
- **Descartada: sin lista, solo la pregunta.** «Ante la duda, es breaking» aplicado a
  una pregunta abierta vuelve a clasificar todo como incompatible; la lista cerrada es
  lo que hace que la duda tenga fondo.

### 2. La pregunta decide las compuertas; no se afirma que una propiedad une la lista

- **Elegida: dos familias escritas como tales.** Los casos 1 a 4 son el contrato
  publicado de una pieza referenciada y son incompatibles aunque alguno se arregle en el
  propio `ci.yml`; el caso 5 es la frontera de las compuertas, y lo decide la pregunta
  «¿puede el consumidor volver a verde con cambios propios dentro de su PR de bump?».
- **Descartada: la redacción de Rigel, «lo que la une es una sola propiedad»**. Es falsa
  para su propio caso 1: renombrar un `input` se arregla editando el `with:` del
  consumidor dentro del PR. Escribir una unidad que no existe enseña a clasificar por la
  propiedad y a sacar de la lista lo que la contradice.

### 3. Un cambio de andamio no es incompatible

- **Elegida: escrito como regla**, con el anuncio igual en «Para consumidores» y la copia
  manual para quien la quiera. `plantilla/` se copia una vez y no viaja por el PR de
  bump: no le puede romper nada a un consumidor que ya existe.
- **Descartada: dejarlo implícito.** La viñeta de `CHANGELOG.md:74-77` muestra que sin
  la frase escrita se clasifica mal: declaraba BREAKING un cambio de andamio.

### 4. El lenguaje de «Para consumidores» se cobra en la compuerta del aviso

- **Elegida: cuarta causa de rojo en `herramientas/aviso-entra-en-el-mensaje.mjs`**,
  con `SIN_TRADUCCION`, `jergaDeOficio` y `jergaPorForma` importadas de
  `pruebas/docs/lectura.mjs`. Mide las dos secciones que la compuerta ya medía
  (`[No publicado]` y la versión más alta), solo la prosa de `### Para consumidores` y
  fuera de backticks. Un hallazgo por sección, no por dialecto. Excluyente con la falta
  de la sección y con el texto de fábrica; compatible con el recorte.
- **Descartada: una lista propia en la herramienta.** Dos listas divergen; la palabra
  que se agregue en docs quedaría permitida acá. Un caso del banco recorre la lista
  entera de `lectura.mjs` y exige que cada palabra se cobre.
- **Descartada: exigir enlaces al glosario, como en `docs/`.** La sección viaja al PR de
  Dependabot y al canal del aviso, donde una ruta relativa a `docs/02-glosario.md` no
  resuelve. Se cobra solo la jerga de oficio; los términos propios del marco (andamio,
  compuerta, pin) quedan permitidos sin enlace. Residuo declarado.
- **Descartada: aviso en vez de rojo.** La compuerta vive en el CI del marco y solo
  afecta a quien escribe el `CHANGELOG.md`: mismo criterio que el lote 8
  (`ci.yml`, comentario del job `changelog-en-el-pr`).
- **Descartada: medir también las líneas BREAKING que el aviso pone primero.** Por
  naturaleza nombran contrato técnico (un `input`, un job); prohibirles la jerga
  obligaría a esconder el nombre exacto. Residuo declarado.
- **Descartada: traducir el `::error::` con `projects-doctor` o `projects-asistente`**,
  como sugería el catálogo del porte. Es una herramienta que corre en la máquina del
  consumidor, fuera del alcance de este lote, y la fuente seguiría siendo esta sección:
  si la sección está en jerga, la traducción traduce jerga.

### 5. La coherencia de las superficies se mide derivando, y la regla vieja por frases

- **Elegida: `pruebas/ci-del-marco/que-es-breaking.test.mjs`.** Lee la lista cerrada de
  `AGENTS.md` (items numerados que abren en negrita) y exige que la plantilla de PR
  ofrezca exactamente esos casos con la misma frase; exige que el caso 5 exista; que la
  pregunta de la plantilla no nombre una línea mayor; que las superficies que remiten a
  «Qué es BREAKING» remitan a un encabezado que existe; y que ninguna superficie que
  dicta la regla —`AGENTS.md`, la plantilla, las skills del marco, `README.md`,
  `plantilla/AGENTS.md`, las páginas vigentes de `docs/` y el canónico de la
  constitución— contenga una frase de la regla vieja.
- **Descartada: solo frases, como el control manual de Rigel.** Una lista de frases se
  derrota con un sinónimo; la comparación derivada no.
- **Descartada: la lista de casos copiada en el banco.** Sería una tercera copia.
- **Fuera del recorrido, a propósito:** `openspec/changes/` (cada change razona con la
  regla de su día) y las páginas que `docs/README.md` declara «Histórico» (la exención
  la decide el índice). Las entradas del `CHANGELOG.md` son historia; solo su preámbulo
  es regla vigente.

### 6. La skill del release no copia la lista

- **Elegida: remite a `AGENTS.md`** y deja solo la pregunta que decide. La plantilla de
  PR sí la repite porque ahí se marca el caso, y el banco la ata; una tercera copia es la
  que se queda atrás, como le pasó a Rigel.

### 7. El `CHANGELOG.md` no se edita: parche y caso `todo` que se vuelve exigible solo

- **Elegida: `.porte/10-que-es-breaking.patch`** (preámbulo y viñeta de `:74-77`), y en
  el banco un caso sobre el preámbulo marcado `todo` **mientras ese archivo exista**.
  Se ve en cada corrida (`# todo 1`) y no pone rojo el banco; el día que la integración
  borre `.porte/`, el caso se vuelve exigible sin que nadie lo toque, y si el parche no
  se aplicó, es rojo. **Corregida por la revisión adversarial (decisión 10):** el
  aplazamiento ya no depende de que la integración borre la carpeta; camino a main se
  exige aunque siga ahí.
- **Descartada: excluir el `CHANGELOG.md` del banco.** El preámbulo quedaría sin guardia
  para siempre, y es lo primero que lee un consumidor en su PR de bump.
- **Descartada: el caso en rojo ya.** La verificación del lote exige cero fallas y el
  archivo no se puede editar en esta rama.

Verificado: el parche aplica sobre el `CHANGELOG.md` de la rama con y sin el parche del
lote 8, en los dos órdenes, con el mismo resultado.

### 8. El parche del lote 8 cambia dos frases

El «Para consumidores» que el lote 8 dejó en `.porte/08-normalizar-changelog.patch`
decía «tu pipeline» y «en cada merge». Con la compuerta nueva, la integración nacería
roja en esa sección. Se reescriben las dos frases («tus verificaciones», «cada vez que
se integra un cambio a `main`») y nada más: el resto del parche es idéntico.

### 9. Lo que este change NO toca, con el motivo

- **La premisa vencida de la ventana de cobertura** (`openspec/specs/calidad-codigo/spec.md:268`,
  «el marco se consume por un tag móvil…»). Es un residuo **con dueño**: el change
  `la-ventana-se-cierra`, que cierra esa ventana el 2026-09-30, lo tiene como tarea 3.3.
  Ver la decisión 11: el banco la exime solo mientras ese change esté activo.

- **`marco-ci.yml:3494-3498` y `pruebas/marco-ci/permisos-compuerta.test.mjs:204-208`**
  explican el modo aviso del desvío incompleto «por la regla de `AGENTS.md`». Con la
  regla nueva ese motivo queda viejo —el arreglo cabe en el repositorio del
  consumidor—, pero la promesa que se anunció (endurece en la línea mayor siguiente)
  sigue siendo la de la D1 (v2 se abre una sola vez, con todo junto). Cambiar su
  comportamiento es contrato de una pieza referenciada y lo decide el lote que la
  endurezca (38); tocar solo el comentario de un archivo que editan otros tres carriles
  no vale el conflicto.
- **Los changes abiertos que citan la regla vieja** (`entrega-referenciada`,
  `el-comando-que-se-pega-funciona`, `un-solo-predicado-del-desvio`, `stack-estandar`,
  `ventana-vencida`, `marca-verificada`, `reglas-al-dia`, `rojo-primero`): razonan con la
  regla de su día. Reescribirlos falsearía el porqué de sus decisiones.
- **La apertura de la línea 2** y el estado de `v1`: lote 38 y lote 6.

## Decisiones de la revisión adversarial (2026-09-17)

### 10. Lo que el porte aplaza no llega aplazado a main (FO-H3)

El caso del preámbulo quedaba `todo` mientras existiera el archivo del parche, y un
`todo` que falla no cambia la salida de `node --test`: si la integración aplicaba el 08
y no el 10 y dejaba `.porte/`, el caso quedaba apagado para siempre. «La integración lo
borra» era una promesa.

- **Elegida: un solo interruptor, `pendienteDelPorte`** (`pruebas/ci-del-marco/carril-del-porte.mjs`),
  que aplaza solo si el archivo existe **y** la corrida no va a main —lo dicen
  `GITHUB_BASE_REF` y `GITHUB_REF`, que GitHub pone en todo paso—; y un caso que pone
  rojo `.porte/` en un PR a main o en un push a main. Los bancos corren en el job
  `pruebas-actions`, en los dos eventos.
- **Descartada: un paso nuevo en `ci.yml`.** Sería un paso inline sin banco, que es lo
  que el lote 8 acaba de cerrar para su propio paso; el banco ya corre donde hace falta.
- **Descartada: sacar el `todo` en el carril.** La rama del porte no puede editar el
  `CHANGELOG.md`: sería rojo permanente, y un rojo permanente enseña a ignorar el rojo.

### 11. La premisa con dueño, exenta hasta que el dueño se archive (RV-L4-05)

El banco no recorría `openspec/specs/`, y ahí seguía escrita la premisa de la regla
retirada. Los specs vivos entran al recorrido y la frase entra a `REGLA_VIEJA`.

- **Elegida: una exención atada al dueño.** `PREMISAS_CON_DUENO` nombra la superficie,
  la frase y el change que la va a corregir; vale mientras ese change esté en
  `openspec/changes/` y vence sola cuando se archiva o se descarta. Otro caso exige que
  el dueño la tenga como tarea **abierta** en su `tasks.md` (se agregó la 3.3 a
  `la-ventana-se-cierra`).
- **Descartada: un MODIFIED acá.** El requirement de la cobertura tiene unas 230 líneas
  y `la-ventana-se-cierra` lo va a modificar al cerrar la ventana: dos deltas sobre el
  mismo requirement en carriles distintos es un conflicto de archive que ningún banco
  resuelve, y un MODIFIED que no reproduzca todos sus escenarios los borra en silencio.
- **Descartada: sólo declararlo en este design.** Depende de que alguien se acuerde el
  día del archive del otro change.

### 12. El tope de la jerga entre backticks es el de las páginas (RV-L4-06)

La compuerta decía cobrar la jerga «con la MISMA regla que las páginas» y no aplicaba su
tope de menciones entre backticks.

- **Elegida: importar `jergaEntreBackticks` y `TOPE_DE_JERGA_ENTRE_BACKTICKS`** de
  `pruebas/docs/lectura.mjs`. Es el tope de una página aplicado a una sección más corta:
  el lado indulgente, pero medido y compartido.
- **Descartada: un tope proporcional a la sección.** Sería un número inventado, sin
  medición detrás, y una segunda regla que diverge de la primera.
- **Descartada: corregir la frase «la misma regla».** Deja el hueco abierto.

### 13. Un `aprueba:` no cita un desvío que no existe (RV-L4-09)

Los tres changes del carril citan el desvío de review de `AGENTS.md`, que declara el
carril L1. Integrados sin L1, remiten al vacío.

- **Elegida: declarar la dependencia en cada proposal y un banco**
  (`pruebas/ci-del-marco/aprueba-cita-lo-que-existe.test.mjs`) que exige que `AGENTS.md`
  declare el desvío por su identificador si algún artefacto activo lo cita. En el carril
  queda `todo` por `pendienteDelPorte`; camino a main se exige.
- **Descartada: sólo declararlo.** El orden de integración es memoria.

## Qué lo hace cumplir solo

| Propiedad | Comprobación | Dónde falla |
|---|---|---|
| La plantilla de PR ofrece exactamente la lista cerrada | `que-es-breaking.test.mjs` («la plantilla de PR ofrece EXACTAMENTE…») | CI, job del banco de pasos |
| La lista tiene el caso del arreglo fuera del repositorio | ídem («la lista cerrada nombra el caso…») | ídem |
| Ninguna superficie vuelve a la regla vieja | ídem («ninguna superficie que dicta la regla…») | ídem |
| El preámbulo del `CHANGELOG.md` dice la regla nueva | ídem, `todo` solo en el carril del porte (`pendienteDelPorte`) | ídem, en todo PR a main y en main |
| `.porte/` no llega a main | `carril-del-porte.test.mjs` | CI del PR a main, y el push a main |
| La premisa vieja con dueño se corrige antes de que el dueño se archive | `que-es-breaking.test.mjs` (exención atada al dueño y tarea abierta exigida) | CI del PR que archiva o descarta al dueño |
| «Para consumidores» sin jerga de oficio, ni en prosa ni entre backticks por encima del tope | `herramientas/aviso-entra-en-el-mensaje.mjs`, paso del job `changelog-en-el-pr` | CI del PR que escribe el `CHANGELOG.md` |
| Un `aprueba:` que cita el desvío apunta a una declaración que existe | `aprueba-cita-lo-que-existe.test.mjs` | CI del PR a main |

**Lo que sigue siendo disciplina, dicho como deuda:** que cada PR clasifique bien su
propio cambio, y que el arreglo de una compuerta nueva **esté** escrito en «Para
consumidores». Ninguna máquina puede leer si un texto contiene un arreglo; la plantilla
de PR lo pregunta con una casilla.
