# Composite actions del marco

Piezas **referenciadas**: los proyectos no las copian, las consumen con `uses:`.
Un arreglo acá llega a todos los repos en su próximo run, sin PR en cada uno.

```yaml
uses: im-diego-ec/Projects/actions/<nombre>@v1
```

| Action | Qué hace | Falla el job |
| --- | --- | --- |
| [`guardrail-deltas`](guardrail-deltas/) | Caza los deltas de OpenSpec que perderían contrato al archivar | Sí, a propósito |
| [`carril-docs`](carril-docs/) | Marca los cambios que no alteran lo que se sirve (`solo_docs`) | Nunca: fail-open ruidoso |
| [`cobertura-diff`](cobertura-diff/) | Mide qué proporción de las líneas del cambio ejercitan las pruebas | Sí: bajo el mínimo, y también sin datos |
| [`censo-fuentes`](censo-fuentes/) | Deriva el alcance real de la verificación y caza los archivos que no mira ninguna herramienta | Sí: agujeros y exclusiones muertas |
| [`aviso-version`](aviso-version/) | Arma, desde el CHANGELOG, el mensaje que reciben los consumidores al publicarse una versión | Sí: solo si el CHANGELOG no tiene entrada para esa versión |
| [`constitucion`](constitucion/) | Entrega la porción del marco de la constitución a cada superficie de agente que el repo declara, y verifica que la presente sea la que el marco publica | Sí: artefacto ausente o atrasado pasada su fecha, editado a mano, cadena de carga rota o desvío muerto |
| [`dev-antes-que-prod`](dev-antes-que-prod/) | Verifica que ninguna pieza del marco alcance un job de producción sin haber corrido en el tramo de dev de la misma promoción | Sí: pieza sin gemelo en dev, misma pieza en otra versión, o vía sin declarar. El aviso de mecánica copiada, nunca |

## Parametrización

Estas actions **no llevan placeholders `{{...}}`**. Esos son de las piezas de
scaffold, que se copian una vez y quedan en el proyecto; una action referenciada
es la misma para todos los repos y se ajusta por `inputs`.

Lo que el pipeline consume en runtime (URLs, ARNs, log groups) tampoco viaja
acá: va por `vars` y `secrets` del repo consumidor.

## Versionado

`@v1` es un tag móvil: apunta al último commit compatible de la línea 1.x.
Un proyecto con requisitos de auditoría puede pinear el SHA
(`@a1b2c3d4...`), a costa de perder los arreglos automáticos.

Antes de mover `v1`, la action nueva se prueba en un repo consumidor apuntando
a la rama (`@nombre-de-rama`). Si cambia el nombre o el significado de un input
o de un output, es `v2`, no `v1`.

---

## `guardrail-deltas`

En OpenSpec, un bloque `## MODIFIED Requirements` **reemplaza** al requirement
entero del spec vigente cuando el change se archiva. Si el delta omite un
escenario que el spec sí tiene, ese escenario desaparece del contrato. La
herramienta lo detecta recién en el último paso del change, con el trabajo ya
hecho; esta action lo detecta en cada PR.

```yaml
jobs:
  openspec:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: im-diego-ec/Projects/actions/guardrail-deltas@v1
```

Inputs (todos opcionales): `directorio-changes` (`openspec/changes`),
`directorio-specs` (`openspec/specs`), `instalar-node` (`true`),
`version-node` (`22`).

Si el job ya hizo su propio `setup-node`, pasá `instalar-node: "false"`.

### Qué chequea

1. **Escenarios que se perderían.** Cada `#### Scenario:` del spec vigente debe
   estar, con su título exacto, en el bloque `MODIFIED`. La comparación es por
   título literal: si retitulás un escenario, el guardrail lo lee como pérdida.
   Es el comportamiento buscado — retitular un escenario ES cambiar el contrato,
   y debe pasar por una revisión, no colarse en un diff.
2. **Requirements huérfanos.** Un `### Requirement:` dentro de `MODIFIED` que no
   existe en el spec vigente no modifica nada: al archivar se agrega, y si el
   título era una variante del que ya estaba (una coma, un acento, una palabra),
   el spec queda con dos requirements casi iguales y nadie se entera.

   El script del que salió esta action hacía `continue` en ese caso, en silencio.
   Acá avisa. Las dos salidas legítimas van en el mensaje de error: si el
   requirement es nuevo, va en `## ADDED Requirements`; si le cambiaste el
   título, se declara en `## RENAMED Requirements` con `FROM`/`TO` y el guardrail
   resuelve el rename solo.

El chequeo se limita al bloque `MODIFIED`: los requirements de `ADDED`
legítimamente todavía no viven en el spec vigente.

### Correrlo en local

El script no tiene dependencias ni toca la red — el mismo veredicto que en CI,
desde la raíz del proyecto:

```bash
node ruta/a/projects/actions/guardrail-deltas/check-openspec-deltas.mjs
```

### Nota suelta sobre la validación estricta

El guardrail es complementario a `openspec validate --all --strict`, que corre
aparte. Si lo agregás a mano, ojo con el nombre del paquete: es
`@fission-ai/openspec`. El nombre pelado `openspec` en npm es un placeholder
ajeno (0.0.0, squatting). Y pinealo a la misma versión que corre el equipo en
local: Dependabot no ve un `npx` inline, así que ese pin se sube a mano.

---

## `carril-docs`

Un cambio que solo toca docs, specs o infra no necesita compilar, testear ni
desplegar nada. Esta action lo detecta y publica `solo_docs`; el consumidor
decide qué se salta.

**Fail-open ruidoso.** Ante cualquier duda o error, `solo_docs=false` (se corre
todo) **y** queda un `::warning::` en el run. Omitir un build por un error de
detección sería invisible y peligroso; correr de más cuesta minutos de runner.
La mitad "ruidosa" no es adorno: en otro repo esta detección vivió
semanas devolviendo 403 en silencio, y el carril rápido nunca actuó.

### Uso en pull request

```yaml
permissions:
  contents: read
  pull-requests: read

jobs:
  cambios:
    runs-on: ubuntu-latest
    outputs:
      solo_docs: ${{ steps.detectar.outputs.solo_docs }}
    steps:
      - id: detectar
        uses: im-diego-ec/Projects/actions/carril-docs@v1

  build_test:
    needs: cambios
    if: needs.cambios.outputs.solo_docs == 'false'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      # ...
```

No hace falta `actions/checkout` en modo PR: los archivos salen de la API.

> **El check requerido por la protección de rama no puede ser `build_test`.** Un
> PR de solo docs lo omite, y un check omitido nunca reporta: el PR queda
> esperando para siempre. El check requerido tiene que ser un job final con
> `if: always()` que dé veredicto en ambos carriles.

### Uso en push / merge a main

```yaml
jobs:
  cambios:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    outputs:
      solo_docs: ${{ steps.detectar.outputs.solo_docs }}
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }   # sin esto, el commit anterior no esta en el clon
      - id: detectar
        uses: im-diego-ec/Projects/actions/carril-docs@v1
```

### Uso en `workflow_run` (la compuerta de deploy)

El evento no trae los archivos: la action resuelve el PR asociado al
`head_sha` y después lista sus archivos. Vale para merge, squash y rebase, a
diferencia de un diff de commits.

```yaml
jobs:
  cambios_prod:
    if: >-
      github.event_name == 'workflow_run' &&
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.head_branch == 'main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    outputs:
      solo_docs: ${{ steps.detectar.outputs.solo_docs }}
    steps:
      - id: detectar
        uses: im-diego-ec/Projects/actions/carril-docs@v1
```

Un despliegue por `workflow_dispatch` **no** debe pasar por esta action: si
alguien lo disparó a mano (un rollback, por ejemplo), es a propósito.

### Inputs

| Input | Default | Para qué |
| --- | --- | --- |
| `rutas-neutras` | ver abajo | Patrones ERE, uno por línea, de rutas que no alteran lo servido |
| `modo` | `auto` | `auto` \| `pr` \| `sha` \| `push` |
| `pr` | vacío | Número de PR explícito |
| `sha` | vacío | Commit a inspeccionar |
| `base` | vacío | Commit anterior en modo `push` |
| `token` | `${{ github.token }}` | Token para la API |

`auto` decide por el evento: `pull_request` y `pull_request_target` → `pr`,
`workflow_run` → `sha`, `push` → `push`. Cualquier otro evento cae al fail-open
con el aviso de que hay que fijar `modo`.

Default de `rutas-neutras` (las líneas en blanco y las que empiezan con `#` se
ignoran; el resto se une con `|`):

```
^openspec/
\.md$
^docs/
^\.github/
^infra/
^infra-prod/
```

`^\.github/` adentro significa que un cambio de workflows no dispara build ni
despliegue — es deliberado, el workflow nuevo se ejecuta solo en su propio run.
Un proyecto que genere artefactos desde `.github/` debe quitar esa línea.

### Outputs

| Output | Contenido |
| --- | --- |
| `solo_docs` | `"true"` solo si **todos** los archivos calzan. `"false"` en todo lo demás, incluido el fail-open |
| `motivo` | Frase corta con la razón de la decisión |
| `total_archivos` | Cantidad de archivos evaluados (`0` en fail-open) |
| `archivos` | Ruta al listado, dentro de `RUNNER_TEMP` (no ensucia el checkout) |

---

## `censo-fuentes`

La promesa «ningún paquete queda fuera del alcance del lint» parece pedir un
check por paquete. No lo pide: los agujeros que motivaron esta pieza viven
**dentro** de paquetes correctamente configurados —un componente de dominio
tragado por un ignore pensado para generados, unos scripts fuera de todo
programa de tipos— y cualquier verificación que pregunte «¿este paquete está
configurado?» los declara sanos. La unidad de la propiedad es el **archivo**.

El alcance no se declara: se **deriva**.

```
universo (git ls-files, filtrado por extensión de fuente)
  − lo que enumera el analizador estático del repo
  − lo que lista el compilador de cada tsconfig que declara sus entradas
  − las exclusiones declaradas con motivo
  = los agujeros
```

```yaml
jobs:
  build_test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v7
        with: { node-version: "22", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      # DESPUES del install: el censo interroga al toolchain ya instalado.
      - uses: im-diego-ec/Projects/actions/censo-fuentes@v1
```

### Inputs

| Input | Default | Para qué |
| --- | --- | --- |
| `directorio-trabajo` | el toplevel que reporte `git` | Raíz a censar, relativa al working directory del job |

### Outputs

**Ninguno, a propósito.** El veredicto de esta action es su código de salida y
sus anotaciones: no hay nada que un paso posterior pueda decidir a partir de un
recuento de agujeros. Que no publique outputs es la afirmación, no un olvido —
si mañana los publica, es MINOR y va al `CHANGELOG.md`.

### El requisito que no es negociable

El paso va **después** de instalar las dependencias del repo. Es la frontera
nueva que declara el design: hasta ahora el marco solo **leía** archivos del
consumidor; el censo **ejecuta** su toolchain para preguntarle qué archivos ve.
No lintea ni compila para emitir, pero sin dependencias instaladas no hay a
quién preguntarle — y en ese caso emite un `::warning::` ruidoso y sale 0, ni
rojo sobre un repo sano de otro stack ni un verde mudo que diga «verificado».

### Declarar una exclusión

En el `package.json` del paquete que **contiene** el archivo:

```json
{
  "projects": {
    "cobertura": {
      "excluidos": [
        { "patron": "src/generado/**", "motivo": "los regenera el codegen en cada build" }
      ]
    }
  }
}
```

`patron` es un glob relativo al paquete y `motivo` no puede estar vacío. Cada
exclusión viva sale como `::notice::` y como fila del resumen de la corrida.

Esto **no** vuelve imposible la evasión, y no hay que venderlo como si lo
hiciera. Lo que cambia es su naturaleza: deja de ser una ausencia —invisible en
el diff, invisible en CI— y pasa a ser una afirmación escrita, en el diff del
paquete, bajo review cruzado. Una exclusión que ya no corresponde a ningún
archivo rastreado es **roja**, para que no sobrevivan a lo que las justificó.

### Correrlo en local

```bash
node ruta/a/projects/actions/censo-fuentes/censo-fuentes.mjs
```

El mensaje de cada agujero nombra el archivo y da las tres salidas concretas
—incluirlo en un programa de tipos, ampliar el alcance del analizador, o
declararlo excluido con motivo— más el comando para reproducirlo.

### Detalles que costaron una corrida cada uno

- **`tsc -b` es incremental**: con un `.tsbuildinfo` al día saltea el proyecto,
  no lista **nada** y sale **0**. Por eso la action pasa `--force` en build
  mode. Sin él, la segunda corrida de cualquier repo enrojecería por «listado
  vacío» sin que nadie haya roto nada — y un censo escrito con menos cuidado
  leería ese vacío como «no hay nada fuera de alcance», que es el fail-open en
  verde que la constitución prohíbe.
- **Un tsconfig que solo trae `compilerOptions` no cuenta** como programa de
  tipos. Contarlo sería catastrófico en silencio: sin `files` ni `include`,
  TypeScript asume todo el subárbol, y ese archivo «cubriría» el repo entero sin
  que ningún script lo ejecute jamás.
- **`typescript` se resuelve desde el directorio de cada tsconfig**, no desde la
  raíz. Con pnpm es devDependency de cada paquete y no resuelve desde el
  toplevel del monorepo.
- **Un listado vacío habiendo fuentes es rojo**, nunca «todo cubierto».

### Límites declarados

- Dice «alguien lo mira», no «lo mira con las reglas del contrato»: un archivo
  puede estar dentro del alcance y quedar fuera de las reglas que dependen de
  tipos. Es otra propiedad y otro check.
- Un programa de tipos que ningún script ejecuta igual da cobertura: crear un
  tsconfig que nadie corre satisface la propiedad entera.
- Ignorar un archivo del control de versiones lo saca del universo. Es la
  evasión más limpia que existe; la única defensa es que ignorar código propio
  es una línea de diff que no se justifica sola.
- La lista de extensiones de fuente se mantiene a mano dentro del script. Es la
  regla de «propiedades, no listas» mordiéndose la cola; vive en el marco, así
  que se arregla una vez para todos, pero un proyecto con otro lenguaje tiene
  archivos invisibles para el censo mismo.
- El analizador se enumera con una sola corrida desde la raíz del repo. Un
  monorepo con configuraciones de análisis por paquete que no se resuelvan hacia
  arriba quedaría subrepresentado.

---

## `cobertura-diff`

Mide qué proporción de las **líneas que el pull request agrega o modifica**
ejercitan las pruebas, cruzando los reportes `lcov` del repositorio con el diff.
Es la mitad "sobre el diff" del mínimo de cobertura del marco (design `D5` del
change `calidad-fail-closed`): bloquea desde el día uno porque solo aplica a
código nuevo, y no exige ninguna puesta al día previa. El otro plano —el total
del paquete, que no retrocede— vive en la configuración de cobertura del
proyecto, no acá.

```yaml
jobs:
  build_test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v7
        with: { node-version: "22" }
      # ...instalar dependencias y correr las pruebas CON cobertura...
      - uses: im-diego-ec/Projects/actions/cobertura-diff@v1
```

### Por qué un comparador propio y no una herramienta externa

La candidata **falla en verde**: si las rutas de su entrada no coinciden con las
del diff, no encuentra líneas que medir, reporta cobertura total y sale con
éxito. Cablearla mal deja la compuerta abierta, que es exactamente lo que la
constitución prohíbe. Acá **la ausencia de datos habiendo líneas agregadas es
roja y ruidosa**, y el mensaje trae el arreglo.

### Qué hace, paso a paso

1. Encuentra los `lcov` por glob y parsea `SF:` y `DA:`.
2. Saca las líneas agregadas o modificadas con `git diff --unified=0 <base> HEAD`
   —comparación de **dos puntos**, no de tres: `A...B` exige merge-base y muere
   en el clon superficial que deja `actions/checkout` por defecto—.
3. **Normaliza las rutas**: un `lcov` generado en Windows trae `web\src\App.tsx`
   y uno de Linux `web/src/App.tsx`; git siempre habla con barras normales. Sin
   esto el cruce da cero coincidencias y la compuerta pasa en verde por la razón
   equivocada.
4. Cruza: de las líneas agregadas mide las que el reporte declara con `DA:`, y
   calcula el porcentaje cubierto. Una línea agregada **sin** `DA:` no se
   descarta por las buenas: se lee su texto en el commit medido y, si tiene
   contenido ejecutable, cuenta como línea fuera del denominador —y si el
   reporte ni siquiera llega hasta ahí, es rojo por `lcov` rancio—.

### Requisito no negociable: las rutas del reporte

Las rutas `SF:` tienen que ser **relativas a la raíz del repositorio**. En un
monorepo eso significa configurar el `projectRoot` del reporter; con el default
(la raíz de cada paquete) dos paquetes emiten `src/...`, indistinguibles entre sí
e incomparables contra el diff. En vitest:

```ts
coverage: {
  reporter: [["lcov", { projectRoot: fileURLToPath(new URL("..", import.meta.url)) }]],
  all: true,
}
```

`all: true` importa igual: un archivo sin ninguna prueba tiene que aparecer en el
reporte con sus líneas en cero. Con `all: false` desaparece del reporte, la
compuerta lo contaría como "no medido" y el archivo menos probado del repo
terminaría siendo justo el que no molesta a nadie. Por eso un **archivo fuente**
del cambio que ningún reporte reclama es **rojo**, y qué cuenta como fuente sale
de la lista de extensiones del censo —no de las extensiones que casualmente
traen los reportes presentes, que era circular: un repo que mide `.ts` no decía
una palabra sobre un `.tsx` nuevo sin pruebas—. La salida es declarar la
exclusión con su motivo en `projects.cobertura.excluidos`.

### Qué pasa en cada caso

| Situación | Veredicto |
| --- | --- |
| Líneas nuevas cubiertas por encima del mínimo | Pasa |
| Líneas nuevas por debajo del mínimo | **Rojo**, con anotación `file`/`line` sobre cada línea sin cubrir |
| El cambio solo borra líneas, o es un renombre puro | Pasa sin ruido: no hay líneas nuevas que cubrir |
| El cambio no toca archivos que la cobertura mida (markdown, YAML) | Pasa, y deja constancia de por qué |
| No hay `lcov`, o ninguna ruta `SF:` corresponde a un archivo versionado | **Rojo ruidoso** con el arreglo |
| Un archivo del cambio quedó sin medir y su cobertura llegó con otra raíz | **Rojo**: rutas desalineadas |
| Un archivo **fuente** del cambio que ningún reporte reclama | **Rojo**: sin datos no es cubierto; se apaga con la exclusión declarada |
| El reporte reclama el archivo pero no llega hasta donde el cambio escribió | **Rojo**: el `lcov` es anterior al cambio (cache de CI, suite no recorrida) |
| Una ruta `SF:` que corresponde a dos archivos versionados (monorepo sin `projectRoot`) | **Rojo**: no dice a cuál, y la cobertura se anotaría en el archivo equivocado |
| Una exclusión declarada **con motivo** cubre ese archivo | Pasa, y el motivo queda escrito en el resumen |
| El `minimo` recibido es menor que el del marco | Pasa, con `::warning::` que dice cuál es el del marco |
| No hay commit base (push a `main`, dispatch) | **No aplicable**, y lo dice. Nunca simula un 100% |
| El commit base no está en el clon y no se puede traer | **Rojo**: falta `fetch-depth: 0` |

El "no hay `lcov`" es rojo **incluso si el cambio es solo documentación**: sin un
reporte bien cableado, la action no puede distinguir "este archivo no es medible"
de "las rutas no coinciden". En la práctica no molesta, porque el carril de docs
saltea el job entero.

### Inputs

| Input | Default | Para qué |
| --- | --- | --- |
| `lcov` | `**/coverage/lcov.info` | Globs de los reportes, uno por línea (`**`, `*`, `?`, `{a,b}`) |
| `base` | `github.event.pull_request.base.sha` | Commit base. Vacío = paso no aplicable |
| `cabeza` | `HEAD` | Commit final; `HEAD` es lo que midieron las pruebas |
| `minimo` | `80` | Mínimo del marco sobre las líneas del cambio |
| `max-anotaciones` | `20` | Tope de anotaciones inline; el listado completo va al resumen |
| `instalar-node` | `false` | Para llegar acá el job ya corrió las pruebas, así que ya tiene Node |
| `version-node` | `22` | Solo si `instalar-node` es `true` |

### Outputs

| Output | Contenido |
| --- | --- |
| `porcentaje` | Porcentaje con dos decimales, o `n/a` cuando no hubo nada que medir |
| `lineas_medidas` | Líneas agregadas con dato de cobertura |
| `lineas_sin_cubrir` | Cuántas de esas no las ejercita ninguna prueba |
| `lineas_fuera_de_medicion` | Líneas fuente del cambio sin dato de cobertura, fuera del denominador |

### Límites declarados

- **No prueba el orden.** Cierra "cambio sin prueba", no "prueba escrita después
  del arreglo". Y un cambio que **borra** pruebas dejando el código pasa: eso
  solo lo cierra el plano del total.
- **La comparación de dos puntos puede sobrecontar** si la rama base avanzó desde
  que salió el pull request: aparecen líneas que el cambio no introdujo.
  Sobrecontar es el lado conservador, y es el precio de funcionar en un clon
  superficial.
- **Un archivo fuente del cambio sin ningún dato de cobertura es ROJO**, no un
  aviso: es lo que promete el spec. La válvula de escape legítima no es bajar
  el color, es la exclusión declarada con su motivo en
  `projects.cobertura.excluidos` del manifiesto de su paquete — la misma mecánica
  del censo, visible en el diff y bajo review.
- **Una línea MODIFICADA que conserva su número hereda el dato viejo.** El
  comparador detecta el lcov rancio cuando el reporte no llega hasta donde el
  cambio escribió; no puede detectarlo cuando el cambio reescribe una línea que
  el reporte ya conocía como cubierta, porque el formato lcov no trae ninguna
  huella del código que midió. Ese caso sale verde. Cerrarlo exigiría datos de
  frescura que hoy no existen en la entrada (un checksum por línea, que los
  reporters no emiten), así que se declara en vez de fingir que está cubierto.
- **Líneas nuevas sin dato en un archivo que el reporte SÍ mide son un aviso
  ruidoso, no un rojo**: ahí la ausencia puede ser código que el reporter no
  considera ejecutable, y un rojo con esa ambigüedad no lo puede apagar nadie.
  Quedan fuera del denominador y el número sale publicado en
  `lineas_fuera_de_medicion`.
- **El `minimo` del consumidor no tiene piso duro.** El mínimo del marco es 80
  (decisión D5); un repositorio puede pedir menos, pero el paso lo grita con un
  `::warning::` que dice cuál es el del marco. Es visible, no imposible.

### Correrlo en local

Sin dependencias y sin red, desde la raíz del proyecto:

```bash
COBERTURA_BASE=$(git merge-base origin/main HEAD) \
  node ruta/a/projects/actions/cobertura-diff/medir-cobertura-diff.mjs
```

Su banco de pruebas (`actions/cobertura-diff/pruebas/`) arma repositorios git de
verdad y corre el script como lo corre la action:

```bash
node --test "actions/cobertura-diff/pruebas/*.test.mjs"
```

---

## `aviso-version`

El `CHANGELOG.md` y la página del release son superficie de **consulta**, y
nadie consulta a tiempo. Con `v1` móvil, un consumidor recibe comportamiento
nuevo —incluido un check que lo pone en rojo— sin haber leído nada; pasó el
2026-08-19, al mover `v1` la primera vez. Esta action convierte la publicación
de una versión en una **notificación**.

**Arma el mensaje y no lo envía.** No conoce el destino, no lee ningún secret y
no toca la red: lee el `CHANGELOG.md` del checkout, devuelve texto y escribe un
payload JSON en disco. El envío —lo único que necesita la credencial— vive en el
workflow que la usa, en unas líneas de `curl`.

Esa separación es toda la estrategia de verificación: un paso que solo se puede
probar disparándolo de verdad no se prueba nunca. Así se corre en cualquier
máquina, sin credenciales, y muestra exactamente qué se enviaría:

```bash
AVISO_VERSION=1.2.0 node ruta/a/projects/actions/aviso-version/aviso-version.mjs
```

**El contenido no se escribe dos veces.** Sale de la sección `### Para
consumidores` de la entrada de esa versión, que el `CHANGELOG.md` ya mantiene
por convención propia y que dice exactamente qué tiene que hacer un consumidor.
No hay un formato paralelo que alguien deba sincronizar: la única fuente que se
edita es el changelog, en el mismo PR que introduce el cambio.

```yaml
on:
  release:
    types: [published]

jobs:
  aviso:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - id: mensaje
        uses: im-diego-ec/Projects/actions/aviso-version@v1
        with:
          version: ${{ github.event.release.tag_name }}
      - shell: bash
        env:
          DESTINO: ${{ secrets.AVISO_VERSION_DESTINO }}
          PAYLOAD: ${{ steps.mensaje.outputs.payload }}
        run: |    # ...el envio, y la rama de "no hay destino"...
```

En el evento `release` el checkout cae en el commit del tag publicado, así que
el changelog que se lee es el de **esa** versión.

### Inputs

| Input | Default | Para qué |
| --- | --- | --- |
| `version` | (obligatorio) | Versión a avisar, con o sin la `v` del tag (`1.2.0` o `v1.2.0`) |
| `changelog` | `CHANGELOG.md` | Ruta del changelog, relativa al working directory |
| `limite` | `3500` | Largo máximo del mensaje; por encima recorta y lo dice |
| `campo` | `text` | Campo de texto del payload JSON (`content` para Discord) |
| `salida` | `$RUNNER_TEMP/aviso-version.json` | Dónde escribir el payload |

### Outputs

| Output | Contenido |
| --- | --- |
| `payload` | Ruta del JSON listo para postear con `--data-binary @archivo` |
| `version` | Versión normalizada, sin la `v` del tag |
| `breaking` | `"true"` si la entrada declara cambios BREAKING |
| `recortado` | `"true"` si el mensaje se recortó por el límite |
| `sin_para_consumidores` | `"true"` si la entrada no traía la sección accionable |

### Qué pasa en cada caso

| Situación | Veredicto |
| --- | --- |
| Entrada con su sección «Para consumidores» | Mensaje completo, con los dos enlaces |
| Entrada **sin** esa sección | `::warning::` y va el **cuerpo completo** de la versión: se manda de más, no de menos |
| Entrada con líneas `BREAKING` | `::warning::` y el mensaje las pone **primero** |
| Mensaje más largo que el límite | `::warning::`, recorta por línea y deja el enlace al release |
| **No hay entrada para esa versión** | **Rojo**, con el arreglo: agregar la entrada y re-disparar el botón |
| No se puede leer el changelog | **Rojo**: falta el `checkout` |

El único rojo es "no hay entrada", y es deliberado: no existe una degradación
honesta. Un aviso vacío, o uno armado con el texto de otra versión, sería
justamente el formato paralelo que este diseño evita — y el modo de fallo más
caro posible, porque le diría a un consumidor que haga algo que no corresponde.

### Límites declarados

- **El mensaje viaja como Markdown, tal cual lo escribe el CHANGELOG.** No hay
  traducción al dialecto de ningún destino (Slack no renderiza `**negrita**`
  igual que GitHub): hacerla sería cablear un proveedor, que es justo lo que
  este diseño no hace. Lo que se gana es que el aviso y el changelog son el
  mismo texto, verificable carácter por carácter.
- **El payload es `{"<campo>": "<mensaje>"}` y nada más.** Sirve para Slack,
  Google Chat y Teams con `text`, y para Discord con `content`. Un destino que
  exija otra forma es un change del marco, no una configuración.
- **«Para consumidores» es una convención del changelog, no un contrato que algo
  verifique al escribirlo.** Su ausencia se detecta al avisar —cuando la versión
  ya está publicada—, no en el PR que la introdujo. Cerrar ese hueco es otro
  check y otra fila del backlog.
- **Esta action no envía nada, así que no puede garantizar que el aviso llegue.**
  Lo que el workflow que la consuma no puede hacer es callarse: sin destino
  configurado, `::warning::` y el mensaje al resumen de la corrida.

### Clasificación de distribución

Es **referenciada**, y hoy tiene un solo consumidor: el propio Projects. Vive acá y
no como un script suelto del repo por dos razones que se sostienen solas —el
banco de pruebas del CI descubre `actions/*/pruebas/` sin que nadie cablee nada,
y "changelog + versión → mensaje" es genérico para cualquier repo que publique
releases—. La contrapartida es honesta: al publicarse bajo `@v1`, sus `inputs` y
`outputs` son contrato, y cambiarlos sigue las mismas reglas que el resto.

---

## `constitucion`

Las cuatro formas de distribución del marco están en el README de la raíz, y
hasta este change **una sola no tenía ni actualización ni check**: el scaffold,
que es donde vive el texto que los agentes cargan. El resultado medido: una
adopción nueva copió `plantilla/AGENTS.md` y el archivo quedó con 241 líneas
contra 355 —reglas enteras perdidas, no reflujo de formato—, y en el consumidor
viejo la divergencia ya corría en las dos direcciones.

Esta action mueve **la porción del marco** de scaffold a regenerado. El texto
canónico vive en `constitucion/canonico/` (una sección por archivo `NN-*.md`,
en orden, con un `manifiesto.json` que declara la versión y sus fechas), viaja
DENTRO de la action por `GITHUB_ACTION_PATH` —el `GITHUB_TOKEN` de un consumidor
no lee otro repositorio— y se **renderiza** contra los valores del proyecto.

Dos modos:

- **`escribir`** deja un artefacto por superficie declarada
  (`.projects/AGENTS-marco.md` para la cadena `CLAUDE.md → @AGENTS.md → @artefacto`,
  `.cursor/rules/00-marco.mdc` para la superficie que lee markdown plano y no
  expande imports). Escribe en el árbol de trabajo y nada más: no commitea, no
  pushea y no abre PRs. Eso es del workflow del consumidor, porque escribir en el
  repo de un proyecto desde una sesión de Projects es 🛑.
- **`verificar`** compara lo presente contra el re-render de la versión que el
  propio artefacto declara en su cabecera de una línea
  (`<!-- projects:constitucion version=… sha=… -->`), y deja el artefacto al día en
  disco para subirlo con `upload-artifact`.

Lo que el proyecto pone, y vive **fuera** de `.projects/` a propósito —ese
directorio es desechable y el modo escribir lo reemplaza—:

- `.projects-valores.json`: los placeholders de dobles llaves, más un
  `"superficies"` opcional. Los handles y las cuentas reales viven del lado del
  consumidor, nunca en Projects.
- `.projects-desvios.json`: los desvíos declarados, cada uno con `regla`, `fecha`,
  `aprobado_por` y `motivo`. El desvío se **imprime dentro del artefacto que los
  agentes cargan, pegado a la regla que anula** —una excepción que el agente no
  lee produce algo peor que una regla ausente: un agente cumpliendo a rajatabla
  algo que el proyecto ya anuló—, y **caduca**: cuando la regla que nombra deja de
  existir en el canónico, el job se pone rojo por desvío muerto con el motivo que
  tenía escrito.

**El sello no es una firma, y es a propósito.** El `sha` de la cabecera identifica
el CANÓNICO de esa versión, no el cuerpo renderizado. Si cubriera el cuerpo, el
arreglo mecánicamente obvio para un rojo de "editado a mano" sería recomputar el
hash y volver a estampar; la autoridad sobre el cuerpo es el re-render, que no se
puede falsificar sin cambiar el canónico.

**El rojo lo dispara una fecha, no el release.** Cada versión del canónico declara
`publicada` y `exigible_desde`, y la propia action rechaza un manifiesto con menos
de 28 días entre las dos (la puerta de atrás se llama `"urgente": true` y sale por
`::warning::`, nunca muda). Entre las dos fechas, un artefacto ausente o atrasado
es `::warning::`; desde `exigible_desde`, `::error::`. Si el consumidor acumuló
varias versiones sin adoptar, manda la fecha de la **más vieja pendiente**. Lo que
**no** tiene es rama silenciosa de "este repo no aplica": el repo sin artefacto es
exactamente el que hay que avisar.

Límites declarados, en el encabezado del `action.yml` y acá: esto garantiza que el
**texto** llegue íntegro y al día a la superficie que el agente carga, **no** que
el agente lo obedezca en el turno 40 de una sesión larga — cierra el hueco de
distribución, no el de comportamiento. Solo cubre las superficies que el
repositorio **declara**. Y Projects **no puede dogfoodear** este mecanismo: su
`AGENTS.md` es la constitución del marco, no la de un proyecto, así que la
evidencia son el banco de pruebas de `constitucion/pruebas/` —que sí corre en el
CI de Projects— y la validación contra un consumidor real antes de mover `v1`.

---

## `dev-antes-que-prod`

El marco **no despliega nada**, así que no puede ejercitar por sí mismo la
mecánica de entrega que publica. Y la mitad de producción de una promoción no
corre en ningún ensayo previo: por spec, un disparo manual sobre una rama de
trabajo deja los jobs de producción sin ejecutar. Ese hueco es el que hacía
imposible publicar compuertas de entrega con la conciencia tranquila, y la
alternativa que se evaluó primero —un canario, una app de mentira con sus dos
ambientes— costaba una aplicación, dos ambientes, una base y su mantenimiento.

Este check lo cierra **sin construir nada**, porque la unidad de distribución
bajó del workflow a la compuerta: la misma pieza, en la misma versión, corrió en
el tramo de dev del mismo run minutos antes. El dogfooding que Projects no puede
hacer lo hace **cada consumidor en cada promoción**, por construcción, y esto lo
verifica en vez de que alguien lo afirme.

La propiedad, tal como la exige el spec:

> Cuando una promoción incluye tramo de dev y tramo de producción, toda pieza
> referenciada del marco que ejecute un job de producción tiene que haber sido
> ejecutada por el tramo de dev de esa **misma** promoción, en la **misma**
> versión.

El tramo de producción se reconoce por `environment` como clave directa del job,
que es la propiedad que el marco ya exige de todo job de producción.

### El problema de diseño, y por qué la declaración no es burocracia

El invariante es **estático** (esto lee la definición de pipeline, no logs) y sus
agujeros son **dinámicos** (son caminos de ejecución). Un lector de YAML no puede
saber cuál `if:` disparó en un run concreto: en el consumidor real la diferencia
entre «pieza solo en producción» (rojo) y «dispatch de emergencia» (verde por
excepción) no vive en la lista de `uses:`, vive en las expresiones de las
condiciones y en un output calculado en runtime.

Por eso el verificador **no clasifica caminos por observación**. Exige que la
topología declare sus vías sin tramo de dev, con un vocabulario **cerrado**:

```yaml
deploy-api-prod:
  environment: production
  # projects:sin-tramo-de-dev via=dispatch-de-emergencia
  # projects:sin-tramo-de-dev via=reuso-de-verificacion-de-dev
```

Si esto se implementara por heurística sobre las expresiones `if:`, la primera
reescritura de una condición en el consumidor lo volvería **fail-open
silencioso**, que es exactamente lo que la constitución prohíbe y lo que ya pasó
en otro repo con el 403 de `actions: read`: la detección devolvía 403, el
fail-open lo tapaba, y una función del pipeline no actuó durante una semana.

Va como **comentario** y no como clave del job porque GitHub rechaza claves
desconocidas dentro de un job, y actionlint también. Es la misma convención de
marca que ya usa `constitucion` (`projects:regla id=…`), sin dialecto nuevo.

### Las cuatro vías, con su control compensatorio

| Vía | Por qué no tiene tramo de dev | Qué corre igual |
| --- | --- | --- |
| `rollback-a-artefacto-publicado` | Los jobs de dev quedan fuera por diseño cuando se pide un rollback | Se despliega un artefacto que **ya estuvo** en producción, y su existencia se valida contra el registro antes de tocar el servicio |
| `dispatch-de-emergencia` | Salta dev por diseño; está en el spec vivo del marco | Hereda el riesgo que esa vía siempre tuvo, y queda registrado en el historial del proveedor de CI |
| `reuso-de-verificacion-de-dev` | Producción procede referenciando una corrida anterior sobre contenido idéntico | La ventana es acotada, y el residuo se acota porque mover el tag mayor es un acto humano deliberado |
| `ninguna` | No hay vía: producción no se alcanza sin el tramo de dev | **No se toma como palabra**: se comprueba contra el grafo de `needs:` del archivo |

Esa última fila es la que impide que la declaración se firme sola. Un job que
declara `ninguna` y no depende (ni transitivamente) del job de dev que le da la
pieza está describiendo un run que existe y no declaró: eso es rojo.

El vocabulario es cerrado **a propósito**. Una vía nueva se declara **antes de
existir**, con su control compensatorio escrito, y eso es un change de OpenSpec
en el marco, no una línea que alguien suma en su repo: un agujero descubierto
después es indistinguible de un invariante que nunca se cumplió.

### Por qué esto entra en MINOR sin romper a nadie

Para un repositorio que todavía **no adoptó ninguna compuerta**, el invariante es
**vacuamente verdadero**: no usa ninguna pieza del marco en un job de producción.
No hay nada que pueda ponerse rojo. El verde vacuo se **dice** con un
`::notice::`, para que no sea indistinguible de un check que se rompió y no miró
nada.

El aviso de **mecánica copiada** —el repositorio conserva a mano una compuerta que
ya existe como pieza referenciada— es `::warning::` y **nunca** rojo, también a
propósito: la adopción es trabajo deliberado por compuerta, y un check que ponga
rojo a un repositorio que no modificó una sola línea rompe repos ajenos en
silencio. Es el ítem «adopción de lo referenciado» de la revisión trimestral
convertido en señal automática, y lo que vigila es el estado peligroso: mitad
extraído y mitad copiado es **peor que cualquiera de los dos extremos**, porque
el repo queda con dos fuentes para la misma mecánica y la corrección de un
incidente vuelve a tener que portarse a mano justo en la mitad que quedó copiada.

Su registro nace **vacío**, y es una decisión y no un olvido: hoy el marco no
publica todavía ninguna compuerta de entrega que nombrar, y un aviso que nombra
una pieza inexistente es peor que no avisar. El change que publique la primera
compuerta agrega **una línea**, porque el mecanismo ya está acá y probado.

### Inputs

| Input | Default | Para qué |
| --- | --- | --- |
| `marco` | `im-diego-ec/Projects` | Identidad `<org>/<repo>` cuyas piezas se vigilan. Existe para que un fork funcione sin editar el script |
| `workflows` | `.github/workflows` | Directorio de definiciones de pipeline |
| `raiz` | `.` | Raíz del repo consumidor |
| `instalar-node` | `"false"` | El default es `false` porque los runners hospedados ya traen Node: pagar un `setup-node` que no hace falta es costo por costumbre |
| `version-node` | `"22"` | Solo cuando `instalar-node` es `"true"` |

### Límites declarados

- **Que el gemelo de dev exista en la definición no prueba que haya corrido en
  ese run.** Eso lo garantiza la topología, y de ahí que `ninguna` se compruebe
  contra el grafo de dependencias en vez de creerse.
- Una promoción **partida en dos archivos** (dev en uno, producción en otro,
  encadenados por `workflow_run`) se evalúa por archivo, así que la pieza de
  producción se lee como «sin tramo de dev» y sale **rojo**. Es el lado
  conservador a propósito: habilitar esa forma es una vía nueva.
- Un job de producción **sin `environment`** se lee como tramo de dev. Eso lo
  cubre el endurecimiento del verificador de topología, no esta pieza.
- No se lee YAML en estilo flujo, ni indentación con tabs, ni anclas o alias: las
  tres son **rojo por ilegible**, no verde optimista. El marco no tiene
  dependencias y traer un parser de YAML sería la única del repo; el precedente
  en contra ya está escrito en el verificador, porque GitHub **prohíbe**
  expresiones en el campo `uses:` y entonces un ancla exacta alcanza para leerlo.
- Esto verifica el **cableado** de la promoción. No verifica que la pieza haga lo
  que promete: eso es del banco de pruebas de cada pieza.

### Correrlo en local

```bash
node actions/dev-antes-que-prod/dev-antes-que-prod.mjs
```

Contra otro repo, sin moverse de directorio:

```bash
DAP_RAIZ=/ruta/al/consumidor node actions/dev-antes-que-prod/dev-antes-que-prod.mjs
```

---

## Permisos mínimos

Cada `action.yml` los trae escritos en su encabezado. En otro repo, cada
job nuevo costó una o dos rondas de arreglos de permisos, siempre descubiertas
en producción y siempre tapadas por un fail-open. El marco los trae escritos
para no volver a pagarlo.

| Action | Modo | Permisos |
| --- | --- | --- |
| `guardrail-deltas` | — | `contents: read` |
| `carril-docs` | `pr`, `sha` | `contents: read`, `pull-requests: read` |
| `carril-docs` | `push` | `contents: read` |
| `censo-fuentes` | — | `contents: read` |
| `cobertura-diff` | — | `contents: read` |
| `aviso-version` | — | `contents: read` (el checkout; no llama a la API ni a la red) |
| `constitucion` | `verificar`, `escribir` | `contents: read` (escribe en el árbol de trabajo y nada más: el commit y el PR los hace el workflow del consumidor, con sus propios permisos) |
| `dev-antes-que-prod` | — | `contents: read` (el checkout; lee la definición de pipeline del árbol, no llama a la API ni observa runs) |

Un bloque `permissions:` **reemplaza** los permisos por defecto del token: hay
que listar `contents: read` explícitamente, no se hereda.

`actions: read` no aparece acá porque ninguna de estas actions lista runs ni
jobs. Un job que sí lo haga (por ejemplo, reutilizar una verificación previa
buscándola entre los runs anteriores) lo necesita, y sin él el 403 vuelve a
degradar en silencio.

## Requisitos del runner

`bash`, `git` y `gh` — los tres vienen en los runners hospedados por GitHub. En
un runner propio hay que garantizarlos. `gh` lo usa solo `carril-docs`, que es
la única que habla con la API.

## Banco de pruebas

Las actions que traen un script propio traen su banco al lado, en
`<action>/pruebas/*.test.mjs`, y el job `pruebas-actions` del CI de Projects los
corre en cada PR con `node --test` (Node 22, cero dependencias, como todo acá).

**No es una buena práctica opcional, es la única evidencia posible.** El marco
no puede dogfoodear los checks que interrogan manifiestos de paquete: Projects no
tiene ninguno, así que sobre este repo el censo de fuentes no verifica nada — el
mismo límite declarado que el check de marcadores del scaffold. Sin ese banco,
código no trivial llegaría a todos los consumidores de `@v1` sin haberse
ejecutado nunca sobre un caso controlado.

El job **deriva** qué corre del árbol: una action nueva con pruebas queda
cubierta sin que nadie toque el workflow, cero bancos encontrados es rojo (no un
verde mudo), y una action que trae script sin banco sale con un `::warning::` que
la nombra.

Para correr el banco entero en local, desde la raíz de Projects:

```bash
node --test actions/*/pruebas/*.test.mjs
```
