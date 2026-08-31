# Construir con OpenSpec: del PRD al pull request

Esta página es para el **[builder](02-glosario.md)**, y es la segunda del par:
acá se convierte en código lo que la anterior decidió que había que construir.
Empieza donde termina [08-descubrimiento.md](08-descubrimiento.md), o sea con un
**PRD** ya pulido en la mano.

**Si llegaste sin PRD**, volvé: escribir el proposal sin haber hecho el
descubrimiento es documentar una decisión que nadie tomó.

Lo que se hace acá y quién lo aprueba, que no es lo mismo:

| Lo que producís | Quién lo aprueba |
| --- | --- |
| `proposal.md` — por qué y qué cambia | el [PO](02-glosario.md) |
| `specs/` — los escenarios, o sea cómo se comporta | el PO |
| `design.md` — cómo, y qué se descartó | el otro builder |
| `tasks.md` — los pasos, en orden | el otro builder |

**Palabras del marco que vas a ver acá**, cada una definida en una línea en el
[glosario](02-glosario.md): [ADR](02-glosario.md), [andamio](02-glosario.md), [archive](02-glosario.md), [carril](02-glosario.md), [change](02-glosario.md), [CODEOWNERS](02-glosario.md), [constitución](02-glosario.md), [delta](02-glosario.md), [PRD](02-glosario.md), [proposal](02-glosario.md), [spec](02-glosario.md),
[requirement](02-glosario.md), [scenario](02-glosario.md), [SHALL](02-glosario.md).

Esa tabla está en `.github/CODEOWNERS` y GitHub la hace cumplir sin que nadie se
acuerde. Lo que sigue explica cómo se escribe cada parte; qué te toca a vos y qué
no está en [07-para-el-builder.md](07-para-el-builder.md).

---
### 7 · La sesión del proyecto: proposal y deltas

Acá cruzás. Abrís una sesión de agente **en la carpeta del repo**, y eso importa: hereda sola
toda la constitución, porque el andamio dejó la cadena armada.

```
CLAUDE.md  ──importa──►  AGENTS.md  ──importa──►  .projects/AGENTS-marco.md
                         (lo del proyecto)         (las reglas del área)
```

Más `.claude/settings.json`, y los **6 comandos `/opsx:*`** y las 6 skills `openspec-*` que
dejó `openspec init` (lo corre `projects init` en su último paso; si ese paso falló, no están y
hay que correrlo a mano).

##### 7.a El nombre del change, que es lo primero que hay que elegir

**El nombre del change es la rebanada que vas a especificar, no el proyecto.** Es el error
más natural: uno viene de pensar «el sistema de compras» y ese es el nombre del *repo*, no de
un change. Un change es un pedazo que se propone, se aprueba, se implementa y se archiva; si
su nombre abarca todo el sistema, nunca va a poder cerrarse.

| ❌ | ✅ |
|---|---|
| `primera-version-del-sistema-de-compras` | `recepcion-de-mercaderia` |
| `compras` | `conciliacion-orden-remito` |

Es el mismo alcance que declaraste en el prompt del paso 5. Si ahí escribiste *«recepción de
mercadería, desde que llega el camión hasta que se concilia con la orden»*, el change se llama
`recepcion-de-mercaderia`.

Reglas del nombre: **kebab-case** (minúsculas y guiones), sin espacios, sin acentos, sin
mayúsculas. Si le pasás una descripción en vez de un nombre, el comando lo deriva solo
(*«agregar autenticación de usuarios»* → `add-user-auth`); si le pasás algo que no es
kebab-case, lo rechaza y te pide otro.

Y **la fecha no la pones vos**: los changes archivados llevan prefijo
(`2026-08-13-carril-docs-completo`) y lo agrega `openspec archive` al cerrar. Mientras el
change está vivo, es solo el nombre.

##### 7.b Crear el change

**El directorio lo crea un comando, y el proposal se escribe antes que todo lo demás.**

```bash
npx --yes @fission-ai/openspec@1.9.0 new change recepcion-de-mercaderia
```

> **Por qué el comando es tan largo.** `openspec` **no es un programa instalado en
> tu computadora**: no está en tu proyecto ni en tu sistema, y escribir `openspec`
> a secas te va a contestar `command not found`. `npx` lo baja y lo corre en el
> momento, y `@1.9.0` fija **la misma versión que el marco verificó**. Un comando
> sin versión trae la última publicada, que puede cambiar entre tu máquina y el
> CI — y entonces el rojo que ves no es el rojo que le pasa a los demás.
>
> Es la forma que usan todos los comandos de OpenSpec de esta página. Copiala
> tal cual.

Crea `openspec/changes/recepcion-de-mercaderia/` y **para ahí**: no escribe ningún
artefacto. Eso es exactamente lo que hace falta, porque el primero que se escribe es
`proposal.md` y lo escribís vos. La página [07-para-el-builder.md](07-para-el-builder.md)
sección 3 dice qué contesta cada archivo del change y en qué orden.

**El nombre no puede llevar espacios.** `new change "recepción de mercadería"` sale con
`Change name cannot contain spaces`. Usá guiones, en minúscula: es el nombre de una
carpeta.

##### 7.b.1 ¿Y ahora qué escribo?

Ese comando termina diciéndote el siguiente, y conviene hacerle caso:

```bash
npx --yes @fission-ai/openspec@1.9.0 status --change recepcion-de-mercaderia
```

Te contesta **qué artefactos le faltan a tu change y en qué orden van**. Es la respuesta
directa a «¿y ahora qué?», y no hay que acordarse de nada: lo dice él.

> **Por qué este comando y no `/opsx:propose`.** Los dos crean el change, pero `propose`
> dice de sí mismo que *«genera todos los artefactos en un solo paso»*: proposal, deltas,
> `design.md` y `tasks.md` juntos. Eso rompe la [compuerta](02-glosario.md) del PO — el PO
> terminaría aprobando un proposal cuyo diseño ya está escrito, o sea decidiendo el *qué*
> cuando el *cómo* ya está decidido.
>
> **Lo que sí conviene usar antes:** `/opsx:explore`, que es para pensar el problema en voz
> alta sin escribir todavía ningún artefacto. Y una vez que el proposal está aprobado,
> `/opsx:apply` para implementar las tareas.
>
> Los comandos `/opsx:*` que llegan al proyecto son **seis** —`explore`, `propose`,
> `apply`, `archive`, `sync`, `update`— y las skills de OpenSpec son **seis**; la séptima
> que vas a ver, `projects-archive-change`, la pone este marco y no OpenSpec.

**¿Y OpenSpec no se queja de un archivo que él no creó?** No, y está medido el 2026-08-31:
el change `capa-descubrimiento` del propio marco tiene **siete archivos extra** adentro (un
directorio `piloto/` completo) y `openspec validate --all --strict` da *18 passed, 0 failed*,
exit 0.
OpenSpec **ni lee ni valida** los archivos que no son sus artefactos — simplemente los ignora.

**Y por qué ahí y no en `docs/`:** porque la lista habla de los deltas. Cuando el delta cambia,
la lista cambia con él; tiene que viajar en el mismo PR, pasar por el mismo review y archivarse
con el change. En `docs/` se separaría de lo único que le da sentido y nada las mantendría
juntas.

Recién con el directorio creado, copiás la lista — el único archivo del descubrimiento que se
commitea:

```bash
cp ~/descubrimiento-<proyecto>/lista-de-cobertura.md \
   openspec/changes/recepcion-de-mercaderia/cobertura.md
```

```powershell
Copy-Item "$HOME\descubrimiento-<proyecto>\lista-de-cobertura.md" `
          "openspec\changes\recepcion-de-mercaderia\cobertura.md"
```

Dos diferencias, y las dos rompen callado: la continuación de línea en PowerShell es la
**comilla invertida**, no la barra; y `~` en un argumento suelto llega literal, así que
`Copy-Item` iría a buscar una carpeta llamada `~` dentro del repo. `$HOME` sí se expande.

##### 7.c El prompt

Le pasás **tres cosas, no una**: el PRD, los documentos originales y la lista.

```
Este es el PRD de este proyecto, ya revisado por mí:
  ~/descubrimiento-<proyecto>/prd.md

Los documentos originales del negocio, que son la fuente de todo, están en:
  ~/descubrimiento-<proyecto>/documentos/

Y la lista de cobertura ya está en
openspec/changes/recepcion-de-mercaderia/cobertura.md, con sus dos primeras
columnas llenas.

Escribí SOLO el proposal y los deltas de specs de este change:
  openspec/changes/recepcion-de-mercaderia/proposal.md
  openspec/changes/recepcion-de-mercaderia/specs/<capability>/spec.md

NO escribas design.md ni tasks.md todavía: el PO tiene que aprobar el proposal y
los deltas primero, y si el design ya está escrito su aprobación es un trámite.

Cada escenario que escribas tiene que corresponder a una o más filas de
cobertura.md. Si necesitás afirmar algo que no tiene fila, no lo inventes: decime
cuál es y por qué hace falta.
```

**El PRD solo no alcanza**, y por eso van los documentos: si es lo único que entra, la sesión
puede citar el PRD pero no de qué documento del PO salió cada cosa, y la lista queda
apuntando al intermediario en vez de a la fuente.

⚠️ **Crear el change deja el CI rojo hasta que tenga su delta.** Se crea y se completa en la
misma sesión, o se trabaja en una rama sin PR abierto todavía.

### La trampa del castellano, y es la que más cuesta descubrir sola

**Todo se escribe en castellano menos una palabra.** La línea que declara qué tiene que
hacer el sistema —el [requirement](02-glosario.md)— necesita la palabra
**[`SHALL`](02-glosario.md)** o **`MUST`**, en
inglés y en mayúsculas. No es un gusto: es lo que el validador busca para reconocerla, y
ese validador es el que corre en las verificaciones automáticas.

Medido con el validador que este marco usa:

```text
"El sistema DEBE avisar al responsable..."    ->  falla, exit 1
"El sistema SHALL avisar al responsable..."   ->  pasa,  exit 0
```

Y el error que te va a dar **no menciona la palabra**: dice que el change no valida, sin
decir cuál es el renglón. Es la trampa que más cuesta descubrir por cuenta propia.

**Un delta completo, para copiar la forma.** Los tres encabezados son obligatorios y van
en ese orden — `## ADDED Requirements`, `### Requirement:` y `#### Scenario:`:

```markdown
# recepcion-de-mercaderia — Delta

## ADDED Requirements

### Requirement: La recepción registra quién recibió y cuándo

El sistema SHALL registrar, por cada entrega recibida, la persona que la recibió y
la fecha y hora en que ocurrió.

#### Scenario: Se recibe una entrega completa

- **WHEN** el encargado marca una entrega como recibida
- **THEN** queda guardada la persona y el momento
- **AND** la entrega deja de aparecer en la lista de pendientes

#### Scenario: Se recibe una entrega incompleta

- **WHEN** el encargado marca una entrega como recibida con faltantes
- **THEN** queda guardada igual, y además qué faltó
```

Todo lo demás —el título, lo que dice el requirement, los escenarios— va en castellano.
Lo único en inglés son las tres palabras de estructura y el `SHALL`.

### 8 · La tercera columna, y con eso el PR

Misma sesión del proyecto, con los deltas ya escritos:

```
Llená la columna "destino" de openspec/changes/recepcion-de-mercaderia/cobertura.md.

Cada fila recibe exactamente una de tres formas, y ninguna otra:
- el título del escenario que la implementa;
- "fuera de alcance: <razón>", si la afirmación es real y la dejamos afuera a
  propósito;
- "pregunta abierta: <la pregunta>", si el documento no la resolvía.

Prohibido "n/a", prohibido dejarla vacía y prohibido inventar un escenario para
llenarla: si una fila no tiene destino, DEJALA VACÍA y listámela aparte. Una fila
sin destino es algo que se perdió, y encontrarlo es para lo que existe esta lista.

No toques las dos primeras columnas: están congeladas desde el paso 4.

Y para las filas cuyo "de dónde" dice DEDUCIDO: no pueden quedar como un escenario
normal. O van como "pregunta abierta", o el escenario lleva escrita la marca de
supuesto. Escribir una deducción como si el documento la dijera deja una invención
indistinguible de un requerimiento real.
```

Las filas que te devuelva sin destino son el resultado más valioso del día: es lo que el PO
dijo y no llegó a ningún lado. Cada una se resuelve —entra como escenario, se declara fuera
de alcance, o se convierte en pregunta abierta— y recién entonces el PR está completo.

**Una pregunta abierta impide archivar el change.** Podés proponer y diseñar con dudas; no
podés convertirlas en contrato callándolas. Es la única parte de todo esto que es regla del
marco: el resto es convención, y **ningún comando valida esta lista** — `validate --strict`
no la mira.

La lista viaja en el mismo PR que los deltas: cuando el delta cambia, la lista cambia con él.
Su dueño es quien escribe el delta —una lista que llena un tercero después es una
reconstrucción— y su lector es el PO en el review, porque es lo que le permite revisar **por
contenido** en vez de por confianza.

Y lo que la lista **no** compra, dicho para que nadie se confíe: garantiza que cada escenario
tenga **procedencia**, no que la procedencia sea **buena**. Un documento puede contener una
mala idea, y la lista la va a rastrear con toda fidelidad hasta su origen.

---

### 9 · Lo que viene después de que el PO aprueba

Hasta acá está escrito **qué** hay que construir y el PO lo aprobó. Faltan las dos
mitades que aprueba el otro builder, y después construir.

**El orden importa y no es estético.** Si el `design.md` ya está escrito cuando el
PO aprueba el proposal, su aprobación es un trámite: está decidiendo el *qué*
cuando el *cómo* ya está decidido. Por eso se escribe ahora y no antes.

#### 9.a `design.md` — cómo, y qué se descartó

Lo aprueba **el otro builder**, no el PO. La sección que justifica el archivo es
**qué se descartó y por qué**: dentro de seis meses alguien va a proponer
exactamente eso, y sin el motivo escrito no hay forma de saber si el contexto
cambió o si es la misma idea otra vez.

#### 9.b `tasks.md` — los pasos, en orden

Cada tarea tiene que **poder marcarse**. «Mejorar el rendimiento» no se marca;
«bajar la consulta de N+1 a una sola, medido con el script X» sí.

> **El esqueleto de los cuatro archivos, con qué contesta cada uno, viaja dentro
> de tu proyecto**: `docs/plantillas/change.md`. Está ahí y no acá a propósito —
> lo tenés a mano cuando lo necesitás, sin salir del repositorio.

#### 9.c Implementar

```bash
/opsx:apply
```

Toma las tareas de `tasks.md` y las ejecuta en orden. Es el único comando de la
familia que escribe código, y por eso va **después** de las dos aprobaciones y no
antes.

#### 9.d Cerrar el change

Cuando el PR está mergeado y el comportamiento existe, el change **se archiva**:
pasa a `openspec/changes/archive/YYYY-MM-DD-<nombre>/` y los deltas se incorporan
a `openspec/specs/`, que es la foto de cómo se comporta el sistema hoy.

Tu proyecto trae una skill para eso —`projects-archive-change`— y **se usa ésa, no
el `archive` del CLI**: el archivado tiene que dejar también el rastro de qué se
aprobó y cuándo, y eso el CLI no lo hace.

Para ver en qué estado quedó todo:

```bash
npx --yes @fission-ai/openspec@1.9.0 list
```

> **Una pregunta abierta impide archivar.** Es la regla del marco que ya se nombró
> arriba, y acá es donde muerde: un change con una pregunta abierta sin resolver no
> se cierra, porque cerrarlo convertiría la duda en contrato sin que nadie la haya
> decidido.

---

### Lo primero que hacés, y lleva media hora

**No está medido que BMAD sepa leer documentos como los del PO.** La documentación del
proveedor dice que lee un documento con **su** formato; que digiera procesos levantados,
listas de casos raros y un prototipo, no lo probó nadie.

Así que la primera media hora es exactamente esa prueba: **un documento solo**, antes de
abrirle todo. Si no lo entiende, ya sabés a qué te enfrentás y lo anotás. Lo que no se puede
es descubrirlo a media tarde y llamarlo «un problema de instalación».

### Qué NO tocar de BMAD

BMAD hace mucho más que el PRD, y casi todo lo demás compite con algo que el marco ya tiene
resuelto y con gates que fallan solos.

| No tocar | Por qué |
|---|---|
| `bmad-architecture`, `bmad-create-epics-and-stories`, `bmad-sprint-planning` | Duplicaría las decisiones técnicas entre su `architecture.md` y el `design.md` y los ADRs del marco |
| `bmad-build`, `bmad-build-auto`, `bmad-code-review`, `bmad-qa-generate-e2e-tests`, `bmad-retrospective` | Compite con gates que ya funcionan solos: review cruzado por CODEOWNERS, PR por bloque, CI |
| El «flujo rápido» que produce un `tech-spec-<slug>.md` | Crearía un tercer carril al lado de «change de OpenSpec o PR directo», que es justo la ambigüedad que esa regla existe para cerrar |
| `bmad-product-brief` y la fase Analysis | Es para elicitar, y el trabajo ya está hecho |
| Los agentes de persona (`bmad-agent-architect`, `bmad-agent-dev`) | Son de las fases que no se adoptan |

### Lo que de esto NO está verificado

Se dice en vez de rellenarse, porque un hueco declarado se resuelve en dos minutos el lunes
y una invención plausible cuesta la tarde:

- Si además de invocar la skill por nombre existe un comando `/bmad-prd`.
- Si el Brain dump acepta un **directorio** como entrada o solo rutas de archivo sueltas.
- Qué pregunta exactamente en **Stakes calibration** y en **Working mode**, y qué modos hay.
- Cuántas idas y vueltas toma el flujo completo más allá de las 2 o 3 declaradas.
- Qué hace si un documento de entrada no se puede leer: no hay manejo de error descrito.
- La ruta literal final de `prd.md`: depende de su `config.yaml`, que se genera al instalar.
- Si al entrar en **Update** hay un paso formal de aprobación de cada conflicto, o solo se
  muestran antes de aplicar.
- Si sin `uv` la skill falla visible o en silencio.

Lo que aparezca acá el lunes va al registro de la adopción, y de ahí a la corrección de esta
guía.

---
