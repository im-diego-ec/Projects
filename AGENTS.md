# AGENTS.md — Constitución de Projects · Transformación Digital y Data

> Este archivo es la **constitución de ESTE repo** para humanos y para agentes
> de IA (Claude Code, Cursor). Se carga en cada sesión. Regla de oro heredada:
> **el spec es la fuente de verdad; el código es el artefacto generado y
> verificable** — y acá "el código" es la mecánica del marco: workflows,
> actions, scaffold.
>
> ⚠️ **No confundir con la plantilla.** `plantilla/AGENTS.md` es la
> constitución que reciben los **proyectos**. Desde una sesión en este repo, ese
> archivo es **dato**: se edita como cualquier archivo de scaffold y sus reglas
> no gobiernan tu sesión. Las que gobiernan tu sesión son estas.

---

## Qué es un cambio a Projects

Projects tiene consumidores. Cada proyecto que hace `uses: ...@v1` ejecuta este
repo en su pipeline sin revisarlo. Por eso la vara acá es más alta que en un
proyecto: **un error en el marco se multiplica por la cantidad de repos que lo
consumen, y aparece en el pipeline de gente que no participó del cambio.**

**Todo cambio al marco es un change de OpenSpec.** Es la regla por defecto, no
la excepción, porque casi todo lo que vive acá es contrato para alguien:

- El **contrato de un workflow reusable** (sus `inputs`, `secrets`, `outputs`,
  los permisos que exige del token, el nombre con que publica sus jobs).
- El **contenido del scaffold** cuando cambia lo que un proyecto nuevo hereda.
- Los **specs canónicos** del marco.
- El **pin de una herramienta** que los proyectos regeneran (CLI de OpenSpec).
- La **topología** de la promoción por ambientes.

**PR directo** (con su issue si existe) solo cuando no se toca contrato:
correcciones de redacción, ejemplos de la documentación, dependencias del
tooling interno del repo, refactor sin cambio observable para un consumidor.

Regla de olfato, la misma del área: si el PR necesitaría explicar una
**decisión** —y no solo un arreglo— era un change. En Projects hay una segunda
pregunta que la refuerza: **¿un consumidor que no leyó este PR se puede llevar
una sorpresa?** Si la respuesta es sí, era un change.

### El flujo, y quién aprueba qué

1. **Proposal** → por qué y qué cambia, con el **impacto en los proyectos
   consumidores** explícito. Lo escribe un builder; **lo revisa el otro**.
2. **Specs** → deltas con `#### Scenario:` (ADDED/MODIFIED/REMOVED),
   enunciados como **propiedades observables** del marco. Lo escribe un
   builder; **lo revisa el otro** — salvo los de la capability de
   gobernanza del trabajo, que
   **aprueba el PO** (ver abajo).
3. **Design** → decisiones con alternativas descartadas, incluida la
   **clasificación de distribución** de cada pieza que se toca (referenciado /
   scaffold / canónico / regenerado) y la justificación de por qué esa y no
   otra. Lo escribe un builder; **lo revisa el otro**.
4. **Tasks** → bloques ejecutables con evidencia.
5. **Implementar** → un PR por bloque, **review cruzado entre builders**.
6. **Verify + archive** → cierra cuando los specs vivos validan `--strict`, las
   tareas tienen evidencia y el `CHANGELOG.md` refleja el cambio.

> ⚠️ **DESVÍO DECLARADO — `github-review-cruzado-automatizado`.** Los puntos 1, 2, 3
> y 5 piden que lo que escribe un builder lo revise el otro, y «GitHub y estilo» pide
> review cruzado en cada PR. **En este repositorio hay una sola identidad con permiso
> de escritura**, y ocupa los tres roles —PO, Builder 1 y Builder 2—: la revisión
> cruzada no está debilitada, no tiene de dónde salir. Rige desde el 2026-09-17,
> aprobado por el PO en la sesión que decidió el porte de Rigel (change
> `el-marco-declara-su-desvio-de-review`).
>
> **Lo que la reemplaza:** una **revisión adversarial con lentes independientes** —cada
> lente con su pregunta y su evidencia, y un veredicto—, registrada **dentro del
> change** en `revision-adversarial.md` antes de archivarlo. Mientras rija, el
> `aprueba:` de un artefacto que no toca `gobierno-contribucion` dice
> `revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)`.
>
> **Por qué vive acá y no en `.projects-desvios.json`:** esa ruta de la raíz es la que
> el asistente usa para el proyecto que arma cuando se lo abre con doble clic
> (`.gitignore` la ignora por eso), y el marco no renderiza su propia porción de la
> constitución: este archivo es lo único que el agente carga sin buscarlo.
>
> **Se retira** el día que haya un segundo handle con permiso de escritura
> (`gh api "repos/{owner}/{repo}/collaborators" --jq '.[] | "\(.login): \(.role_name)"'`
> hoy devuelve uno solo) y `.github/CODEOWNERS` lo nombre. Ese día este recuadro se
> borra y los `aprueba:` vuelven al builder par; mientras siga puesto con dos dueños,
> o mientras un `aprueba:` siga nombrando el desvío sin el recuadro,
> `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs` está en rojo.
>
> Lo que **no** cambia: la aprobación del PO sobre los proposals y specs que tocan
> `gobierno-contribucion`, que ningún builder —ni ninguna revisión adversarial— puede
> dar por él, y que queda escrita antes del archive (`aprobado_por_po: AAAA-MM-DD` en
> el proposal: sin esa constancia, el mismo banco no deja archivarlo); los roles siguen siendo roles (reasignarlos es editar
> `.github/CODEOWNERS`, un solo lugar); y todo cambio sigue entrando por PR con el
> veredicto agregado de CI en verde.

**Por qué acá el PO no aprueba proposals y specs, y en un proyecto sí.** En un
repo de producto esos artefactos son el QUE y el POR QUÉ del negocio, y el PO es
su dueño. En Projects no hay producto: **todo** change es técnico del estándar de
trabajo, así que heredar ese reparto convertía al PO en revisor obligatorio de
cada guardrail de ingeniería — un cuello de botella pidiéndole criterio sobre
decisiones que no son suyas.

El reparto acotado mantiene la misma línea de siempre —el PO es dueño del QUE y
el POR QUÉ, los builders del CÓMO— y acá eso se traduce en que el PO gatea la
**gobernanza del trabajo** (los roles, quién aprueba qué, cómo se revisa: la
capability `gobierno-contribucion`), porque ese es su modelo operativo; y no
gatea la **maquinaria** (pipelines, guardrails, scaffold), que es de builders.
Sigue informado de todo change y puede revisar lo que quiera: se le quita la
obligación, no el acceso.

Tras editar CUALQUIER archivo de `openspec/`: `openspec validate --strict` +
relectura de coherencia entre proposal/specs/design/tasks antes de commitear.

**Herramientas verdes no bastan para specs que cambian contrato.** Ya hubo un
change que pasó `validate --strict` y el guardrail de deltas en verde
y aun así tenía dos bloqueantes que solo cazó una revisión adversarial con
lentes independientes. Un delta `MODIFIED` debe reproducir **todos** los
escenarios vigentes del requirement o el archive los borra en silencio; el
guardrail de deltas caza eso, y también un `MODIFIED` cuyo título no existe en el
spec vigente (sale 1). Su hueco real es el simétrico: **un `ADDED` cuyo título ya
existe** en el spec vigente pasa el guardrail y `validate --strict` en verde
(medido con el CLI 1.9.0), y recién lo frena el archive. Antes de escribir un
`ADDED`, `git grep -n "^### Requirement: <título>" -- openspec/specs/`: eso sí, a
mano, siempre.

---

## Regla de oro: el guardrail sube al MARCO, no al proyecto

Cuando un incidente deja una lección accionable, esa lección **no se queda en
el repo donde ardió**. Ese es el error que Projects existe para no repetir: cada
proyecto aprendiendo por su cuenta lo mismo, tarde y caro.

- **El post-mortem ES el proposal.** El "qué pasó / impacto / causa raíz" del
  post-mortem se convierte, casi literal, en el "por qué" del change de Projects.
  No se reescribe la historia: se referencia el incidente con su fecha y su
  repo, y así el guardrail queda con su motivo pegado para siempre.
- **El guardrail tiene que fallar solo.** Un ítem de checklist, una línea en un
  documento o una promesa de un agente **no** cierran un post-mortem. La
  lección se cierra cuando existe un check que se pone rojo sin que nadie se
  acuerde. Si la lección no se puede convertir en check, el change lo declara
  explícitamente y dice qué se hace en su lugar.
- **Primero el marco, después el hotfix.** El incidente se apaga en el proyecto
  con la urgencia que haga falta; el guardrail se propone acá, en frío, dentro
  de las 48 horas del post-mortem. Un guardrail que solo protege al proyecto
  donde ocurrió el incidente es trabajo a medias.
- **Si el guardrail no se puede generalizar**, el change lo dice y lo deja en el
  proyecto — con la razón escrita. "No se pudo generalizar" es una conclusión
  válida; "no lo intentamos" no.

---

## Versionado: semver y el bump por PR

Los proyectos consumen **la versión exacta** (`@vX.Y.Z`) y reciben cada versión
nueva como **PR de Dependabot en su propio repo**. Nada del marco cambia en un
consumidor sin que exista un PR que alguien pueda leer y mergear: si una versión
trae un check nuevo, el rojo aparece **dentro de ese PR**.

> **El tag mayor móvil `v1` dejó de ser el canal el 2026-08-21, y el marco ya no lo
> invoca en ninguna línea.** Hasta la 1.3.0 era el canal:
> apuntaba al último release de la 1.x y los consumidores recibían todo sin tocar
> nada. Cambió porque el 2026-08-19 un check nuevo enrojeció un repo que el día
> anterior pasaba, y nadie lo había pedido. Y **no se pudo retirar** cuando se midió
> que el tag tenía un segundo rol sin escribir: `marco-ci.yml` referenciaba a sus propias
> actions hermanas por `@v1`. El pin exacto del consumidor era una **media
> verdad**.
>
> Pinarlas por versión exacta chocaba con el release, y el CI del 1.4.2 lo midió: el tag
> se crea **después** del merge, así que una línea que pina la versión que se está
> cortando pone en rojo al PR que la corta, y GitHub no admite expresiones en `uses:`
> para que un reusable referencie su propio ref. Lo que destrabó el nudo fue sacar cada
> invocación interna a un **job que se saltea en el repo del marco** —la última,
> `actions/guardrail-deltas`, desde la 1.8.0— y correr la misma pieza por ruta local en
> el `ci.yml` del marco. Un job salteado no resuelve nada, así que el pin exacto dejó de
> ser circular, y desde el change `guardrail-deltas-por-version-exacta` todas van por
> versión exacta. Lo cobran dos bancos, sin lista de excepciones:
> `pruebas/andamio/pinado.test.mjs` (ningún `uses:` del marco por tag móvil) y
> `pruebas/andamio/refs-propias.test.mjs` (toda referencia remota propia vive en un job
> particionado, y la partición se evalúa, no se busca como texto). **Una invocación
> interna nueva no se exime: se particiona.**
>
> **El tag sigue existiendo y no se borra**: las versiones publicadas hasta la 1.9.6 lo
> llevan adentro de su `marco-ci.yml`, y un consumidor pinado a una de ellas lo resuelve
> en cada corrida. Moverlo ya no le sirve a ninguna línea del árbol: su único efecto es
> empujar el `guardrail-deltas` nuevo, **sin PR**, a esos consumidores. Por eso el paso 5
> del release no lo mueve sin OK humano (⚠️ abajo), y si se congela del todo o se sigue
> moviendo es una decisión pendiente, que va con la apertura de la línea `v2`.

- Cada release lleva un tag inmutable `vX.Y.Z`, y **el release mueve los pines
  internos** del marco a esa versión. No depende de que nadie se acuerde:
  `pruebas/andamio/pinado.test.mjs` los compara contra el CHANGELOG.
- **MAJOR** (`v2`): un cambio de la lista cerrada de «Qué es BREAKING», abajo. Los
  consumidores migran deliberadamente, guiados por una nota de migración en `docs/`, y
  el PR de bump del major es donde cada uno decide cuándo.
- **MINOR**: capacidad nueva compatible (un `input` opcional, un workflow nuevo) **y
  también una compuerta nueva o endurecida cuyo arreglo cabe en el repositorio del
  consumidor**, aunque ponga en rojo su PR de bump. Eso no rompe a nadie: el consumidor
  pina la versión exacta, así que publicar no le mueve nada, y el rojo aparece dentro de
  un PR que él decide cuándo mergear, con el arreglo escrito en «Para consumidores».
- **PATCH**: corrección de comportamiento dentro del contrato.
- **El `CHANGELOG.md` es obligatorio en el PR que introduce el cambio**, no en
  el release. Es la única superficie por la que un consumidor se entera de qué
  se movió bajo sus pies.

### Qué es BREAKING

Un cambio es breaking si está en esta lista, y la lista es **cerrada**: lo que no está
acá no es breaking, y sumarle un caso es un change de este repo, no el criterio de
quien clasifica un PR.

1. **Quitar o renombrar un `input`, `secret` u `output` de un workflow reusable, o
   volver requerido uno que era opcional.**
2. **Cambiar un valor por defecto de forma que cambie el comportamiento.** Es el más
   traicionero para quien no lee: el consumidor sigue en verde haciendo otra cosa.
3. **Renombrar un job cuyo nombre publica un check.** Si un consumidor tiene ese
   nombre como check requerido en su ruleset, el renombrado le bloquea todos los
   PRs y el error no menciona a Projects por ningún lado. Es el breaking más caro y
   el más fácil de cometer sin darse cuenta.
4. **Exigir un permiso nuevo del token, o un runtime/herramienta de versión mayor.**
5. **Exigir algo que solo se arregla fuera del repositorio del consumidor.** Una
   compuerta nueva o endurecida cuyo arreglo es una configuración de GitHub (el
   ruleset, un ajuste de la organización), un secreto o una variable que carga quien
   administra el repo, o un acto de administrador: nada que se commitee en el PR de
   bump la pone verde. Tiene dos salidas y solo dos: se estrena en **modo aviso**
   —ruidoso, con el arreglo escrito en el `::warning::` y en «Para consumidores»— y
   se endurece en la línea mayor siguiente, o va directo a esa línea como breaking.

Las cuatro primeras son el **contrato publicado** de una pieza referenciada, y son
incompatibles aunque alguna se pueda arreglar editando el propio `ci.yml`: un contrato
que cambia sin versión mayor deja de ser un contrato. La quinta es la frontera de las
compuertas, y la decide una sola pregunta: **¿puede el consumidor volver a verde con
cambios propios dentro de su PR de bump?**

- **Si puede, NO es breaking**, aunque el PR nazca rojo en todos los consumidores: la
  compuerta sale **exigible el día que sale**, en un MINOR. A cambio, su arreglo va
  escrito en la sección «Para consumidores» del CHANGELOG **en el lenguaje de las
  páginas para quien no es técnico** (`docs/01-introduccion.md`), porque quien recibe
  el PR de bump puede no saber leer un `::error::`. La compuerta del aviso
  (`herramientas/aviso-entra-en-el-mensaje.mjs`, en el CI de este repo) pone rojo el PR
  que escribe esa sección con la jerga de oficio que esas páginas tienen prohibida. Que
  el arreglo **esté** escrito no lo verifica ninguna máquina: lo pregunta la plantilla
  de PR.
- **Si no puede, es el caso 5.**

**Un cambio de andamio no es breaking para nadie.** `plantilla/` se copia una vez y no
viaja por el PR de bump, así que no le cambia nada a un consumidor que ya existe. Se
anuncia igual en «Para consumidores», con lo que hay que copiar a mano para quien lo
quiera.

> **Esta regla cambió el 2026-09-17 (decisión D1 del PO), y el motivo importa más que
> la regla.** Hasta entonces endurecer cualquier check contaba como breaking, y la
> salida escrita era estrenarlo avisando y dejar el rojo para la línea mayor
> siguiente. Esa regla nació del incidente del 2026-08-19, cuando un check nuevo
> enrojeció a un consumidor **sin que mediara ningún PR**, porque el canal era el tag
> móvil `v1`. El 2026-08-21 el canal pasó a ser el pin exacto: desde ahí el rojo llega
> dentro de un PR que nadie está obligado a mergear, y la regla sobrevivió a su causa.
> Lo que costaba: compuertas que existían y no se le exigían a nadie, y cada compuerta
> portada desde Rigel volviendo a ser breaking.
>
> Rigel —el marco del que Projects se bifurcó— hizo el mismo cambio en su 2.0.0
> (change `linea-v2`, 2026-09-04) con una lista cerrada de cuatro casos, sin el
> quinto: no decía qué pasa cuando el arreglo no cabe en el PR. Y dos días después
> encontró su skill de release todavía con la regla vieja. Por eso acá
> `pruebas/ci-del-marco/que-es-breaking.test.mjs` exige que la plantilla de PR ofrezca
> exactamente esta lista y que ninguna superficie que dicta la regla vuelva a decir la
> vieja.

Ante la duda: **es breaking**, con la duda entendida así —¿puede el consumidor volver
a verde con cambios suyos dentro de su PR de bump, sin quedar en verde haciendo otra
cosa?—. Si no lo sabés, es breaking. Sea o no breaking, se nombra en la sección «Para
consumidores» del CHANGELOG con lo que hay que hacer, que es la superficie que el PR
de bump pone adelante.

### Antes de publicar una versión

Projects se prueba **contra un consumidor real** antes de publicar: el
change se valida en un repo que ya lo usa (apuntando al SHA o al tag exacto),
no solo en el CI de este repo. El marco se **dogfoodea**: el CI de Projects usa
los mismos workflows reusables que publica. Si un guardrail no sirve para este
repo, tampoco sirve para los demás.

---

## Los proyectos no editan el marco desde su repo

Un proyecto que necesita algo distinto tiene exactamente dos caminos:

1. **Es un parámetro que falta.** El workflow o el scaffold necesitan un
   `input`/`var` nuevo. Se propone acá; sale en un MINOR; nadie más se entera.
2. **Es un cambio de comportamiento del marco.** Se propone acá como change,
   con el impacto en los demás consumidores evaluado.

**Lo que no se hace nunca:**

- Copiar un workflow del marco al repo del proyecto para editarlo ahí. En el
  momento en que existen dos copias, la divergencia es cuestión de tiempo y la
  corrección de un incidente deja de propagarse. Si de verdad el proyecto
  necesita una mecánica propia, esa mecánica **no era marco** — y eso se
  discute acá, no se resuelve con un `Ctrl+C`.
- Hacer fork de Projects para un proyecto.
- Apuntar a un SHA "temporal" para saltarse el flujo. Se permite apuntar a un
  SHA solo para **probar** un change antes de que mueva el tag, y ese pin se
  revierte en el mismo PR que lo introdujo.

Lo que **sí** es del proyecto: su deploy con la topología de su
infraestructura, sus migraciones, sus sondas, sus specs de dominio y todo lo
que el scaffold le entregó el día uno.

---

## Revisión trimestral de divergencia

El scaffold se copia una vez y después es del proyecto. Eso es intencional —y
también es el punto por donde el marco se despega de la realidad. **Cada
trimestre**, un builder revisa:

1. **Divergencia del scaffold**: qué cambió cada proyecto respecto de
   `plantilla/`. Cada diferencia es una de tres cosas: (a) algo específico del
   proyecto, y está bien; (b) **una mejora que el proyecto descubrió** y debe
   subir al marco como change; (c) una regresión que el proyecto debería
   recuperar. Las de tipo (b) son la razón principal de esta revisión.
2. **Adopción de lo referenciado**: qué proyectos siguen con mecánica copiada
   que ya existe como workflow reusable.
3. **Pines**: si la versión del CLI de OpenSpec —u otra herramienta pinada—
   quedó atrás, y si las skills regeneradas de cada repo coinciden con el pin
   vigente (el `generatedBy` de cada `SKILL.md` lo delata).
4. **Guardrails huérfanos**: post-mortems de los proyectos del trimestre que no
   produjeron ningún change acá. Cada uno se justifica o se propone.

El resultado es un issue con hallazgos, y los que corresponda se vuelven
changes. La revisión **no** es enforcement: es el reconocimiento honesto de que
el scaffold es el único carril que no se actualiza solo. Todo lo que se pueda
sacar de acá y convertir en check automático, se saca.

---

## Fronteras de tres niveles

**✅ Siempre (hazlo sin preguntar)**
- Clasificar cada pieza nueva en una de las cuatro formas de distribución antes
  de escribirla, y dejar la justificación en el design.
- Declarar `permissions` explícitos en cada workflow, con el mínimo necesario, y
  auditar **acción por acción** los permisos de un job nuevo antes del estreno
  (lección que ya se repitió tres veces).
- Hacer ruidoso todo fail-open: si una detección falla y el pipeline sigue por
  el camino conservador, tiene que **decirlo** (`::warning::` como mínimo).
- Parametrizar con la convención única (`{{PLACEHOLDER}}` en scaffold; `vars` y
  `secrets` para runtime). Cero valores de un proyecto hardcodeados en el marco.
- Usar handles de GitHub **por rol** (`{{BUILDER_1}}`, `{{PO}}`) en el
  scaffold, nunca nombres propios.
- Actualizar el `CHANGELOG.md` en el mismo PR.
- Correr la validación local antes del push: CI es la corrida final, no el banco
  de pruebas.

**⚠️ Pregunta primero (requiere OK humano)**
- Cambiar el contrato de un workflow reusable ya publicado.
- Mover el tag `v1`, o abrir la línea `v2`.
- Subir el pin de una herramienta que los proyectos regeneran.
- Agregar una dependencia o una action de terceros al marco: entra al pipeline
  de **todos** los consumidores. Se pina por SHA, no por tag móvil ajeno.
- Cambiar la clasificación de distribución de una pieza ya publicada (mover
  algo de scaffold a referenciado cambia quién manda sobre ese archivo).

**🛑 Nunca**
- Mover `v1` sobre un cambio breaking.
- Publicar un cambio del marco que no se probó contra un consumidor real.
- Poner secrets, ARNs, cuentas, dominios o cualquier valor de un proyecto
  concreto en el marco. Los secretos se **verifican donde ya existen**; su valor
  jamás entra al contexto de un agente ni a un log.
- Agregar al marco un "guardrail" que dependa de que alguien se acuerde: si no
  falla solo, no es un guardrail (es documentación, y va a `docs/`).
- Dejar `{{PLACEHOLDER}}` sin documentar en el README.
- Editar a mano los archivos que genera el CLI de OpenSpec (skills, comandos):
  se regeneran corriendo el CLI en la versión pinada, y una edición manual se
  pierde en la regeneración siguiente sin dejar rastro.
- Copiar las skills o los comandos de un proyecto a `plantilla/` para
  distribuirlas: se **regeneran** en cada repo. Vendorarlas congela para todos
  la versión que las generó (el `generatedBy` de cada `SKILL.md` la delata).
- Escribir en el repo o en la infraestructura de un proyecto consumidor desde
  una sesión de Projects.

---

## GitHub y estilo

- **Trunk-based, una sola rama permanente: `main`.** Las ramas (`feat/*`,
  `chore/*`, `docs/*`) salen SIEMPRE de main actualizado
  (`checkout main && pull --ff-only && checkout -b`, atómico) y vuelven por PR
  obligatorio con review cruzado. Verificar los commits del PR antes de abrirlo.
- **Commits firmados.** El check requerido es el veredicto agregado de CI, no un
  job intermedio: el que reporta tanto en el carril de código como en el de
  docs.
- **`Closes #<issue>` en el body desde la creación del PR** — es lo único que
  crea el enlace real; un "ref #N" en texto plano no enlaza nada.
- **Idioma: español** en prosa, comentarios y documentación. Los keywords
  técnicos y de OpenSpec (`SHALL`, `WHEN`/`THEN`, `Scenario`, `Requirement`,
  ADDED/MODIFIED/REMOVED) van en inglés.
- **Sin acentos en los comentarios de YAML de los workflows.** La prosa de
  Markdown sí lleva acentos.
- **Sin em dashes en nombres ni descripciones de recursos AWS** (usar guiones).
  Aplica solo a valores que viajan a AWS.
- **El `CHANGELOG.md` existe acá aunque el archive de OpenSpec sea el changelog
  de un proyecto**: Projects tiene consumidores externos que necesitan saber, en un
  solo lugar y por versión, qué se movió. El archive guarda el *porqué*; el
  changelog, el *qué* por versión.
