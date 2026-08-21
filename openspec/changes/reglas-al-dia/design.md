---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO
estado: pendiente-de-revision
---

# reglas-al-dia — Design

## Context

El área implementa con agentes. En ese modo **las reglas que el agente lee SON el
producto**: una regla que no entra al contexto de la sesión no existe, por bien
escrita que esté en otro repo. Y la superficie que las transporta es la única de
las cuatro formas de distribución que no tiene ni actualización ni check.

Las cuatro formas están declaradas en `projects/README.md:61-66`. *Referenciado*
llega solo cuando `v1` se mueve (`:63`). *Regenerado* ya tiene detección de
atraso desde el change anterior (`marco-ci.yml:359-372`). *Scaffold* dice
textualmente **«No se actualiza solo»** (`:64`) — y ahí viven los tres
`AGENTS.md`, los tres `CLAUDE.md` y los dos `.claude/settings.json`. El proposal
`2026-08-18-marco-se-cumple-solo` cerró el hueco de *regenerado* y no contempló
este.

Tres hechos verificados hoy, que juntos vuelven insostenible el carril actual:

**1. El scaffold ni siquiera entrega bien la primera vez.** La adopción de
intranet (`im-diego-ec/intranet`, rama `projects/adopcion-marco`, PR #1,
abierta hoy) copió `plantilla/AGENTS.md` y el resultado tiene 241 líneas contra
355. No es reflujo de formato: se perdieron reglas enteras. De las 7 viñetas ✅
quedaron 5, de las 9 🛑 quedaron 8. Concretamente desapareció la regla de
ejecutores que descargan (`plantilla/AGENTS.md:225-232`) — la única del bloque ✅
que **tiene un check vivo** detrás (`marco-ci.yml:942`) —, la sección entera
«Cuando el marco publica una versión» (`plantilla/AGENTS.md:152-180`, 29
líneas), el logging con `no-console`, el origen preciso de las alarmas, la regla
de escribir en sistemas de terceros y Well-Architected. `plantilla/.github/workflows/claude.yml`
tampoco viajó, así que la política de modelo del bot llegó como texto y sin su
ejecutor.

**2. Y donde el texto llegó, llegó cambiado en la sustancia.** La 🛑 de
`plantilla/AGENTS.md:253-256` dice que la instancia dev del proveedor de
identidad es **separada** y que el modo real exige `APP_ENV=prod` como guard
estructural. La copia de intranet (`AGENTS.md:173`) dice que «dev usa la
instancia real de Clerk pero con datos de prueba», y la cadena `APP_ENV` no
aparece ni una vez en el archivo. Esa regla nació del incidente del 2026-07-28,
cuando el scheduler de dev notificó a usuarios reales y cuatro empleados
«reservaron» en el ambiente de pruebas (`projects/README.md:39`). Un agente que
mañana trabaje en intranet lee una constitución que autoriza justo lo que ese
incidente prohibió, y nada en el repo lo señala.

**3. En el consumidor viejo la divergencia ya corre en las dos direcciones.**
`proyecto-origen/AGENTS.md:127` dice «(cola)» donde
`plantilla/AGENTS.md:196` dice «(cola, **nunca cancelación**)» — falta
exactamente la mitad que es la lección del 2026-08-13 (`projects/README.md:43`).
`:157` corta antes del porqué de los invariantes de propiedades
(`plantilla:244-245`). El nombre del check requerido `ci-ok`
(`plantilla:340-343`), que `projects/README.md:154-160` marca como *el error más
caro de la migración*, no está escrito en ningún archivo que un agente cargue.
Y sus 264 líneas mencionan **cero veces** la palabra «Projects»: la constitución de
un repo que consume el marco no nombra al marco.

Encima, tres reglas fijadas hoy —(a) escalar de modelo exige OK humano previo,
(b) cambiar settings de un repo exige OK humano previo, (c) la infra base es
primera opción y apartarse se pregunta ANTES— no llegaron a ningún archivo. La
(a) además está **contradicha**: `proyecto-origen/AGENTS.md:100-102` y
`plantilla/AGENTS.md:139-141` dicen «Escala por sesión (`/model`, `/effort
high`) cuando la tarea lo paga», sin compuerta. Un agente que lea la
constitución vigente escala solo, y lo hace bien según lo escrito.

La contramedida actual es la revisión trimestral, cuyo propio texto admite «La
revisión **no** es enforcement» (`projects/AGENTS.md:207-208`), y el aviso de
release de `plantilla/AGENTS.md:152-180`, que pide convertir un mensaje de Slack
en issue el mismo día. Los dos son rituales que alguien debe recordar, o sea
exactamente lo que `projects/README.md:14-20` declara que no cuenta.

La pregunta de diseño no es *qué* reglas distribuir. Es **quién escribe el texto
que el agente carga**, y hoy la respuesta es «cada proyecto, una vez, a mano».

## Decisions

### D1 — La porción del marco se REGENERA en un archivo propio; el `AGENTS.md` del proyecto sigue siendo del proyecto

El texto canónico vive en `projects/actions/constitucion/canonico/`, viaja **dentro**
de la composite action (el mismo transporte de
`actions/guardrail-deltas/action.yml:59-62`, `${GITHUB_ACTION_PATH}`, elegido
porque el `GITHUB_TOKEN` de un consumidor no lee otro repositorio) y se
**renderiza** contra los valores del proyecto para producir
`.projects/AGENTS-marco.md`. El `AGENTS.md` del consumidor queda con lo suyo y una
línea de import al artefacto.

El render es literal (`{{PLACEHOLDER}}` → valor, la convención que el marco ya
tiene en `projects/README.md:179-197`) y es obligatorio, no cosmético: sin él el
artefacto llevaría dobles llaves y pondría rojo el check «Sin marcadores del
scaffold sin resolver» (`marco-ci.yml:473-489`) del propio consumidor. Como
efecto lateral se cierra el defecto de los nombres pelados: `proyecto-origen/AGENTS.md:9,37,164,205,238`
dicen «Builder 1» donde `plantilla` dice `@{{BUILDER_1}}`; el día que la llave de
producción cambie de persona, cambia un valor y se re-renderizan las cinco.

El artefacto abre con una cabecera de una línea en comentario HTML
(`<!-- projects:constitucion version=1.4.0 sha=... -->`): greppable en disco para
el check y descartada antes de entrar al contexto, así que el sello no gasta
tokens. Es el patrón `generatedBy:` de las skills sin pagar contexto.

**Alternativa descartada: bloques sellados por hash dentro del `AGENTS.md` del
consumidor.** Es más elegante en el papel —el agente lee un solo archivo— y se
descartó por tres razones. (i) El sello es un checksum, no una firma: el arreglo
mecánicamente obvio para un rojo de «editado a mano» es recomputar el `sha256` y
volver a estampar, y eso degrada el caso a «atrasado, auto-arreglable», después
de lo cual el escritor pisa el bloque sin resistencia. Un guardrail cuyo bypass
es una línea de `sha256sum` depende de que alguien decida no tomarla, y eso es
lo que `projects/AGENTS.md:246-247` prohíbe. (ii) Obliga a reordenar las 264 líneas
del consumidor en spans contiguos, con un diff de migración imposible de
revisar. (iii) Acopla el sello al formateador: `AGENTS.md` **no** está en
`proyecto-origen/.prettierignore` y el único commit de contenido de ese
archivo desde el fork es un pase de Prettier (`8eb873a`). Un path es una
frontera que no se puede confundir; un rango de líneas dentro de un archivo
editable, sí.

**Alternativa descartada: dejarlo en scaffold y reforzar la revisión trimestral.**
Es el estado actual y los tres hechos del Context son su evaluación.

### D2 — Una fuente, una salida por superficie de agente que el repo declara

El artefacto no es «un archivo de Claude Code»: es **la porción del marco**, y se
emite una vez por cada superficie de instrucciones que el proyecto declara. Hoy
son dos, porque los tres `AGENTS.md` del área dicen en su primera línea «agentes
de IA (Claude Code, Cursor)»:

- `.projects/AGENTS-marco.md`, cargado por la cadena `CLAUDE.md → @AGENTS.md →
  @.projects/AGENTS-marco.md` (la primera mitad ya existe:
  `proyecto-origen/CLAUDE.md:11`);
- `.cursor/rules/00-marco.mdc`, mismo cuerpo, para la superficie que lee
  `AGENTS.md` como markdown plano y no expande imports.

Un solo generador, N salidas, todas con la misma cabecera y todas comparadas por
contenido en CI: la divergencia entre superficies queda imposible por check, no
por disciplina. El precedente existe en el propio marco: el check de artefactos
regenerados ya recorre `.claude` **y** `.agents` (`marco-ci.yml:365-368`), o sea
el CLI de OpenSpec ya emite dos superficies desde una fuente.

**Alternativa descartada: emitir solo para Claude Code.** Sería una regresión, no
un empate: hoy Cursor lee un `AGENTS.md` con todo adentro; con el split leería
solo lo del proyecto y perdería las fronteras 🛑 completas. Si en la
implementación el emisor de Cursor se recorta, hay que decirlo en voz alta en el
CHANGELOG, no dejarlo para «fase 2».

**Límite declarado:** el marco cubre las superficies que el repo **declara**. Una
herramienta nueva que alguien enchufe sin declararla queda fuera, y el marco no
puede verla. Por eso el requirement se enuncia sobre «las superficies que el
repositorio declara» y no sobre nombres de producto.

### D3 — Las entradas del render viven FUERA del directorio regenerado

`.projects/` es del marco y es **desechable**: el modo escribir puede borrarlo y
re-emitirlo entero. Por eso los dos archivos que son del proyecto viven en la
raíz, con el nombre que el marco ya usa para los archivos de excepción del
consumidor (`.projects-falsos-positivos.json`, `marco-ci.yml:126-135`):

- `.projects-valores.json` — los ~17 placeholders de `projects/README.md:179-197`. Los
  handles y las cuentas reales viven acá, del lado del consumidor, nunca en
  Projects (`projects/AGENTS.md:243-245`).
- `.projects-desvios.json` — los desvíos declarados (D4).

**Alternativa descartada: meterlos dentro de `.projects/`.** Se descartó por un
accidente concreto: si las entradas viven dentro del directorio regenerable, un
`rm -rf .projects && render` —lectura perfectamente natural de «este directorio lo
escribe el marco», y la doctrina que `proyecto-origen/.prettierignore:17-24`
ya documenta para lo generado— borra un desvío del proyecto y el render sigue
siendo **autoconsistente**: hash correcto, versión correcta, check en verde. Una
regla del proyecto desaparecida con todos los semáforos verdes es peor que la
divergencia de hoy. Fuera del directorio, el invariante queda sin asterisco:
todo lo de adentro es desechable, todo lo de afuera es del proyecto.

### D4 — El desvío legítimo se declara con motivo y se imprime PEGADO a la regla que anula

Cada regla del canónico lleva un id estable en comentario HTML
(`<!-- projects:regla id=dev-no-contacta-usuarios -->`): invisible en el render,
descartado antes del contexto, greppable para el check. Un desvío nombra ese id,
la fecha, quién aprobó y el motivo escrito.

Dos propiedades, y las dos son decisiones:

1. **El desvío se imprime dentro del artefacto que los agentes cargan, en el
   lugar de la regla que anula.** No en un JSON al costado y no sesenta líneas
   más abajo. La premisa del problema es que una regla que el agente no lee no
   existe; una **excepción** que el agente no lee tampoco, y produce algo peor:
   un agente cumpliendo a rajatabla una regla que el proyecto ya anuló, o
   leyendo una prohibición y una autorización sin saber cuál manda.
2. **Un desvío cuya regla ya no existe es rojo.** Es el patrón que el marco ya
   aplica a las exclusiones (`plantilla/README.md:180-184`, «si sobra, falla por
   excepción muerta») y a los falsos positivos del detector de secretos, cuyo
   comentario dice por qué el canal propio de la herramienta está cerrado:
   «callan sin dejar motivo ni rastro» (`marco-ci.yml:126-135`). El motivo se
   reimprime como `::notice::` y en el resumen de **cada** corrida, para que un
   motivo que envejeció mal quede a la vista en vez de fosilizarse.

Esto le da además datos a la revisión trimestral: el mismo desvío declarado en
varios proyectos es exactamente la señal que `projects/AGENTS.md:107-109` ya pide —
el guardrail no era general y sube como change.

**Alternativa descartada: no tener canal de desvío.** La rigidez sin salida
legal no produce cumplimiento, produce evasión: el proyecto edita el archivo de
solo lectura, que es justo el origen de la divergencia actual.

### D5 — (obligatoria) Los permisos del agente NO se regeneran: se verifican por propiedades, y asimétricas

`.claude/settings.json` no es prosa. La asimetría es la que ordena la decisión:
**un permiso de más es un riesgo; uno de menos es fricción.** Un mecanismo no
puede fallar cerrado en las dos direcciones, así que se separan:

- **De más → rojo.** Paso nuevo `Permisos del agente sin escritura`: una entrada
  del allowlist que autorice una operación mutante (`terraform apply`,
  `git push`, `gh pr merge`, `aws ... put|update|delete|create`, cualquier
  invocación con el perfil de producción) es roja salvo que esté declarada en
  `.projects-desvios.json` con motivo. La propiedad es sobre el **verbo**, no sobre
  una lista de comandos prohibidos que alguien tendría que mantener — el mismo
  criterio que ya usa `Ejecutores de paquetes pinados` con el ejecutor
  (`marco-ci.yml:942`).
- **De menos → aviso, nunca rojo, y jamás escrito por el marco.** El canónico
  publica un **piso recomendado** (los comandos que las propias reglas del marco
  exigen correr antes del push). Si falta, `::warning::` con la lista. Un
  permiso faltante no rompe nada: produce un prompt.
- **El ejecutor sin pin ya tiene dueño.** `proyecto-origen/.claude/settings.json:4-8`
  autoriza `npx --yes openspec ...` sin scope ni versión, contra
  `plantilla/.claude/settings.json:4-8` que pina `@fission-ai/openspec@1.9.0`.
  Eso no lleva regla nueva: lo caza el check existente
  (`marco-ci.yml:942`, que mira archivos rastreados no-`.md`). Meterlo también
  acá sería doble contabilidad, y en una doble contabilidad la declaración
  siempre pierde contra el check.
- **Repo sin allowlist versionado** (el caso de intranet, que no tiene `.claude/`
  en absoluto): `::warning::` ruidoso, nunca verde mudo. Es el límite que el
  check vecino ya declara (`marco-ci.yml:940-942`): lo rastreado es lo único que
  se puede mirar.

**Alternativa descartada: regenerar `settings.json` como la prosa.** Es
tentador —el archivo mapea 1:1 contra la plantilla y sus cuatro valores
concretos son cuatro placeholders— y se descarta por tres razones. (i) La
igualdad **borraría** entradas legítimas del proyecto: el identificador del
servidor MCP es de instalación (`{{ID_MCP_SLACK}}`, «tal como aparece en el
nombre de sus tools»), y los filtros de paquete son del repo. (ii) Un permiso
borrado es fricción silenciosa, y la salida más barata bajo fricción es
`settings.local.json`, que `.gitignore:35` excluye del repo: el marco estaría
**causando** la evasión que quiere evitar, y sacando el allowlist de la revisión
cruzada. (iii) La prosa se relee; un array JSON no. Un render con un placeholder
mal resuelto deja autorizado algo que nadie leyó nunca.

### D6 — (obligatoria) Una regla nueva entra con ventana de gracia fechada, y el PR se abre solo

Dos mecanismos independientes, ninguno de los cuales depende de que alguien se
acuerde:

1. **El rojo lo dispara una fecha, no el release.** Cada versión del canónico
   declara `publicada` y `exigible_desde`, y un check en el CI de Projects falla si
   `exigible_desde < publicada + 28 días`. Entre las dos fechas, un artefacto
   atrasado sale `::warning::` con el diff y el arreglo; desde `exigible_desde`,
   `::error::`. Si el consumidor acumuló varias versiones sin adoptar, manda la
   fecha de la **más vieja** pendiente. «El día que se publica nadie se pone
   rojo» pasa a ser propiedad del schema, no cortesía: es
   `projects/AGENTS.md:143-145` («se estrena en modo aviso») convertido en campo
   obligatorio.
2. **El PR de actualización se abre solo.** El scaffold trae
   `.github/workflows/actualizar-marco.yml` con `schedule` semanal y
   `workflow_dispatch`, `permissions: contents: write, pull-requests: write`,
   que corre la action en modo escribir y abre el PR con el artefacto al día.
   El camino normal deja de ser «acordate de correr algo» y pasa a ser «aparece
   un PR, lo revisás y lo mergeás». El rojo del día 28 queda para el repo que
   ignoró cuatro PRs.

La asimetría hay que decirla: **el check llega por el carril referenciado, a
todos, gratis** (`proyecto-origen/.github/workflows/ci.yml:55` e
`intranet/.github/workflows/ci.yml:17` ya hacen
`uses: .../marco-ci.yml@v1`); **el escritor es scaffold**, o sea la forma que
este change existe para arreglar. No es circular porque el check es lo que
fuerza la situación: un consumidor sin ese workflow igual se pone amarillo y
después rojo, y el modo verificar sube el artefacto corregido como
`upload-artifact` para aplicarlo a mano. Escribir en el repo de un consumidor
desde una sesión de Projects es 🛑 (`projects/AGENTS.md:255-256`): por eso el escritor
vive del lado del consumidor y abre PR, nunca commitea a `main`.

Un cambio urgente —una corrección de seguridad, o una regla que ya causó un
incidente— puede acortar la ventana con `urgente: true`, y esa marca es una
decisión que se justifica en la sección «Para consumidores» del CHANGELOG. Se
nombra la puerta de atrás en vez de fingir que no existe.

### D7 — La ausencia es roja, no `exit 0` mudo

El paso nuevo **no** tiene rama silenciosa de «no aplica». Es una decisión
deliberada contra la forma del vecino: `marco-ci.yml:365-372` sale por `exit 0`
con «este repo no tiene artefactos generados por el CLI: nada que verificar»
cuando no hay `.claude/` ni `.agents/`. Verificado hoy: en Projects `.claude/`
existe en disco pero **no está rastreado** (`git status --short .claude` →
`?? .claude/`), así que en CI el directorio no existe y ese check sale mudo en
el repo que lo publica. Repetir esa forma acá haría que el check pase justo en
el repo donde el problema es peor.

Entonces: repo consumidor sin `.projects/AGENTS-marco.md` → amarillo hasta su
`exigible_desde`, rojo después. Nunca verde.

Sobre el dogfooding, la honestidad completa: **Projects no puede comerse esta
medicina.** `projects/AGENTS.md` es la constitución del marco, no la de un
proyecto; no tiene ni debe tener el bloque de un consumidor, igual que el check
de marcadores admite que «en el repo del marco este check no verifica nada»
(`marco-ci.yml:481-485`). Las contramedidas son parciales y las dos son
obligatorias: fixtures dentro de la action que sí corren en el CI de Projects, y la
validación contra un consumidor real antes de mover `v1`
(`projects/AGENTS.md:150-156`).

## La propiedad, enunciada

> **Requirement: Las reglas del marco llegan íntegras a los agentes de cada
> proyecto**
>
> El marco SHALL mantener su porción de la constitución como un artefacto
> generado desde una fuente única y entregarlo a cada repositorio consumidor.
>
> El pipeline del repositorio consumidor SHALL rechazar el repositorio cuando
> ese artefacto falte, esté atrasado respecto de la versión exigible del marco,
> difiera del texto que el marco publica para esa versión, o no esté cargado por
> alguna de las superficies de instrucciones que el repositorio declara para sus
> agentes.
>
> Un proyecto SHALL poder apartarse de una regla declarando el desvío con la
> regla que anula y su motivo escrito; el desvío SHALL quedar impreso junto a esa
> regla dentro del mismo artefacto que los agentes cargan, y SHALL caducar
> —volviéndose un fallo— cuando la regla que anulaba deje de existir.
>
> Lo que el repositorio escribe fuera de ese artefacto es del proyecto, y el
> marco no lo modifica.

Nada en el enunciado nombra un producto, un formato de archivo ni una sintaxis
de import: habla de «superficies de instrucciones que el repositorio declara».
Si mañana se cambia de herramienta de agentes, cambia la lista de superficies y
el emisor; la propiedad sigue siendo la misma.

## Los scenarios

#### Scenario: Una regla nueva llega sin que el proyecto la escriba

- **WHEN** el marco publica una versión con una regla nueva y un repositorio
  consumidor no modifica una sola línea
- **THEN** en el repositorio se abre solo un pull request con el artefacto
  regenerado, y su pipeline avisa en cada corrida que el artefacto está atrasado,
  indicando desde qué fecha eso pasa a ser un fallo
- **AND** desde esa fecha el pipeline falla hasta que el artefacto quede al día

#### Scenario: El artefacto existe y ningún agente lo carga

- **WHEN** el artefacto está en el repositorio pero la superficie de
  instrucciones que el proyecto declara no lo referencia —o lo referencia dentro
  de un ejemplo de código, donde la referencia no se resuelve—
- **THEN** el pipeline falla nombrando el eslabón roto, porque un enlace de carga
  roto no emite ninguna señal por sí mismo y es indistinguible de que la regla
  nunca haya existido

#### Scenario: Alguien edita a mano la porción del marco

- **WHEN** el contenido del artefacto difiere del texto que el marco publica para
  la versión que el propio artefacto declara
- **THEN** el pipeline falla imprimiendo la diferencia, e indica que lo propio
  del proyecto va en su propio archivo y que una diferencia legítima se declara
  como desvío con su motivo

#### Scenario: El proyecto se aparta de una regla, con razón

- **WHEN** el proyecto declara un desvío nombrando la regla que anula, quién lo
  aprobó y su motivo escrito
- **THEN** el pipeline pasa, el desvío queda impreso junto a esa regla dentro del
  artefacto que los agentes cargan, y su motivo se reimprime en el resumen de
  cada corrida
- **AND** cuando una versión posterior del marco elimina esa regla, el pipeline
  falla por desvío muerto, con el motivo que tenía escrito en el mensaje

#### Scenario: Una diferencia que no es divergencia

- **WHEN** la única diferencia entre el artefacto y el texto publicado proviene
  del formateador del repositorio o del fin de línea del entorno de trabajo
- **THEN** el pipeline no la reporta como divergencia
- **AND** el artefacto queda fuera del alcance del formateador del proyecto, por
  la misma razón y con el mismo mecanismo con que ya lo están los artefactos del
  CLI de OpenSpec

## Cómo se hace cumplir solo

| Requirement | Check | Falla cuando |
|---|---|---|
| Artefacto presente y al día | paso `Constitucion del marco al dia` (job `higiene` de `marco-ci.yml`) | falta el artefacto, o su versión declarada es menor que la exigible; antes de `exigible_desde` es `::warning::`, después `::error::` |
| El contenido es el que el marco publica | ídem | el cuerpo difiere del re-render de la versión que declara, comparado con fin de línea normalizado |
| Cadena de carga intacta, por superficie declarada | ídem | una superficie declarada no referencia el artefacto fuera de comillas y bloques de código |
| Desvío con motivo escrito | ídem | el motivo falta o está vacío |
| Desvío que sobrevivió a su regla | ídem | el id que nombra no existe en el canónico de la versión vigente |
| Permisos del agente sin autorización de escritura | paso `Permisos del agente sin escritura` (nuevo) | una entrada del allowlist autoriza una operación mutante y no está declarada como desvío |
| Ejecutores del allowlist pinados | `Ejecutores de paquetes pinados`, **ya existente** (`marco-ci.yml:942`) | una invocación por un ejecutor que descarga no lleva versión exacta |
| Piso de permisos recomendado | ídem paso nuevo, `::warning::` | falta una entrada del piso — **rojo a propósito no, porque un permiso de menos es fricción y no riesgo** |
| Allowlist no versionado | ídem paso nuevo, `::warning::` | el repo no rastrea `.claude/settings.json`: lo no rastreado no se puede mirar, y callarse sería declararlo sano |
| La ventana de gracia existe de verdad | check en el CI de **Projects** | una versión del canónico declara `exigible_desde < publicada + 28 días` |
| El `AGENTS.md` del proyecto no contradice al artefacto | **— sin check** | no hay forma mecánica de distinguir «lo dice distinto» de «lo contradice». La mitigación real es de migración: el texto derivado del marco se borra del archivo del proyecto, así el duplicado no existe |
| El agente obedece lo que lee | **— sin check, y no puede haberlo** | ver la última sección |

## Migración de los dos consumidores

El orden importa y el primer bloque es bloqueante: **si la primera regeneración
corre antes de subir lo que hoy solo vive en los consumidores, el escritor lo
borra.** Esa es la única forma en que este change puede hacer daño neto.

**Bloque 0 — subir al canónico lo que los proyectos ya aprendieron (antes de
tocar un solo consumidor).** De `proyecto-origen`: `claude.yml` como
**ejecutor** de la política de modelo (`AGENTS.md:105-106` +
`.github/workflows/claude.yml:49`, `--model sonnet --effort medium
--max-turns 5`), la cifra `$10/$50 vs $3/$15 por MTok` (`:107-108`, que
`plantilla:145-146` diluyó a «varias veces el costo»), el orden de riesgo del
issue #73 (`:154`), «lección repetida **3 veces**» (`:196`, cuyo conteo es lo que
hace creíble la regla), y la procedencia del `Closes` con su fecha y su cazador
(`:258`). De su tooling: la entrada de `.prettierignore:17-24` para lo que genera
el CLI y el `.gitattributes:9` (`* text=auto eol=lf`) — `plantilla/` no tiene
`.gitattributes` en absoluto, y sin él un proyecto nuevo en Windows compararía
CRLF contra LF y saldría rojo por un motivo que no es el suyo. De
`projects/AGENTS.md`, lo que gobierna al consumidor y hoy vive solo donde el
consumidor no lo carga: el hueco conocido del guardrail de deltas (`:78-84`) y
«los proyectos no editan el marco desde su repo» (`:160-183`). Y las tres reglas
de hoy, con la (a) entrando como **corrección** del texto vigente
(`plantilla:139-141`), no como agregado.

**Bloque 1 — `proyecto-origen`.** Ya consume `@v1` (`ci.yml:55`), así que el
check le llega solo. El PR crea `.projects-valores.json`, corre el escritor y
reescribe `AGENTS.md` dejando lo genuinamente propio (~13 líneas: la tabla de
stack `:11-20`, el `spec/` archivado en `docs/legacy-spec/` `:29-30`, «se activa
cuando Builder 2 esté operativo» `:251-253`), más `.projects/` en `.prettierignore`. Se
recomienda partirlo en dos PRs —el mecánico primero, el de contenido después—
porque el segundo trae correcciones sustantivas que no deben diluirse entre el
ruido. Ganancia verificable en el mismo PR: vuelven «cola, **nunca
cancelación**», el nombre del check requerido `ci-ok`, el porqué de los
invariantes, la tabla de Ambientes con el CORS, y la regla de ejecutores
pinados — cuya ausencia hoy convive con un `settings.json:4-8` que autoriza
`npx --yes openspec`.

**Bloque 2 — `intranet`.** Es el caso más urgente aunque parezca el más nuevo: su
adopción está **abierta y sin mergear** (PR #1, rama `projects/adopcion-marco`), así
que la corrección entra antes de que la copia lossy quede en `main`. Su `ci.yml`
ya llama a `@v1` (`:17`). Se hace en el mismo PR de adopción: `.projects-valores.json`,
render, y su `AGENTS.md` baja a lo propio —tabla de stack, «no existe
`infra-prod/` todavía», «producción no aprovisionada», «credenciales por defecto
sin perfil nombrado»—. Dos cosas dejan de ser silenciosas: vuelven las reglas
que la copia perdió (ejecutores pinados, el aviso de versión del marco, logging,
origen preciso de las alarmas, sistemas de terceros), y **la diferencia real
sobre la instancia de identidad compartida deja de ser una edición de prosa y
pasa a ser un desvío declarado**, con id de regla, aprobador y motivo, impreso
al lado de la 🛑 que anula. Falta además su `.claude/settings.json`: hoy el
repo no versiona el allowlist de su agente y ese hueco sale como `::warning::`.

**Estreno.** Hay dos consumidores, no uno: la regla de `projects/AGENTS.md:143-145`
aplica y el paso se publica en MINOR con la ventana de gracia activa, o sea
amarillo para todos desde el día uno. `v1` se mueve **después** de que los dos
PRs de migración estén mergeados y verificados, que es lo que exige
`projects/AGENTS.md:150-156`.

## Lo que este diseño NO resuelve

- **El marco puede garantizar que el TEXTO llegue; no que el agente lo OBEDEZCA.**
  Este es el límite de fondo y hay que decirlo con todas las letras: lo que el
  check compara son bytes en un archivo. Que la regla esté, íntegra y al día, en
  la superficie que el agente carga, no dice nada sobre si el agente la va a
  aplicar en el turno 40 de una sesión larga, ni sobre si va a resolver bien un
  caso que la regla no contempla. Es la misma promesa acotada que
  `marco-ci.yml:348-352` declara para los artefactos regenerados, y hay que
  declararla igual de fuerte: **esto cierra el hueco de DISTRIBUCIÓN, no el de
  comportamiento.** Cualquier lectura que confunda las dos cosas va a producir
  confianza mal puesta.
- **La contradicción no declarada sigue siendo invisible.** Si el `AGENTS.md` del
  proyecto dice una cosa y el artefacto del marco dice la contraria, no hay
  precedencia documentada entre archivos cargados a la vez, y ningún check lo
  caza. La migración borra el duplicado, y el canónico va a decir en prosa que
  ante conflicto manda el bloque del marco y que el único override válido es un
  desvío declarado — pero eso es una regla para el lector, no un check.
- **Un consumidor que saca el `uses:` deja de recibir todo.** El paso vive dentro
  del workflow reusable; borrar el artefacto es rojo, borrar el artefacto **y**
  el `uses:` no lo caza nada desde el CI del consumidor. Eso lo cierra el ruleset
  de `main` exigiendo `ci-ok` más review de code owner sobre `.github/workflows/`
  — y en `proyecto-origen` ese enforcement duro todavía no está activo
  (`AGENTS.md:251-253`). Lo mismo con el pin a SHA, que `actions/README.md:28-31`
  permite: un consumidor pinado deja de recibir reglas y desde Projects eso no se ve.
- **La dirección inversa sigue sin mecanismo.** Una mejora que un proyecto
  descubre y debe subir al marco —el tipo (b) de `projects/AGENTS.md:193-197`, y
  todo lo que este change tiene que rescatar a mano en el Bloque 0— sigue
  dependiendo de la revisión trimestral, que su propio texto declara que no es
  enforcement. Este canal es de una sola dirección.
- **Fricción proporcional a la frecuencia de edición.** Cada cambio del canónico
  produce un PR por repo. Con dos consumidores es barato; con diez es un PR por
  repo por release, y el riesgo residual real es que la fricción empuje a
  redactar menos, que es lo contrario de lo que se busca. Mitigación: agrupar
  cambios de constitución en releases en vez de soltarlos de a uno.
- **El desvío puede volverse la puerta de escape.** Nada limita cuántos declara
  un proyecto: se puede quedar verde con la constitución completa y quince
  desvíos que la vacían. Lo único que lo contiene es que cada uno sea un diff con
  motivo escrito bajo CODEOWNERS y se reimprima en cada corrida. Si eso no
  alcanza, la palanca siguiente (tope numérico, o gate del PO) no está en este
  diseño.
- **El motivo de un desvío se verifica que exista, no que sea sincero.** Y
  `.projects-valores.json` no se valida semánticamente: un handle que no existe en
  la organización renderiza igual, el mismo límite que el marco ya declara para
  CODEOWNERS.
- **El artefacto no ahorra un token de contexto.** Partir en un archivo importado
  organiza, no reduce: el total sube. Este diseño compra actualizabilidad y paga
  con contexto, y crea el incentivo de que agregar una regla al marco sea barato
  mientras el costo lo paga cada sesión de cada repo. Se acota con un presupuesto
  de líneas del canónico verificado en el CI de Projects; se acota, no se elimina.
- **Projects no se dogfoodea acá** (D7), y además hoy su propio `.claude/` no está
  rastreado, así que el check de artefactos regenerados sale mudo en el repo que
  lo publica. Rastrearlo es un ítem del tasks, independiente de este mecanismo.