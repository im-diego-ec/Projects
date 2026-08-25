# Glosario

**Para quién es esta página.** Para cualquiera que se tope con una palabra rara
en este repositorio, sea técnico o no. Es la única página de `docs/` a la que el
resto enlaza: cuando otra página usa una palabra propia del marco, la enlaza acá,
y acá está su línea.

Este archivo existe porque el vocabulario del marco es corto pero cerrado: son
las treinta y siete palabras de la tabla de abajo, que se repiten por todo el
repositorio y que hasta hoy ningún archivo definía. Acá no va cuántas veces
aparece cada una: ese número se mueve con cada pull request y quedaría viejo el
mismo día en que se escribe. Si lo querés hoy, medilo:

```sh
grep -rhoiF --include="*.md" --include="*.mjs" --include="*.yml" --include="*.json" \
  --exclude-dir=.git --exclude=CHANGELOG.md -- "<término>" . | wc -l
```

Lo que no se movía era el otro número: ninguna de las treinta y siete tenía una
línea que dijera qué es.

Cada fila se lee sola: no supone que hayas leído el `README.md`, ni `AGENTS.md`,
ni ningún otro documento. La tercera columna es la que importa cuando la primera
no alcanza — dice **dónde se decide** esa cosa, o sea qué archivo manda si dos
personas la entienden distinto.

Si no sos técnico, con cinco filas te alcanza para casi todo lo que vas a ver:
**change**, **proposal**, **spec**, **scenario** y **compuerta**. Esas cinco
están explicadas con más aire, con un ejemplo real y con qué hacer cuando algo
queda bloqueado, en [para-el-po.md](para-el-po.md).

| Término | Qué es, en una frase | Dónde se decide |
|---|---|---|
| **ADR** | *Architecture Decision Record.* Una decisión estructural que ya se tomó, escrita con sus alternativas descartadas, para que nadie la vuelva a discutir sin datos nuevos. | [`docs/adr/`](adr/) — una carpeta, un archivo numerado por decisión |
| **andamio** | El árbol de archivos que un proyecto nuevo recibe copiado una sola vez el día que nace: constitución, gobernanza, configuración, plantillas. Es la palabra que este repo usa para *scaffold*. | [`plantilla/`](../plantilla/) es el árbol; lo copia `herramientas/projects-init.mjs` |
| **archive** | El paso que cierra un change: funde sus deltas en los specs vivos y mueve el change a `openspec/changes/archive/` como historia inmutable. Después de archivar, el contrato vigente ya incluye lo propuesto. | El comando `openspec archive` del CLI de OpenSpec; el ciclo de vida está escrito en `actions/constitucion/canonico/10-openspec.md` |
| **builder** | El rol que es dueño del *cómo*: diseño técnico, tareas, implementación y review cruzado entre builders (el que no escribió, revisa). | El reparto de roles vive en `actions/constitucion/canonico/10-openspec.md`; quién es quién, en el equipo de GitHub que nombra `CODEOWNERS` |
| **bump** | Subir la versión a la que un proyecto apunta cuando consume el marco. Llega como un pull request automático de Dependabot, no como una tarea que alguien recuerda. | [`plantilla/.github/dependabot.yml`](../plantilla/.github/dependabot.yml) en el repo del proyecto |
| **canónico** | Una de las cuatro formas de distribución: lo que vive **solo acá** y ningún proyecto copia — los specs del marco. Un proyecto los lee; no los duplica. | La tabla «Principio de distribución» del [`README.md`](../README.md); el contenido, en [`openspec/specs/`](../openspec/specs/) |
| **capability** | Un área de comportamiento que el marco garantiza, con su propia carpeta de spec: calidad de código, gobierno de la contribución, despliegue y CI, entrega, verificación de lo desplegado, observabilidad, secretos e infraestructura. | Una carpeta por capability en [`openspec/specs/`](../openspec/specs/) |
| **carril** | Cada uno de los dos caminos por los que puede pasar un pull request: el de **código** (lint, tests, build) y el **rápido**, el de cambios que solo tocan documentación y no necesitan compilar nada. | La detección la hace el job `cambios` de [`.github/workflows/marco-ci.yml`](../.github/workflows/marco-ci.yml) y la publica como salida `solo_docs` |
| **censo** | La lista de qué repositorios consumen el marco. Hoy no es una lista escrita a mano: son los pull requests de bump que Dependabot abre en cada repo consumidor. | [`censo-de-consumidores.md`](censo-de-consumidores.md), incluido su punto ciego declarado |
| **change** | Una propuesta de cambio en curso, con su carpeta propia y cuatro documentos adentro: el porqué (*proposal*), el contrato que cambia (*deltas de spec*), las decisiones técnicas (*design*) y el trabajo (*tasks*). | Una carpeta por change en `openspec/changes/`; `openspec list` dice cuáles están en vuelo |
| **ci-ok** | El nombre del veredicto agregado de CI acá y en el andamio, y el único check que la protección de `main` exige. El contrato no impone la palabra —cada proyecto fija el nombre— pero sí que sea el que reporta en todos los carriles y que conste, escrito igual, en su documentación de protección. | [`.github/proteccion-main.md`](../.github/proteccion-main.md) para este repo; [`plantilla/.github/proteccion-main.md`](../plantilla/.github/proteccion-main.md) para un proyecto |
| **CODEOWNERS** | Un archivo que dice qué rutas del repositorio pertenecen a qué rol, para que GitHub asigne solo al revisor correcto sin que nadie se acuerde de pedírselo. | [`plantilla/.github/CODEOWNERS`](../plantilla/.github/CODEOWNERS) para un proyecto; [`.github/CODEOWNERS`](../.github/CODEOWNERS) para este repo |
| **compuerta** | Un check que **bloquea**: si lo que mira está mal, el pull request no entra. Se opone a un check que solo mira y anota. | Cada compuerta vive en un job de un workflow; el inventario de qué está enforzado y qué no, en [`reglas-no-escritas.md`](reglas-no-escritas.md) |
| **constitución** | El archivo `AGENTS.md` de un repositorio: las reglas de trabajo que humanos y agentes de IA cargan antes de tocar nada. Ojo: el `AGENTS.md` de este repo gobierna **este** repo, no los proyectos. | [`AGENTS.md`](../AGENTS.md) acá; la porción que reciben los proyectos se genera desde `actions/constitucion/canonico/` |
| **cooldown** | El período que Dependabot espera antes de proponer una versión recién publicada. Útil para dependencias de terceros; para el marco está desactivado a propósito, porque esperar tres días a la propia versión costó una semana de retraso invisible. | [`plantilla/.github/dependabot.yml`](../plantilla/.github/dependabot.yml), con el motivo escrito al lado |
| **delta** | El pedazo de un change que dice qué le pasa al contrato: qué requisito se agrega (`ADDED`), cuál cambia (`MODIFIED`) y cuál se retira (`REMOVED`). Es el «diff» del spec, y existe solo mientras el change está abierto. | `openspec/changes/<nombre>/specs/<capability>/spec.md` |
| **dogfooding** | Que el marco se aplique sus propias reglas: este repo pasa por el mismo pipeline que le da a los proyectos, así que un guardrail roto se rompe primero acá. | El `ci.yml` propio del repo, en [`.github/workflows/`](../.github/workflows/) |
| **estreno** | La primera vez que un check nuevo corre contra repositorios que no son este. Regla del marco: si endurecer un check puede poner en rojo a alguien que hoy pasa, se estrena **en modo aviso** y el endurecimiento espera a la versión mayor siguiente; nadie se entera de una regla nueva por un pull request en rojo. | [`AGENTS.md`](../AGENTS.md), sección «Qué es BREAKING» |
| **fail-open** | Que algo falle **hacia el lado que no verifica**: la comprobación no se pudo hacer —falta un permiso, no responde una herramienta— y el pipeline lo lee como «todo bien». Es la clase de falla que el marco más persigue, porque no se distingue de que la función no exista. Ojo: en la detección de carriles la expresión aparece con el signo opuesto —ante la duda del detector, el pipeline corre todo— y ahí es la conducta correcta. | El caso malo: el incidente del 2026-08-05 en el [`README.md`](../README.md), y el subagente `cazador-fail-open` de `.claude/agents/`. El caso bueno, escrito como contrato en [`openspec/specs/pipeline-entrega/spec.md`](../openspec/specs/pipeline-entrega/spec.md): «la duda nunca se resuelve omitiendo verificación» |
| **guardrail** | Un check automático que impide repetir un error que ya costó caro una vez. Cada uno del marco nació de un incidente con fecha. | La tabla «Por qué existe» del [`README.md`](../README.md) los lista con su incidente de origen |
| **marcador** | Un hueco con forma de `{{DOBLE_LLAVE}}` dentro de los archivos del andamio, que se rellena con un valor del proyecto en el momento de instanciarlo. También se lo llama *placeholder*. | La tabla de valores de [`plantilla/README.md`](../plantilla/README.md), sección 2; los sustituye `herramientas/projects-init.mjs` |
| **modo aviso** | El estado de un check que corre, mira y **anota**, y que está declarado explícitamente como *no compuerta*. Se usa cuando lo que la regla promete no se puede decidir con lo que el check alcanza a leer — y avisa siempre, incluso cuando sale verde. | La tabla de estados de [`reglas-no-escritas.md`](reglas-no-escritas.md) |
| **monorepo** | Un solo repositorio con varios paquetes adentro (por ejemplo `web`, `api` y `e2e`) que se instalan y versionan juntos. | [`plantilla/pnpm-workspace.yaml`](../plantilla/pnpm-workspace.yaml) declara los paquetes del proyecto |
| **PO** | *Product Owner.* El rol dueño del *qué* y el *por qué*: aprueba la propuesta y el contrato, no la implementación. Su entrada al marco es [para-el-po.md](para-el-po.md). | Las rutas que le pertenecen están en los dos `CODEOWNERS`; el alcance del rol, en `actions/constitucion/canonico/10-openspec.md` |
| **PRD** | *Product Requirements Document.* Un documento en prosa que describe qué tiene que hacer el sistema. Es material de lectura para escribir los specs, **no es contrato**. | La fase de descubrimiento de [`arrancar-un-proyecto.md`](arrancar-un-proyecto.md) |
| **pin** | Apuntar a una versión exacta y escrita (`@v1.4.1`, `1.9.0`) en vez de a una etiqueta que se mueve sola. Es lo que hace que una versión nueva llegue como un pull request revisable y no de sorpresa. | El pin del marco lo escribe el `ci.yml` del proyecto; el del CLI de OpenSpec, el input `version_openspec` de [`.github/workflows/marco-ci.yml`](../.github/workflows/marco-ci.yml) |
| **proposal** | El documento de un change que contesta dos preguntas en prosa: por qué esto vale la pena y qué cambia. Es el que aprueba el PO. | `openspec/changes/<nombre>/proposal.md` |
| **referenciado** | Una de las cuatro formas de distribución: lo que el proyecto **llama** en vez de copiar —los workflows y actions del marco—, para que arreglarlo una vez lo arregle para todos. | La tabla «Principio de distribución» del [`README.md`](../README.md) |
| **regenerado** | Una de las cuatro formas de distribución: lo que no se guarda en ningún lado porque una herramienta lo vuelve a producir desde una versión pinada. Guardarlo sería congelar una divergencia. | La tabla «Principio de distribución» del [`README.md`](../README.md) |
| **requirement** | Dentro de un spec, una obligación redactada con **SHALL** («el repositorio SHALL incluir…»). Es la unidad de contrato: lo que se puede exigir y, cuando se puede, verificar. | Cada `spec.md` de [`openspec/specs/`](../openspec/specs/), bajo `## Requirements` |
| **reusable** | Un workflow de GitHub Actions que vive acá y que el pipeline de otro repositorio invoca con `uses:`. La mecánica se escribe una vez; los proyectos la llaman. | [`.github/workflows/marco-ci.yml`](../.github/workflows/marco-ci.yml); las piezas más chicas (*composite actions*) están catalogadas en [`actions/README.md`](../actions/README.md) |
| **ruleset** | La configuración de GitHub que protege la rama `main`: qué exige para dejar entrar un cambio y quién puede saltárselo (idealmente, nadie). | [`.github/proteccion-main.md`](../.github/proteccion-main.md) documenta el estado real, regla por regla, incluidas las diferidas |
| **scaffold** | Lo mismo que **andamio**: se copia una vez y desde ese momento es del proyecto. Es también el nombre de una de las cuatro formas de distribución. | La tabla «Principio de distribución» del [`README.md`](../README.md) |
| **scenario** | Un caso concreto escrito como `- **WHEN** ... - **THEN** ...`: en tal situación, esto tiene que pasar. Es la parte del spec que se puede leer sin ser técnico y la que decide si un requisito se cumplió. | Cada `spec.md`, bajo un requirement, con el encabezado `#### Scenario:` |
| **SHALL** | La palabra que marca una obligación dentro de un spec, y no un deseo. Si la frase la tiene, incumplirla es romper el contrato; si dice «convendría», no es contrato. | Convención de OpenSpec; su uso está en cada `spec.md` de [`openspec/specs/`](../openspec/specs/) |
| **spec** | El documento que describe el comportamiento **vigente** de una capability: lo que el sistema garantiza hoy, no lo que se propone. Para saber cómo se comporta algo se lee acá. | Un `spec.md` por capability en [`openspec/specs/`](../openspec/specs/) |
| **veredicto agregado** | El único check que la rama protegida exige, y que reporta **siempre** —haya pasado el pull request por el carril de código o por el rápido—. Existe porque exigir un check que solo reporta en un carril dejó el otro bloqueado una semana entera. | Se llama `ci-ok`; su definición está en el `ci.yml` de cada repo y su obligatoriedad en [`.github/proteccion-main.md`](../.github/proteccion-main.md) |

## Qué NO es este glosario

No es el lugar donde se decide nada. Si una fila y el archivo de la tercera
columna dicen cosas distintas, manda el archivo y esta fila está rota — vale
corregirla en el mismo pull request que abrió la diferencia.
