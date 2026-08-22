# El censo de consumidores

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
| 3 | Ve el marco, lo evalúa en su grupo, y dice **`No update needed for 1.4.1`** con la 1.4.2 publicada 30 minutos antes | **Sin explicación** | **abierto** |

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

Las dos que quedan, y no se pueden decidir desde afuera: el proxy de Dependabot sirvió una
lista de releases vieja (el job trae `proxy-cached: true` entre sus experiments), o algo en
cómo resuelve versiones para un **workflow reusable de un repo privado**.

## Cómo forzar el próximo intento, sin inventar un test

No hace falta un experimento artificial: **hay una versión que se debe cortar.** La sección
`## [No publicado]` tiene la entrada de `projects init`, que es una capacidad nueva y por
semver es un **MINOR**. Cortar **1.5.0** y dejar que corra el job programado del lunes
convierte el próximo intento en un experimento limpio:

- **Si propone `1.4.1 → 1.5.0`**: el caso 3 era un artefacto de caché o de timing, el censo
  funciona, y no hace falta nada más.
- **Si vuelve a decir «no update needed»**: el mecanismo no sirve como censo y hay que
  cambiarlo. Esa es la señal que este documento existe para poder leer.

Cualquiera de los dos resultados es información. Lo que no sirve es seguir apretando el
botón sin una versión nueva de por medio: sin bump que proponer, «no update needed» es la
respuesta correcta y no dice nada.

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
contra el marco: `docs/consumidores.md` con repo, fecha de adopción, y la versión con la que
nació. La skill `projects-adoptar` hace lo mismo para un repo existente.

- **Costo**: bajo. Un archivo y unas líneas en la herramienta.
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

No construir nada y anotarlo como deuda con su fecha. Es lo que corresponde si el 1.5.0
resulta que Dependabot funciona bien.

- **Costo**: cero.
- **Riesgo**: el marco sigue sin saber quién lo usa, y la próxima vez que aparezca un
  consumidor no anotado se va a descubrir igual que la primera: porque alguien lo buscó a
  mano.

## Recomendación

**Las dos, en este orden, y sin esperar a que Dependabot se aclare:**

1. **Cortar 1.5.0** y leer el job del lunes. Es el experimento, y la versión se debe cortar
   igual.
2. **B1 ahora** (sin credenciales, costo bajo): que la adopción escriba el registro. Cierra
   la pregunta «quién consume», que hoy no tiene ningún mecanismo, y no depende del resultado
   del experimento.
3. **B2 cuando haya decisión de credencial.** Es la única versión que se cumple sola, y es
   la que corresponde por la premisa del marco. Pero es configuración de organización y una
   credencial, así que es decisión del Builder 1 y no de un PR.

Lo que **no** conviene: dejar el censo apoyado solo en Dependabot. No porque Dependabot esté
mal, sino porque su silencio es indistinguible de «no hay consumidores», y eso es la forma
de fail-open que este marco declara inaceptable en todo lo demás.
