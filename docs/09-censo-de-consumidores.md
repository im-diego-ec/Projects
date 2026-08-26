# El censo de consumidores

**Para quién es esta página.** Para quien mantiene el marco y tiene que contestar
«quién lo está usando». **Es una página técnica** y se lee como una investigación
con su estado: qué mecanismo hay, qué se midió de él y qué falta.

**Palabras del marco que vas a ver acá**, cada una definida en una línea:
[builder](02-glosario.md), [bump](02-glosario.md), [canónico](02-glosario.md),
[censo](02-glosario.md), [cooldown](02-glosario.md), [fail-open](02-glosario.md),
[pin](02-glosario.md), [reusable](02-glosario.md).

> **Estado, al 2026-08-24.** El caso 3 —el que este documento dejó **abierto**—
> quedó **explicado y arreglado**: ver [abajo](#el-caso-3-explicado-2026-08-24). Lo
> que sigue sin mecanismo es la pregunta «quién consume el marco»: **B1 está a
> medias**. El archivo del registro existe —[`10-consumidores.md`](10-consumidores.md),
> creado el 2026-08-24— y está **vacío**, que no es lo mismo que «cero consumidores»
> y allá se dice así de frente. Lo que no existe es la mitad que escribe la fila sola:
> `grep -n consumidores herramientas/projects-init.mjs` → sin coincidencias, y la
> corrida real del init tampoco la nombra.
>
> **Por qué este recuadro existe y no debería hacer falta.** Entre que se escribió
> este archivo y hoy se publicaron tres versiones —1.5.0 y 1.6.0 el 2026-08-22,
> 1.7.0 el 2026-08-23 (`grep -nE '^## \[' CHANGELOG.md`)— y el archivo no se tocó
> ni una vez (`git log --oneline -- docs/09-censo-de-consumidores.md` → **un solo
> commit**). Un documento clasificado **Canónico** que dice «abierto» tres releases
> atrás se lee como la foto de hoy, y no lo es. La regla que se compra con este
> recuadro: **el estado va arriba y con fecha**, o la próxima vez pasa igual.

> **Qué es y por qué importa.** El marco no puede razonar sobre su propio impacto si no
> sabe quién lo consume. Sin censo no hay forma de contestar tres preguntas que se hacen
> solas cada semana: a quién le rompe un cambio breaking, quién quedó atrás de una
> corrección de seguridad, y si una regla nueva la está cumpliendo alguien.
>
> Y ya tuvo consecuencias: el 2026-08-21 apareció un consumidor que nadie tenía anotado, y
> se descubrió porque alguien lo buscó a mano.

## El diseño vigente, y su punto ciego

La idea es del Builder 1: **desde la 1.4.0, los PRs de bump de Dependabot SON el censo.** Cada
consumidor pina la versión exacta; cuando el marco publica, Dependabot abre un PR en el
repo del consumidor; ese PR es la evidencia de que ese repo existe y consume el marco.

Es elegante porque no inventa un mecanismo: usa uno que ya tiene que funcionar.

**Su punto ciego es estructural, y conviene decirlo antes que el resto:** el censo depende
del comportamiento de un tercero que el marco **no puede verificar**. Si Dependabot deja de
proponer bumps —por acceso, por configuración, por una decisión interna suya— el censo no
falla en rojo: se queda **vacío y callado**, que es exactamente el fail-open que este marco
prohíbe en todo lo demás.

## Lo medido, 2026-08-21 y 22

Tres intentos, tres causas distintas, y las dos primeras arregladas:

| # | Síntoma | Causa | Estado |
|---|---|---|---|
| 1 | Ningún PR de bump nunca | Dependabot no tenía acceso al repo privado del marco (`git_dependencies_not_reachable`) | **arreglado** (Builder 1 habilitó el acceso) |
| 2 | Alcanza el repo con `200` y no propone nada | Un único grupo `patterns: ["*"]`: con un PR del grupo abierto, Dependabot da las demás dependencias por «manejadas». El log lo dijo textual: `Adding dependencies as handled: (..., projects/...)` | **arreglado** (dos grupos, el marco en el suyo) |
| 3 | Ve el marco, lo evalúa en su grupo, y dice **`No update needed for 1.4.1`** con la 1.4.2 publicada 30 minutos antes | El `cooldown` de **tres días** que GitHub aplica **por defecto** cuando la clave no está declarada | **cerrado el 2026-08-24** — ver abajo |

El detalle del caso 3, del log del job `1536037753` (2026-08-22 04:05Z):

```
INFO Checking specificity for im-diego-ec/Projects/.github/workflows/marco-ci.yml
     in group 'marco' (applies_to: version-updates)
INFO Dependency Snapshot: ..., im-diego-ec/Projects/.github/workflows/marco-ci.yml,
     ..., im-diego-ec/Projects, ...
INFO Checking if im-diego-ec/Projects/.github/workflows/marco-ci.yml 1.4.1 needs updating
     GET https://api.github.com/repos/im-diego-ec/Projects/releases?per_page=100
INFO No update needed for im-diego-ec/Projects/.github/workflows/marco-ci.yml 1.4.1
INFO Checking if im-diego-ec/Projects 1.4.1 needs updating
INFO No update needed for im-diego-ec/Projects 1.4.1
```

Lo que eso **sí** acredita, y no es poco:

- El acceso funciona: resuelve el repo privado y consulta su API.
- La separación de grupos funciona: el grupo `actions` sale `handled` por el PR abierto de
  `upload-artifact`, y el grupo `marco` **no**.
- Dependabot resuelve la última versión de la lista de **releases**, no de los tags.

Lo que queda sin explicar: la release `v1.4.2` estaba publicada, no-draft, no-prerelease y
marcada `latest` a las 03:35:51Z — **treinta minutos antes** del job.

Hipótesis descartadas con evidencia:

| Hipótesis | Cómo se descartó |
|---|---|
| Se apretó el botón en el manifiesto equivocado | El log muestra `Updating the / directory` y las dos dependencias del marco en el Dependency Snapshot |
| Se alcanzó el límite de PRs abiertos | El ecosistema `github-actions` tiene **1** PR abierto; el default es 5 |
| El grupo lo daba por manejado | La lista de `handled` del grupo `actions` no incluye al marco |
| La release era draft o prerelease | `draft=false prerelease=false`, y es la `latest` de la API |

Las dos hipótesis que quedaban abiertas al escribir esto —el proxy sirviendo una lista de
releases vieja, o algo en cómo resuelve versiones para un **workflow reusable de un repo
privado**— resultaron las dos equivocadas. La causa era otra y está medida abajo.

## El caso 3, explicado (2026-08-24)

**No era el proxy ni el repo privado: era un `cooldown` que nadie había declarado.** Medido
el 2026-08-24 en el log de Dependabot de un consumidor, con la 1.6.0 publicada desde el 22 y
disponible:

```
Available release version/ref is 1.6.0
Found acceptable version outside cooldown: 1.4.2
Latest version is 1.4.2
```

**Propuso una versión vieja a propósito.** Cuando la clave `cooldown` no está en el
`dependabot.yml`, GitHub aplica un default de **tres días** a las actualizaciones de versión.
No estaba escrito en ningún archivo nuestro, y por eso ninguna de las hipótesis de arriba lo
podía nombrar. Sumado a la agenda semanal del lunes que había entonces, el retraso llegaba a
**nueve días**: una versión publicada de sábado a lunes no se proponía hasta el lunes
siguiente. Eso explica el caso 3 sin residuo: la 1.4.2 tenía media hora de publicada cuando
el job corrió.

Lo que se cambió, en `plantilla/.github/dependabot.yml` (el archivo manda sobre este resumen;
el detalle completo está en la entrada del `CHANGELOG.md`):

- El marco sale del filtro con `cooldown.exclude`, y esa entrada pasa a **diaria**. El
  cooldown se deja para las actions de terceros, que es donde sirve: cubre de una release
  recién publicada y comprometida.
- **Residuo declarado, no rellenado**: con una ventana uniforme de 72 horas ni la 1.4.2 (45 h
  al correr) ni la 1.6.0 (27 h) deberían haber pasado el filtro, y la 1.4.2 pasó. Algo más
  entra en el cálculo y no se pudo reconstruir del log. No cambia el arreglo — `exclude` saca
  al marco del filtro cualquiera sea la aritmética.

**Qué acredita esto sobre el censo, que es la pregunta de este documento:** el mecanismo
*funcionaba*, con un retraso de hasta nueve días que lo hacía indistinguible de estar roto.
Un censo que llega nueve días tarde y no dice que está esperando es la misma clase de
fail-open, aunque la causa no fuera la que se buscaba. La conclusión no se mueve: **este
mecanismo sirve para «quién está al día» y no sirve para «quién consume»**.

Volver a mirarlo se hace desde el repo del consumidor, y necesita red — o sea que no es
parte de ningún check:

```bash
gh run list --repo <consumidor> --workflow "Dependabot Updates" --limit 5
gh run view <id> --repo <consumidor> --log | grep -iE 'cooldown|Latest version|Available release'
```

## Lo que pasó con el experimento que este documento proponía

Decía: cortar **1.5.0** y leer el job programado del lunes. **La versión se cortó y el
resultado nunca se anotó acá.** Medido: `grep -nE '^## \[' CHANGELOG.md` devuelve 1.5.0 y
1.6.0 el 2026-08-22 y 1.7.0 el 2026-08-23; `git log --oneline -- docs/09-censo-de-consumidores.md`
devuelve un solo commit, el que creó el archivo.

La lectura llegó igual, pero por otra puerta —el log del cooldown de la sección de arriba— y
a este archivo no volvió nadie. Eso es el defecto real y vale más que el resultado: **un
experimento cuyo resultado no tiene dónde aterrizar no es un experimento**, y este documento
no nombraba a nadie ni ponía fecha de lectura. La regla que se compra: quien corta una
versión con un experimento en curso escribe el resultado **acá**, en la corrida del release,
y no en el PR que lo descubrió.

Lo que no sirve, y sigue valiendo: apretar el botón sin una versión nueva de por medio. Sin
bump que proponer, «no update needed» es la respuesta correcta y no dice nada.

## Plan B: separar las dos preguntas

El diseño actual mezcla dos preguntas distintas en un solo mecanismo, y eso es lo que lo
hace frágil:

| Pregunta | Quién la puede contestar | Falla cómo |
|---|---|---|
| **¿Quién consume el marco?** | El marco, si lo anota cuando pasa | Hoy: nadie la contesta |
| **¿Quién está al día?** | El repo del consumidor, en su propio PR | Hoy: Dependabot, y no se sabe si funciona |

La segunda pregunta está bien donde está: el PR de bump vive en el repo del consumidor, que
es donde su dueño lo ve y lo decide. **La primera no depende de Dependabot y hoy no tiene
mecanismo.**

### B1 — El registro se escribe en la adopción (sin credenciales)

Adoptar el marco es el único momento en que se sabe con certeza que un repo lo consume.
`herramientas/projects-init.mjs` ya corre exactamente ahí.

Que la herramienta **escriba la línea del registro** y le diga al builder que abra el PR
contra el marco: [`10-consumidores.md`](10-consumidores.md) con repo, fecha de adopción, y la
versión con la que nació. La skill `projects-adoptar` hace lo mismo para un repo existente.

**De las dos mitades, la del archivo ya está hecha** (2026-08-24): `10-consumidores.md` existe,
declara las tres columnas y la regla de quién escribe la fila y cuándo, y arranca **vacío**
diciendo por qué —una tabla vacía que se leyera como «cero consumidores» sería el mismo
fail-open que este documento le reprocha al diseño vigente—. Falta la mitad de la
herramienta, que es la que saca el paso de la disciplina.

- **Costo**: bajo, y ya gastado a medias. Queda una entrada en la lista de pendientes que
  el init imprime.
- **Credenciales**: ninguna.
- **Límite honesto, y hay que decirlo**: sigue siendo un paso que alguien tiene que mergear,
  o sea **disciplina**, que por la premisa de este marco no cuenta como enforcement. Lo que
  sí mejora es que el paso ocurre cuando la información existe, en vez de reconstruirse
  después. Y una omisión es visible: un repo que aparece en el registro sin PR de bump, o un
  PR de bump de un repo que no está en el registro, son dos preguntas distintas y las dos se
  pueden hacer.

### B2 — El censo se deriva, buscando en la organización (necesita credencial)

Un workflow semanal en el repo del marco que:

1. Liste los repos de la organización.
2. Busque en cada uno las referencias `uses:` al marco.
3. Escriba el censo con el pin de cada consumidor y cuánto está atrás.
4. Se ponga **rojo** si un consumidor pina `@v1` (no recibe bumps y no aparece en el censo),
   o si quedó más de N versiones atrás.

Esto contesta **las dos** preguntas, y sin depender de Dependabot. Está probado a mano: una
búsqueda de código sobre la organización devolvió los tres repos exactos el 2026-08-21.

- **Costo**: medio. Un workflow y un script.
- **Credenciales**: **acá está la decisión.** El `GITHUB_TOKEN` del CI del marco no puede
  leer otros repos. Hace falta una **GitHub App** instalada en la organización con
  `contents: read` (lo correcto, y es configuración de organización) o un **PAT** en un
  secret (más simple, y es una credencial más que administrar y rotar). Las dos exigen el OK
  explícito del Builder 1, y la primera además toca configuración de la org.
- **Ventaja de fondo**: es la única opción que **cuenta consumidores directamente** en vez
  de inferirlos de un efecto. Cuenta al repo que adoptó y nunca mergeó un bump, y al que
  pina `@v1` — los dos casos que Dependabot no puede ver por construcción.

### B3 — Dejar el censo declarado como hueco

No construir nada y anotarlo como deuda con su fecha.

- **Costo**: cero.
- **Riesgo**: el marco sigue sin saber quién lo usa, y la próxima vez que aparezca un
  consumidor no anotado se va a descubrir igual que la primera: porque alguien lo buscó a
  mano.

## Estado de las tres, al 2026-08-24

| | Estado | Medido con |
|---|---|---|
| El experimento del 1.5.0 | **corrió y no se leyó acá**; la respuesta llegó por el log del cooldown | `grep -nE '^## \[' CHANGELOG.md`, `git log --oneline -- docs/09-censo-de-consumidores.md` |
| **B1** — el registro se escribe en la adopción | **a medias**: el archivo existe y está vacío; lo que falta es lo que escribe la fila | `ls docs/10-consumidores.md` → existe (creado el 2026-08-24, sin filas); `grep -n consumidores herramientas/projects-init.mjs` → sin coincidencias, y el init corrido de verdad tampoco la nombra |
| **B2** — el censo se deriva de la organización | **no decidido**: exige credencial de organización, y eso no lo decide un PR | — |
| **B3** — declararlo hueco | **es el estado de hecho desde el 2026-08-21**, pero nunca se declaró como decisión: quedó siendo lo que pasa por omisión | este documento, hasta esta línea |

## Recomendación, con lo que falta escrito como trabajo y no como intención

1. **B1 es lo único accionable hoy y no depende de nadie.** Concretamente, y sin
   ambigüedad sobre dónde va: `herramientas/projects-init.mjs` ya imprime al final la lista
   de pendientes humanos —la lista numerada que sale después de `escritos N archivos`—, y la
   línea del registro es un pendiente más de esa lista. Cuántos bloques tiene esa lista no va
   escrito acá a propósito: crece cada vez que el arranque suma un paso humano, y ya se movió
   de seis a siete mientras este párrafo estaba escrito. Lo cuenta
   `... --sin-herramientas 2>&1 | grep -cE '^  [0-9]+\. '`.

   El archivo del registro —[`10-consumidores.md`](10-consumidores.md), con sus tres columnas—
   **ya existe y está vacío**; lo que falta es la mitad que lo escribe sola. El cambio es una
   entrada nueva en esa lista de pendientes. Se verifica corriendo el init y leyendo la
   salida:

   ```bash
   node herramientas/projects-init.mjs --ejemplo > /tmp/valores.json   # y llenarlo
   node herramientas/projects-init.mjs --valores /tmp/valores.json --destino <repo> \
     --sin-herramientas | grep -i consumidores
   ```

   Hoy ese `grep` no devuelve nada, que es exactamente la medición de que B1 no existe.
   El límite honesto sigue siendo el que ya decía este documento: es un paso que alguien
   tiene que mergear, o sea disciplina. Lo que compra es que el paso ocurre **cuando la
   información existe**, en vez de reconstruirse después.

2. **B2 sigue esperando decisión de credencial**, y por eso no entra por un PR. Es la única
   versión que se cumple sola y la que corresponde por la premisa del marco.

3. **Mientras tanto rige B3, y desde ahora está declarado y no supuesto: 2026-08-24.** La
   diferencia no es formal — un hueco declarado tiene fecha y se puede revisar; uno que
   simplemente pasa, no. **Condición de revisión escrita**: cuando exista el segundo
   consumidor. Es el mismo disparador que usa la fila 21 del
   [backlog](07-reglas-no-escritas.md), y por el mismo motivo: con un solo consumidor, los
   defectos de un mecanismo de censo se descubren en el único repo que hay.

Lo que **no** conviene: dejar el censo apoyado solo en Dependabot. No porque Dependabot esté
mal, sino porque su silencio es indistinguible de «no hay consumidores», y eso es la forma
de fail-open que este marco declara inaceptable en todo lo demás.
