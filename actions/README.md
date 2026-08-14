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

Un bloque `permissions:` **reemplaza** los permisos por defecto del token: hay
que listar `contents: read` explícitamente, no se hereda.

`actions: read` no aparece acá porque ninguna de estas dos actions lista runs ni
jobs. Un job que sí lo haga (por ejemplo, reutilizar una verificación previa
buscándola entre los runs anteriores) lo necesita, y sin él el 403 vuelve a
degradar en silencio.

## Requisitos del runner

`bash`, `git` y `gh` — los tres vienen en los runners hospedados por GitHub. En
un runner propio hay que garantizarlos.
