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

Mide la cobertura de pruebas en **los dos planos** del mínimo del marco (design
`D5` del change `calidad-fail-closed`), porque cada uno tapa un hueco que el otro
deja abierto.

**Plano 1 — las líneas que el pull request agrega o modifica**, cruzando los
reportes `lcov` con el diff. Bloquea desde el día uno porque solo aplica a código
nuevo y no exige ninguna puesta al día previa. No aplica fuera de un pull request
(no hay rango que medir) y lo dice, en vez de simular un 100%.

**Plano 2 — el total de cada paquete** contra el mínimo del marco. Corre
**siempre**, también en un push a `main`, porque no depende de ningún rango. Sin
este plano, el código que ya existe sin pruebas se queda así indefinidamente:
nada obliga a nadie mientras nadie lo toque.

| Situación del total de un paquete | Veredicto |
|---|---|
| En o por encima del mínimo del marco (80) | verde |
| Por debajo del mínimo, **sin** motivo ni fecha declarados | **rojo** |
| Por debajo del mínimo, con la fecha declarada **ya vencida** | **rojo** |
| Por debajo del mínimo, con motivo y fecha **vigente** | amarillo, y la corrida reporta cuánto falta y cuánto plazo queda |
| Por debajo de su propio **piso declarado**, esté ese piso arriba o abajo del mínimo | **rojo** (retroceso: el piso es ganancia acumulada) |
| Con la declaración de cobertura mal escrita | **rojo** — una declaración inválida no cuenta como declarada |

> **Ventana de estreno, hasta el 2026-09-30.** Mientras dure, un paquete por
> debajo del mínimo que **no declara** deuda pasa en amarillo con un `::warning::`
> que nombra el día en que será rojo. La ventana existe porque `v1` es un tag
> móvil: sin ella, la compuerta aparece en el pipeline de cada consumidor sin que
> nadie la haya leído. No afloja lo que un paquete escribió y rompió —deuda
> vencida, retroceso, declaración inválida—, y se cierra sola: pasada la fecha, el
> mismo estado es rojo sin que nadie toque una línea.

El piso es el mecanismo de **transición** hacia el mínimo, no un sustituto de él,
y por eso lleva plazo. Sin fecha, el piso termina siendo el mínimo de hecho, y eso
pasó de verdad: el consumidor estuvo en verde a 70,69% de funciones contra un
mínimo declarado de 80, con el piso fijado en el número medido. Correr la fecha se
puede, pero es una línea de diff con su motivo y con el avance conseguido, bajo
review, igual que bajar un piso.

Las tres cosas se declaran en el `package.json` del **propio paquete**, al lado de
sus exclusiones, dentro de un diff y bajo revisión:

```json
{
  "projects": {
    "cobertura": {
      "excluidos": [{ "patron": "src/generated/**", "motivo": "cliente generado por el ORM" }],
      "piso": { "lineas": 71.2, "funciones": 70.6, "ramas": 68.0 },
      "deuda": { "motivo": "heredado del piloto; el plan esta en el issue N", "fecha": "2026-12-31" }
    }
  }
}
```

Las claves del piso son las del marco (`lineas`, `funciones`, `ramas`) y una clave
desconocida es **roja**, no ignorada: un `functions: 80` escrito por costumbre de
vitest no declararía nada y el paquete quedaría sin piso creyendo tenerlo.

**El umbral del consumidor no abre esta compuerta.** El input `minimo` gobierna el
plano del diff, donde bajarlo es decisión del proyecto (con un `::warning::` que lo
deja escrito en la corrida). Sobre el total, el 80 del marco es piso **duro** y el
umbral local solo puede **subirlo**: bajarlo a 40 dejaba en verde un paquete al
33%, y esa medición es la razón de la asimetría. Los umbrales de vitest tampoco lo
abren, porque este plano recalcula el total desde el `lcov` en vez de creerle a la
configuración del paquete.

**Requisito para que el plano 2 mida lo que dice medir**: la cobertura del paquete
tiene que emitirse con `all: true`. Sin eso, el reporte solo trae los archivos que
alguna prueba importó y el total sale alto por omisión. El scaffold reparte esa
configuración ya armada en `vitest.config.base.mjs`.

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

1. Encuentra los `lcov` por glob y parsea `SF:`, `DA:`, `FN:`/`FNDA:` y `BRDA:`.
   Esta lectura y la resolución de rutas del punto 4 son **compartidas por los dos
   planos**, y ocurren antes de cualquier control del rango: el total no depende de
   ningún rango, así que en un push a `main` —donde el plano del diff no aplica— el
   total se mide igual.
2. Corre el **plano del total**: reparte la cobertura entre los paquetes que la
   contienen, la compara contra el mínimo del marco y escribe su sección del
   resumen. Su veredicto no cortocircuita nada: se guarda como piso del código de
   salida, así que el plano del diff sigue imprimiendo su diagnóstico completo y
   ningún `exit 0` de los suyos puede tapar un total en falta.
3. Saca las líneas agregadas o modificadas con `git diff --unified=0 <base> HEAD`
   —comparación de **dos puntos**, no de tres: `A...B` exige merge-base y muere
   en el clon superficial que deja `actions/checkout` por defecto—.
4. **Normaliza las rutas**: un `lcov` generado en Windows trae `web\src\App.tsx`
   y uno de Linux `web/src/App.tsx`; git siempre habla con barras normales. Sin
   esto el cruce da cero coincidencias y la compuerta pasa en verde por la razón
   equivocada.
5. Cruza: de las líneas agregadas mide las que el reporte declara con `DA:`, y
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
| `minimo` | `80` | Mínimo sobre las líneas del cambio. Sobre el total solo puede **subir** el del marco |
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
| `paquetes_medidos` | Paquetes cuyo total pudo medirse |
| `paquetes_bajo_minimo` | Paquetes por debajo del mínimo del marco, con deuda declarada o sin ella |
| `paquetes_en_rojo` | Paquetes que hacen fallar el plano del total |

### Qué pasa en cada caso, plano del total

| Situación | Veredicto |
| --- | --- |
| Todos los paquetes en o por encima del mínimo del marco | Pasa, y la sección del total sale igual en el resumen |
| Un paquete por debajo del mínimo sin motivo ni fecha | **Rojo**, con anotación sobre su `package.json` |
| La fecha declarada ya pasó y el paquete sigue debajo | **Rojo**: desde ese día se compara contra el mínimo, no contra el piso |
| La fecha declarada está vigente | Pasa en amarillo, y el resumen dice cuánto falta y cuántos días quedan |
| El total cayó por debajo del piso declarado | **Rojo**: retroceso, esté el piso arriba o abajo del mínimo |
| `piso` o `deuda` mal declarados (fecha inexistente, clave desconocida, motivo vacío) | **Rojo**: una declaración inválida no cuenta como declarada |
| El `minimo` del paso es menor que el del marco | El total se sigue comparando contra el del marco |
| Ningún reporte reclama archivos de un paquete | **No medido**, con `::warning::`. El plano del diff ya enrojece si hay líneas agregadas |
| Todo lo que los reportes reclaman está excluido con su motivo | Pasa, y los motivos quedan escritos en el resumen |
| Un paquete sin declaración, dentro de la ventana de estreno | Pasa en amarillo, nombrando el día en que será rojo |
| `FNDA:` que no se pudieron emparejar con sus `FN:` | Pasa, con `::warning::`: el total de funciones se publica como aproximado, no como exacto |

### Límites declarados

- **No prueba el orden.** Cierra "cambio sin prueba", no "prueba escrita después
  del arreglo".
- **El total se calcula sobre lo que los reportes reclaman.** Un archivo fuente
  que ningún `lcov` menciona no entra al denominador del total; lo caza el plano
  del diff cuando el cambio lo toca, y el censo de fuentes cuando queda fuera del
  alcance de las herramientas. Es el motivo por el que `all: true` no es
  opcional: sin eso, el archivo menos probado del repo es justo el que no molesta
  a nadie.
- **Las métricas del total salen de los registros por ítem del `lcov`** (`DA`,
  `FN`/`FNDA`, `BRDA`), no de sus líneas de resumen (`LF`/`LH`, `FNF`/`FNH`,
  `BRF`/`BRH`). Los resúmenes no se pueden fusionar cuando dos suites miden el
  mismo archivo: sumarlos cuenta el denominador dos veces. Consecuencia honesta:
  un reporter que no emita `FN`/`FNDA` deja la métrica de funciones sin
  denominador, y entonces sale como `n/a` en el resumen en vez de callarse.
- **La deuda es por paquete, no por métrica.** Una deuda vigente cubre el
  faltante del paquete en cualquiera de las tres métricas. Separarlas obligaría a
  tres declaraciones para un solo atraso.
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
- **El `minimo` del consumidor no tiene piso duro SOBRE EL DIFF.** El mínimo del
  marco es 80 (decisión D5); sobre las líneas del cambio un repositorio puede
  pedir menos, y el paso lo grita con un `::warning::` que dice cuál es el del
  marco: visible, no imposible. Sobre el **total** la asimetría es deliberada —
  ahí el 80 es piso duro y el umbral local solo puede subirlo—, porque con la
  otra regla la compuerta del total se apagaba bajando un número.
- **La fecha de la corrida se puede forzar con `COBERTURA_HOY`**, y eso podría
  revivir un plazo vencido. No es un input de la action (existe para el banco de
  pruebas) y cuando está puesta la corrida emite un `::warning::` diciéndolo: es
  la única palanca del script capaz de aflojar una compuerta, así que no puede
  usarse en silencio.

### Correrlo en local

Sin dependencias y sin red, desde la raíz del proyecto:

```bash
COBERTURA_BASE=$(git merge-base origin/main HEAD) \
  node ruta/a/projects/actions/cobertura-diff/medir-cobertura-diff.mjs
```

Su banco de pruebas (`actions/cobertura-diff/pruebas/`) arma repositorios git de
verdad y corre el script como lo corre la action. Son dos archivos, uno por plano
—`cobertura-diff.test.mjs` y `cobertura-total.test.mjs`—, y están separados a
propósito: mezclarlos hacía imposible leer cuál de las dos compuertas había
enrojecido.

```bash
node --test "actions/cobertura-diff/pruebas/*.test.mjs"
```

El banco del total corre con la ventana de estreno **cerrada**
(`COBERTURA_HOY` en una fecha posterior) porque lo que hay que fijar es el régimen
permanente; la ventana tiene sus dos pruebas propias, una a cada lado de la fecha.

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
