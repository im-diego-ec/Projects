# Arrancar un proyecto desde cero

Esta guía te lleva de **no tener repo** a **`ci-ok` verde y el primer change de
OpenSpec en marcha**. Es el caso «proyecto nuevo»; si el repo **ya existe** y hay
que meterle el marco, eso es otra cosa y vive en la skill `projects-adoptar`.

**Todo lo que dice acá está medido**, corriendo los comandos, no deducido de leer
los archivos. Donde algo falla, lo dice y dice el mensaje exacto que vas a ver.

Marcas que vas a encontrar:

| Marca | Significa |
|---|---|
| **[vos]** | Lo hacés vos, ahora |
| **[otro]** | Depende de otra persona o de un OK: **arrancalo temprano**, bloquea |
| **[auto]** | Lo hace una herramienta o el pipeline |
| ⚠️ | Falla **en silencio** o con un error que apunta al lugar equivocado |

> **Lo primero que hay que entender:** `projects init` deja el repo **completo** — la
> mecánica (pipeline, reglas, guardrails) **y** la aplicación (los tres paquetes con sus
> pruebas pasando). Un solo comando, una sola fuente. Hasta el 2026-08-22 el esqueleto de
> aplicación vivía en otro repo que había que clonar aparte; ese repo se borró y su
> reemplazo es el andamio.

---

## Antes de empezar: las cuatro cosas que la guía da por sentadas

### 1. El clon del marco

Toda la guía dice `<ruta-al-clon-de-projects>`. Ese clon **no viene de ningún lado**: lo traés
vos, una vez, y te sirve para todos los proyectos.

```bash
gh repo clone im-diego-ec/Projects
```

Anotá la ruta donde quedó. Es la que vas a pegar cada vez que la guía diga
`<ruta-al-clon-de-projects>`.

### 2. Las herramientas

Cuatro comandos. Si alguno no contesta lo que dice acá, resolvelo **antes** de la fase 0:
todo lo que sigue lo usa.

```bash
node --version                      # 22 o más (el CI usa 22)
pnpm --version                      # 9.15.0 — lo fija el andamio con packageManager
gh auth status                      # autenticado. Necesitás scope admin:org (fase 3.2) y
                                    # admin del repo (fase 6)
git config --get commit.gpgsign     # tiene que decir true: el marco exige commits firmados
uv --version                        # la herramienta de descubrimiento lo exige (fase 7.1)
```

⚠️ Si `commit.gpgsign` no está en `true`, lo vas a descubrir en la fase 5, cuando el primer
commit falle — o peor, cuando entre sin firma y el ruleset la exija más adelante.

### 3. Los documentos del negocio, si ya existen

Si el PO ya hizo el trabajo de negocio —entrevistó gente, levantó los procesos, escribió
los casos raros, hizo un prototipo—, esos archivos son tu punto de partida. **No van al
repositorio**: pueden tener nombres de empleados, clientes y proveedores reales.
Tenelos a mano antes de empezar. Cómo se convierten en specs está en la **fase 7.1**.

### 4. El mapa

Ocho fases, de la 0 a la 7. Las **[otro]** arrancan primero porque bloquean el final, no
el arranque.

| Fase | Qué | Quién |
|---|---|---|
| 0 | Verificar lo que ya está hecho a nivel organización | **[vos]**, 4 comandos |
| 1 | Arrancar lo que depende de otra persona | **[otro]** |
| 2 | Juntar los 21 valores | **[vos]** |
| 3 | Crear el repo y correr `projects init` | **[vos]**, 2 comandos |
| 4 | `pnpm install` y comprobar en local | **[vos]**, 1 comando |
| 5 | El primer push, directo a `main` | **[vos]** + **[auto]** |
| 6 | Settings del repo | **[vos]**, algunos con OK |
| 7 | El primer change de OpenSpec | **[vos]** + **[otro]** |

**La fase 5 es donde el primer CI sale rojo, y es esperado.** Está explicado en 5.1; no es
que hayas hecho algo mal.

---

## Fase 0 — Verificar, no hacer · 4 comandos, 30 segundos · **[vos]**

Cuatro de los pendientes que `projects init` te va a listar **ya están hechos a nivel
de organización** y son de una-vez-en-la-vida. Verificalos y seguí: abrir esas
pantallas es media hora perdida.

```bash
gh api orgs/im-diego-ec/dependabot/repository-access --jq '.accessible_repositories[].name'
```
→ tiene que aparecer `projects`. Es lo que deja que Dependabot lea el repo **privado**
del marco. Sin esto, ningún consumidor recibe versiones nuevas.

```bash
gh api repos/im-diego-ec/Projects/actions/permissions/access
```
→ `{"access_level":"organization"}`. Es lo que deja que tu repo haga `uses:` del
marco. ⚠️ Si faltara, el síntoma es un error de **repositorio no encontrado** que
parece un typo en la ruta del `uses:` — y la ruta está bien.

```bash
gh api orgs/im-diego-ec/installations --jq '.installations[].app_slug'
```
→ tiene que estar `claude`. Es el bot que contesta en los PRs.

```bash
gh api orgs/im-diego-ec/issue-types --jq '.[].name'
```
→ los tipos de issue del área. Es una de las dos dimensiones que la constitución
exige (la otra son las labels `area:*`, fase 6).

---

## Fase 1 — Arrancar lo asíncrono PRIMERO · **[otro]**

Estas dos cosas dependen de otra persona. Si las dejás para el final, te bloquean
el final.

**1. El PO en la organización y en su equipo.**

⚠️ El equipo `po` de la organización está **vacío** (`members_count: 0`), y nada lo
avisa: GitHub simplemente no asigna a nadie cuando `CODEOWNERS` nombra un equipo sin
miembros. Sin el PO adentro **no hay quién apruebe el proposal ni los specs**, que
es el primer paso del primer change.

```bash
gh api orgs/im-diego-ec/teams/po/members --jq 'length'   # hoy: 0
```

⚠️ **El handle es `po`.** No es `dserrano` — ese es su nombre en Slack, y en
GitHub pertenece a **otra persona**. Los tres handles "obvios" (`builder-uno`,
`builder-dos`, `dserrano`) existen en GitHub y son de terceros reales. Poner uno de esos
en `CODEOWNERS` no falla: asigna a un desconocido, o a nadie, sin decir nada.

**2. El issue macro en el Project del equipo.** Los pendientes macro **no** viven en el
repo: van al Project del área, y los hijos —los sub-issues por bloque— no van al board.
Decidido el 2026-08-23; la regla es la de la constitución y no cambió.

Hoy el único project del área es *«Roadmap del área»* (project 2). Si el proyecto
nuevo entra ahí, se renombra, y eso toca a otro repo: por eso está en esta fase y no en
la última.

```bash
gh project list --owner po
```

---

## Fase 2 — Los 21 valores · **[vos]** + un dato de **[otro]**

`projects init` pide **21 valores** (el 22.º, `PAQUETES`, se deriva y no se pregunta).
Sacá el esqueleto:

```bash
cd <ruta-al-clon-de-projects>
node herramientas/projects-init.mjs --ejemplo > valores.json
```

La tabla completa de qué es cada uno está en
[`plantilla/README.md`](../plantilla/README.md), sección 2. Acá va sólo lo que
necesitás para **juntar todo antes de sentarte**:

**Los que contestás solo** — identidad y paquetes: `PROYECTO`, `ORG`,
`PAQUETE_API`, `PAQUETE_WEB`, `PAQUETE_E2E`, `GENERAR_CLIENTE_DATOS`,
`PREFIJO_RECURSOS`, `DOMINIO_DEV`, `DOMINIO_PROD`.

**Los que son un dato que hay que buscar** — no los inventes:

| Valor | De dónde sale |
|---|---|
| `CUENTA_DEV` / `CUENTA_PROD` | Los ids de AWS del área |
| `PERFIL_DEV` / `PERFIL_PROD` | Los perfiles de la CLI ya configurados |
| `BUILDER_1` / `BUILDER_2` / `PO` | Handles de GitHub **verificados** (ver el ⚠️ de la fase 1) |
| `EQUIPO_BUILDERS` / `EQUIPO_PO` | **Slugs** de equipo: `builders`, `po`. Sin `@` y sin la org |
| `CANAL_ALERTAS` | El canal de Slack del área |
| `ID_MCP_SLACK` | ⚠️ Ver abajo |

⚠️ **`ID_MCP_SLACK` no se genera ni se pide.** El ejemplo imprime un UUID de ceros,
que se lee como «generá uno» o «pedilo a alguien», y no es ninguna de las dos: es
cómo **tu cliente local** nombra al servidor MCP de Slack. Se saca de un repo que ya
funciona:

```bash
grep -o 'mcp__[0-9a-f-]\{36\}' <ruta-a-un-proyecto-anterior>/.claude/settings.json | sort -u | head -1
```

El valor va **sin** el prefijo `mcp__`. Con el valor mal, el andamio queda con cinco
entradas de allowlist que no matchean ninguna herramienta y cada lectura de Slack te
pide permiso a mano. **Ningún check lo detecta**: lo único que se verifica es que no
sobrevivan marcadores `{{...}}`, y un UUID de ceros no es un marcador.

---

## Fase 3 — El repo · **[vos]** · dos comandos

```bash
gh repo create po/<proyecto> --private --clone
cd <proyecto>
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs \
  --valores <ruta>/valores.json --destino .
```

Eso es todo. **No hay una segunda pieza que traer**: `projects init` escribe **69 archivos
con 116 sustituciones** — la mecánica **y** los tres paquetes con sus pruebas pasando.

Si el repo que querés usar **ya existía**, el primer comando falla: eso es la 3.3.

### 3.1 Qué quedó en el repo

**87 archivos.** El mensaje dice `escritos 69` y **está bien**: 69 son los del andamio, y
los otros los escriben `openspec init` (que init ya corrió, con el pin del marco `1.9.0`)
y el render de la constitución.

| Directorio | Qué hay |
|---|---|
| `api/` | Express + TS + Prisma + Clerk, con `lib/log.ts`, `middleware/errorHandler.ts`, `requestId.ts`, `asyncHandler.ts` — y **46 pruebas** |
| `web/` | React + Vite + Tailwind + Clerk, con **8 pruebas** |
| `e2e/` | Playwright, con una prueba de humo |
| `.github/`, `eslint.config.mjs`, `AGENTS.md`, … | La mecánica del marco |
| `.projects/`, `.cursor/rules/` | La porción de la constitución, renderizada al día |

**La tabla «Stack fijado» del `AGENTS.md` llega LLENA**, no con huecos, porque el andamio
implementa ese stack. Lo que hay que hacer es **borrar la fila —y su paquete— de lo que
este proyecto no vaya a tener**, no llenarla.

### 3.2 Los equipos necesitan escritura sobre el repo, y nadie lo hace solo

`projects init` escribe un `.github/CODEOWNERS` que nombra a los equipos de la organización.
**Un equipo sin permiso de escritura sobre el repo es ignorado como code owner por GitHub,
sin ningún aviso** — lo dice el comentario del propio archivo. O sea: el review cruzado
que el marco promete queda asignado a nadie, el PR se ve perfectamente normal, y no hay
rojo que lo delate.

`gh repo create` **no** le da acceso a ningún equipo, y crear el repo desde la interfaz
tampoco. Es un paso propio.

Es **cambio de configuración de repo: pedí el OK antes** (frontera ⚠️ del marco).

```bash
gh api --method PUT orgs/im-diego-ec/teams/builders/repos/im-diego-ec/<proyecto> -f permission=push
gh api --method PUT orgs/im-diego-ec/teams/po/repos/im-diego-ec/<proyecto> -f permission=push
```

Verificalo, porque es exactamente de las cosas que fallan en silencio:

```bash
gh api orgs/im-diego-ec/teams/builders/repos --jq '[.[].name]'
gh api orgs/im-diego-ec/teams/po/repos --jq '[.[].name]'
```

El repo nuevo tiene que aparecer en las **dos** listas. Y si el equipo `po` todavía está
vacío (fase 1), el gate del PO tampoco se asigna: son dos condiciones y hacen falta las
dos — el equipo con acceso, y el equipo con gente.

### 3.3 Si el repo ya existía

No es el caso normal, pero pasa: alguien crea el repo cuando se decide el proyecto,
semanas antes de que empiece. `gh repo create` contra un nombre que ya existe devuelve
**422 `name already exists on this account`** y no hace nada.

Un comando lo dice antes, y no toca nada:

```bash
gh repo view po/<proyecto> --json name,isEmpty,defaultBranchRef
```

- **`Could not resolve to a Repository`** → no existe, seguí la fase 3 tal cual.
- **Contesta** → existe. Cambiá el primer comando por `gh repo clone` y dejá el resto
  igual: `projects init` escribe sobre el checkout, no necesita un repo virgen.

Si lo que hay es un `README.md` de placeholder, dejá que el andamio lo reemplace. Lo que
**no** se hace es borrar y recrear el repo para tener un arranque limpio: se pierde la
historia y cualquier issue que lo referencie, y no compra nada que este camino no dé.

---

## Fase 4 — Un solo comando, y es el lockfile · **[vos]**

```bash
pnpm install
git add -A && git commit -m "chore: bootstrap del proyecto con el marco"
```

⚠️ **Esto no es opcional y es lo único que falta.** El andamio trae los manifiestos con
sus rangos pero **no el lockfile**: un lockfile fija versiones exactas y no convive con
marcadores. El CI corre `pnpm install --frozen-lockfile`, así que sin este paso el primer
push **muere en su cuarto paso**:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with <ROOT>/package.json
```

El lockfile entra al commit fundacional y queda versionado desde el primer día.

### 4.1 Comprobalo antes de pushear, con un comando

```bash
pnpm verificar
```

**Tiene que salir 0.** Corre, en este orden: generar el cliente de datos, `eslint .
--max-warnings=0`, `prettier --check`, el typecheck de los tres paquetes, las pruebas
**con cobertura**, y el build. Es la misma cosa que el CI, y la regla del área es correrla
**antes** de cada push — el CI es la corrida final, no el banco de pruebas.

> **Ojo con el orden, que costó una corrida descubrirlo:** el primer paso de `verificar`
> es `datos` (generar el cliente de Prisma) y está ahí por una razón. Si corrés
> `pnpm lint` a secas justo después de instalar, sin generar, te salen **8 errores de
> tipos sin resolver** apuntando a `$disconnect` — y el mensaje no dice «te falta generar
> el cliente». `verificar` lo hace en el orden correcto.

### 4.2 Lo que YA viene hecho, y que antes había que hacer a mano

Está acá para que no lo busques:

- Los **scripts que el CI invoca** (`lint`, `format:check`) y las devDependencies del
  linter y el formateador.
- Los **excluidos de cobertura del andamio** (`eslint.config.mjs`,
  `vitest.config.base.mjs`, las herramientas de agente), con su motivo escrito. Son
  archivos que el marco reparte y que ninguna prueba puede cubrir.
- El **cableado de `vitest.config.base.mjs`** en cada paquete y el proveedor de cobertura.
  Los scripts `test` ya corren `--coverage`: sin eso no se emite `lcov` y la compuerta del
  marco da rojo por «no se encontró ningún reporte».
- Los **umbrales en verde sin deuda declarada**: `api` en 100 % de líneas, `web` en 100 %
  en las cuatro métricas, contra un mínimo de 80.

---

## Fase 5 — El primer push va DIRECTO a `main` · **[vos]** + **[auto]**

Este es el paso de orden más importante de la guía, y va contra el instinto.

```bash
git add -A && git commit -m "chore: bootstrap del proyecto con el marco"
git push -u origin main
```

**No por PR.** Medido sobre el mismo árbol (93 archivos, 15 148 inserciones): entrando
**por PR** la compuerta de cobertura sale **exit 1**; entrando **por push a `main`**
sale `::notice:: NO APLICABLE` y **exit 0**. El plano del cambio mide «líneas que este
PR agrega sin pruebas», y el commit fundacional agrega el esqueleto entero.

Y hay una segunda razón que empuja al mismo lado: **el check `ci-ok` no aparece en la
lista de checks del ruleset hasta que el CI haya corrido una vez.** Así que el orden
real es:

```
push a main  →  CI corre  →  arreglar en main con más pushes directos hasta ci-ok verde
             →  RECIÉN AHÍ el ruleset  →  desde ese momento, todo por PR
```

Desde ese momento el proceso normal rige sin excepciones, y el primer PR de verdad ya
lleva un diff chico donde la compuerta de cobertura mide lo que tiene que medir.

### 5.1 Tu primer CI va a salir ROJO en un job, y es esperado

⚠️ **El job «Sin marcadores del scaffold sin resolver» falla, y está bien.** El andamio
reparte **3 recuadros 🕳️** —2 en `AGENTS.md`, 1 en `.github/proteccion-main.md`— que un
humano tiene que resolver y borrar. El marco los cuenta y los lee como bootstrap a medias:
mientras existan, ese job es rojo. **No es un defecto de tu repo ni del andamio.**

Y hay una razón por la que **no se pueden borrar todos antes del primer push**: el recuadro
de `proteccion-main.md` te manda aplicar la protección de rama, y eso **no se puede hacer
hasta que el CI haya corrido una vez** — el check `ci-ok` no existe en la lista del ruleset
hasta que alguna corrida lo haya reportado. El primer rojo es estructural.

**La secuencia que lo apaga:**

1. **Push a `main`** → el CI corre. Rojo en «Sin marcadores», verde en el resto.
2. **Aplicá la protección** (fase 6.1, las 4 reglas). Ahora `ci-ok` existe en el ruleset.
3. **Resolvé y borrá los 3 recuadros**, que es trabajo real:
   - `AGENTS.md`, «Antes del primer commit»: revisá la tabla del stack y **borrá la fila**
     de lo que este proyecto no vaya a tener.
   - `AGENTS.md`, «reglas de este repo»: escribí las propias, o borrá el recuadro si
     todavía no hay ninguna.
   - `.github/proteccion-main.md`: pasá los 🔴 a 🟢 con la fecha, y escribí el motivo de
     las diferidas.
4. **Push de nuevo** → verde.

Antes del segundo push, comprobá que no quedó ninguno. Sin salida es lo que buscás:

```bash
grep -rn "🕳" --include="*.md" .
```

---

## Fase 6 — Settings del repo · **[vos]**, y algunos exigen OK

### 6.1 La protección de `main`

Está en [`.github/proteccion-main.md`](../plantilla/.github/proteccion-main.md) del
propio repo nuevo. ⚠️ **No apliques las 8 reglas.** Encendé las **4 probadas** y dejá
las otras diferidas con su motivo escrito: aprobación requerida + review de code
owner + bypass vacía, con un equipo de una persona, **deja el repo sin ninguna vía de
integrar**. El documento ya viene con esa separación hecha.

### 6.2 Las seis labels `area:*`

⚠️ No se heredan de ningún molde — ni el repo del marco las tiene. Un repo nuevo nace
sin ninguna, y la constitución las exige.

```bash
gh label create "area:backend"   --color 0052CC --description "Area: backend"
gh label create "area:ci-cd"     --color 006B75 --description "Area: ci-cd"
gh label create "area:datos"     --color FBCA04 --description "Area: datos"
gh label create "area:frontend"  --color 1D76DB --description "Area: frontend"
gh label create "area:infra"     --color 5319E7 --description "Area: infra"
gh label create "area:seguridad" --color B60205 --description "Area: seguridad"
```

### 6.3 Dependabot, en ESTE repo

⚠️ No se enciende solo: la configuración de code security de la organización tiene
`default_for_new_repos: null`. Settings → Advanced Security → **Dependency graph** y
**Dependabot security updates**.

```bash
gh api repos/im-diego-ec/<proyecto> \
  --jq '.security_and_analysis.dependabot_security_updates.status'   # enabled
```

Por qué importa: el andamio pina el marco por **versión exacta**, y el único
mecanismo que trae versiones nuevas es el PR de Dependabot. Sin esto, el repo no
recibe bumps y **no aparece en el censo de consumidores** del marco.

### 6.4 Los secrets: son dos, y ninguno gatea el pipeline

- `CLAUDE_CODE_OAUTH_TOKEN` — para que el bot conteste. `claude setup-token` y
  `gh secret set`. Si falta, `claude.yml` sale rojo y nada más se rompe. Puede
  esperar.
- `TOKEN_ACTUALIZAR_MARCO` — **opcional**, y el un consumidor nunca lo
  puso. Sin él el PR semanal de actualización nace sin checks; el propio workflow lo
  avisa y explica el rodeo.

**Variables (`vars`): ninguna.** El un consumidor tiene cero.

⚠️ **`actualizar-marco.yml` nunca corrió en ningún repo de la organización.** El repo
nuevo va a ser el primer lugar donde se ejecute, y su cron cae el lunes siguiente al
arranque. No es un problema, pero conviene saberlo: si algo raro aparece un lunes al
mediodía, es eso.

---

## Fase 7 — El primer change de OpenSpec · **[vos]** + **[otro]**

El repo ya está verde. Lo que sigue es el trabajo.

`openspec/specs` y `openspec/changes` nacen **vacíos**, y ⚠️ **git no versiona
directorios vacíos**: quien clone el repo no los va a tener hasta que exista el
primer change. `validate --all --strict` sobre el árbol recién instanciado sale
verde, pero es un verde **vacuo** — no hay nada que validar.

⚠️ **El momento peligroso:** `openspec new change` deja el CI **rojo** hasta que el
change tenga su delta. Así que el change se crea y se completa en la misma sesión, o
se trabaja en una rama sin PR abierto todavía.

Los seis pasos y quién aprueba cada uno están en
[`AGENTS.md`](../AGENTS.md): proposal y specs los aprueba el **PO**; design y tasks
los revisa **el otro builder**. Los **12 comandos `/opsx:*`** y las 12 skills
`openspec-*` cubren el ciclo: los deja `openspec init`, que `projects init` corre en su último
paso — si ese paso falló, no están, y hay que correrlo a mano.

### 7.1 De los documentos del negocio a los specs, paso por paso

Esta sección es para el caso más común: **el PO ya hizo el trabajo de negocio** —entrevistó
gente, levantó los procesos, escribió los casos raros, hizo un prototipo— y hay que
convertir eso en specs de OpenSpec.

Antes de los pasos, tres palabras que se usan abajo:

| Palabra | Qué es |
|---|---|
| **BMAD** | La herramienta de descubrimiento. Se instala dentro de Claude Code como un montón de *skills*: le hablás y te va escribiendo documentos. Nadie del equipo la usó todavía |
| **PRD** | *Product Requirements Document.* Un documento en prosa que dice qué tiene que hacer el sistema. **Lo escribe BMAD** leyendo los documentos del PO. **No es un spec y no es contrato**: es material de lectura |
| **Delta** | El archivo de OpenSpec que dice qué cambia en los specs vivos. **Esto sí es el contrato**, y lo aprueba el PO |

Y la advertencia que evita la confusión más cara:

> **BMAD no genera specs de OpenSpec, y no hay ningún comando que convierta lo uno en lo
> otro.** BMAD llega hasta el PRD. De ahí en adelante los specs los escribe una sesión de
> agente **dentro del repo**, leyendo el PRD. Ese paso es trabajo, y es así a propósito: el
> contrato lo firma una persona.

#### El camino completo

```
documentos     ──►  BMAD   ──►  PRD  ──►  lista de   ──►  sesión en   ──►  proposal
  del PO           (1-4)       (4-5)      cobertura       el repo          + deltas
                                            (6)             (7)             (7-8)
 ──────────── un directorio aparte ────────────    ─────── dentro del repo ───────
```

---

#### 1 · Un directorio aparte, fuera del repo

```bash
mkdir ~/descubrimiento-<proyecto>
cd ~/descubrimiento-<proyecto>
git init
```

⚠️ **Fuera del repo, y no es prolijidad: está medido que el CI se pone rojo.** Si instalás
BMAD dentro del repo del proyecto, dos de sus archivos traen marcadores entre dobles llaves
y el check «Sin marcadores del scaffold sin resolver» da **rojo** para siempre, sobre
archivos que nadie escribió ni puede arreglar. Y en Windows `git add` falla con
`Filename too long` en los `__pycache__` de la herramienta.

El `git init` de acá **no** es para versionar nada del proyecto: es para poder volver atrás
si BMAD sobrescribe algo (ver el paso 5).

#### 2 · Instalar BMAD ahí

```bash
npx --yes bmad-method@6.11.0 install --yes --modules bmm --tools claude-code --directory .
```

Versión exacta, nunca el nombre pelado: es la regla del marco para todo comando que
descarga. Ensayado el 2026-08-20: **termina bien**, escribe unas 49 skills y ~2,9 MB.
Necesita `uv` (lo verificaste en «Antes de empezar»).

#### 3 · Poner los documentos del PO, numerados

Copialos a un subdirectorio y **numeralos al copiarlos**. La letra dice de qué tipo es cada
pieza; el número es el orden en que el PO te los entregó:

```
documentos/
  D01-procesos-recepcion.md        D = documento
  D02-casos-borde-recepcion.md
  P01-prototipo/                   P = prototipo
  F01-feedback-usuario.md          F = feedback sobre el prototipo
```

**Para qué sirven los números, que si no se dice parecen burocracia:** son la única forma de
escribir «esto salió de acá» en el repo **sin copiar el documento al repo**. Los documentos
no entran nunca —pueden tener nombres de empleados, clientes y proveedores reales—, así que
lo que viaja es el código. `D01-3.2` se lee «el punto 3.2 del documento D01», y el `3.2` lo
trae el documento: no lo inventás vos.

Y son lo que permite **contar** al final: si un número no aparece en ningún lado, eso es
algo que el PO dijo y se perdió en el camino.

#### 4 · Pedirle a BMAD el PRD

⚠️ **BMAD tiene una fase 1 (Analysis) y no la vas a usar.** Sirve para *elicitar*, o sea
para sacarle la información a alguien preguntándole, y ese trabajo ya está hecho. El
proveedor la marca «Optional» y dice textual:

> *«Neither skill requires the other — start with `bmad-prd` directly if you already know
> what you're building.»*

**`bmad-prd` es una skill de Claude Code, no un comando de terminal.** Se invoca por su
nombre, dentro de una sesión abierta en el directorio de arriba: *«usá `bmad-prd` para armar
el PRD»*.

Lo que va a pasar, en orden:

| | Qué hace | Qué hacés vos |
|---|---|---|
| 1 | Arranca sola: resuelve su configuración, lee el nombre y el idioma y te saluda | Nada |
| 2 | Detecta la intención: **Create** si no hay PRD, **Update** si ya hay, **Validate** si solo querés crítica | Nada. Si queda ambigua, pregunta |
| 3 | **Brain dump.** Es su primer movimiento y el que importa: te pide que cuentes con tus palabras qué están construyendo, y que le pases los documentos | Le pasás **rutas de archivo** o el texto pegado. No hace falta ningún formato particular |
| 4 | Dispara búsquedas web por su cuenta para mapear el mercado; te llega solo un resumen | Nada |
| 5 | **Stakes calibration** y **Working mode** | Contestás. El diseño busca llegar acá en 2 o 3 idas y vueltas, no diez |
| 6 | El trabajo del modo elegido, y escribe la salida | Leés |

Deja `prd.md`, `addendum.md` y `.memlog.md` (este último es su bitácora de decisiones, no el
PRD). **Los tres se quedan afuera del repo.**

En el paso 3 le decís algo así:

```
Los documentos de entrada son documentos/D01-procesos-recepcion.md y
documentos/D02-casos-borde-recepcion.md. No hay documento previo de BMAD:
el trabajo de negocio ya está hecho y estos archivos son la fuente.
Lo que hay que especificar ahora es solo esto: recepción de mercadería,
desde que llega el camión hasta que se concilia con la orden de compra.
Corta antes del pago al proveedor.
```

🛑 **Si BMAD no entiende tus documentos, no le toques el prompt de una skill.** En el momento
en que editás una skill dejás de usar una herramienta y empezás a mantener un fork ajeno. Si
no los digiere, **eso es el resultado** — se anota y se sigue a mano.

#### 5 · Pulir el PRD hasta que quede

**Se invoca la misma skill otra vez.** No hay una skill aparte para editar: `bmad-prd`
detecta que ya existe un `prd.md`, entra en modo **Update**, y hace un paso de **Reconcile**
— compara el PRD con lo que le decís y **muestra los conflictos antes de aplicar nada**.

Si lo que querés es que lo critique **sin tocarlo**, existe el modo **Validate**: corre un
checklist de calidad y devuelve un reporte aparte, sin modificar el `prd.md`.

⚠️ **No hay deshacer.** Está buscado y no existe: `.memlog.md` es bitácora de decisiones, no
historial de versiones, y la skill no menciona backup ni git en ninguna parte. Por eso el
`git init` del paso 1:

```bash
git add -A && git commit -m "prd antes de pedir cambios"
```

Hacelo **antes de cada pedido grande**. Es la única vuelta atrás que vas a tener.

#### 6 · La lista de cobertura, **antes** de escribir el proposal

Esto es lo que en los documentos del piloto se llama «tabla de trazabilidad», y se entiende
mejor por lo que hace: **es la lista de todo lo que dicen los documentos del PO, para poder
verificar después que nada se perdió.**

Se arma en **dos momentos**, y por eso confunde si se cuenta como uno.

**Momento 1, acá, antes del proposal.** Numerás las afirmaciones que sacaste de los
documentos. Es trabajo mecánico y le sale bien a un agente: *«leé los documentos y hacé la
lista numerada de todo lo que afirman, con el punto exacto de dónde sale cada cosa»*.

| | de dónde | qué dice |
|---|---|---|
| `I017` | lo dice `D01-3.2` | no se recibe mercadería sin orden firmada |
| `I023` | lo dice `D01-5.1` | el pago al proveedor lo hace contabilidad |
| `I044` | **lo deduje yo** | el documento no dice qué pasa si la orden llega después |

**Hacer esta lista primero cambia el resultado**, y es la razón de ponerla acá y no después:
el proposal se escribe **contra una lista**, no contra la impresión que te dejó leer el PRD.

**Momento 2**, en el paso 8: cada renglón recibe su destino.

**Y una cosa que hay que saber: esto no es un artefacto de OpenSpec.** Ningún comando la
valida, `validate --strict` no la mira, no existe un check que la revise. Es una convención
del área. Lo único que sí es regla del marco es la consecuencia: **una pregunta abierta
impide archivar el change.**

#### 7 · La sesión en el repo del proyecto

Acá cruzás del directorio de afuera al repo. Abrís una sesión de agente **en la carpeta del
repo**, y eso importa: la sesión carga sola toda la constitución, porque el andamio dejó la
cadena armada.

```
CLAUDE.md  ──importa──►  AGENTS.md  ──importa──►  .projects/AGENTS-marco.md
                         (lo del proyecto)         (las reglas del área)
```

Más `.claude/settings.json`, y los **12 comandos `/opsx:*`** y las 12 skills `openspec-*` que
dejó `openspec init` (lo corre `projects init` en su último paso; si ese paso falló, no están y
hay que correrlo a mano).

Lo que le pasás a la sesión son **dos cosas, no una**:

1. el **PRD** ya revisado, y
2. los **documentos originales** del PO.

**El PRD solo no alcanza.** Si es lo único que entra, la sesión puede citar el PRD pero no de
qué documento del PO salió cada cosa, y la lista de cobertura queda apuntando al
intermediario en vez de a la fuente.

Y le pedís **el proposal y los deltas, nada más**:

```
/opsx:propose
```

⚠️ **No le pidas los cuatro artefactos de una.** En un proyecto el PO aprueba **proposal y
specs**, y `CODEOWNERS` los gatea (`/openspec/changes/**/proposal.md` y
`/openspec/changes/**/specs/`). Si `design.md` y `tasks.md` llegan en el mismo PR, el PO
aprueba un proposal cuyo diseño ya está escrito: su aprobación pasa a ser un trámite.
Proposal + deltas → gate del PO → recién ahí design y tasks.

⚠️ **`openspec new change` deja el CI rojo hasta que el change tenga su delta.** Se crea y se
completa en la misma sesión, o se trabaja en una rama sin PR abierto todavía.

#### 8 · Cerrar la lista de cobertura, y con eso el PR

Cada renglón de la lista del paso 6 recibe ahora su destino. Tres formas y ninguna más:

| Forma | Cuándo |
|---|---|
| el título del escenario | terminó en el contrato |
| `fuera de alcance: <razón>` | es real y lo dejaste afuera a propósito |
| `pregunta abierta: <la pregunta>` | el documento no lo resolvía |

**Un renglón sin destino es algo que se perdió**, y eso es exactamente lo que la lista existe
para encontrar. Por eso está prohibido `n/a`: colapsa «lo dejé afuera a propósito» con «se me
pasó», que son cosas distintas.

Dos reglas más, y las dos son sobre honestidad y no sobre formato:

1. **Lo que deduciste vos no puede quedar escrito como si el documento lo dijera.** O queda
   como pregunta abierta, o el escenario lleva la marca de supuesto. Escribirlo como dicho
   deja una invención indistinguible de un requerimiento real.
2. **Si algo no estaba en los documentos y el PO te lo contestó en la sesión**, anotalo igual
   y marcá que salió de una pregunta, con la pregunta escrita.

El archivo va en el repo, al lado de los deltas, y viaja en el mismo PR: cuando el delta
cambia, la lista cambia con él. Su dueño es quien escribe el delta — una lista que llena un
tercero después es una reconstrucción. Y su lector es el PO en el review: es lo que le
permite revisar **por contenido** en vez de por confianza.

Y lo que la lista **no** compra, dicho para que nadie se confíe: garantiza que cada escenario
tenga **procedencia**, no que la procedencia sea **buena**. Un documento puede contener una
mala idea, y la lista la va a rastrear con toda fidelidad hasta su origen.

---

#### Lo primero que hacés, y lleva media hora

**No está medido que BMAD sepa leer documentos como los del PO.** La documentación del
proveedor dice que lee un documento con **su** formato; que digiera procesos levantados,
listas de casos raros y un prototipo, no lo probó nadie.

Así que la primera media hora es exactamente esa prueba: **un documento solo**, antes de
abrirle todo. Si no lo entiende, ya sabés a qué te enfrentás y lo anotás. Lo que no se puede
es descubrirlo a media tarde y llamarlo «un problema de instalación».

#### Qué NO tocar de BMAD

BMAD hace mucho más que el PRD, y casi todo lo demás compite con algo que el marco ya tiene
resuelto y con gates que fallan solos.

| No tocar | Por qué |
|---|---|
| `bmad-architecture`, `bmad-create-epics-and-stories`, `bmad-sprint-planning` | Duplicaría las decisiones técnicas entre su `architecture.md` y el `design.md` y los ADRs del marco |
| `bmad-build`, `bmad-build-auto`, `bmad-code-review`, `bmad-qa-generate-e2e-tests`, `bmad-retrospective` | Compite con gates que ya funcionan solos: review cruzado por CODEOWNERS, PR por bloque, CI |
| El «flujo rápido» que produce un `tech-spec-<slug>.md` | Crearía un tercer carril al lado de «change de OpenSpec o PR directo», que es justo la ambigüedad que esa regla existe para cerrar |
| `bmad-product-brief` y la fase Analysis | Es para elicitar, y el trabajo ya está hecho |
| Los agentes de persona (`bmad-agent-architect`, `bmad-agent-dev`) | Son de las fases que no se adoptan |

#### Lo que de esto NO está verificado

Se dice en vez de rellenarse, porque un hueco declarado se resuelve en dos minutos el lunes
y una invención plausible cuesta la tarde:

- Si además de invocar la skill por nombre existe un comando `/bmad-prd`.
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

## Los fallos silenciosos, en una tabla

Si algo no cierra, buscá acá primero. Todos están medidos y todos **pasan en verde**
o apuntan al lugar equivocado.

| Qué | Síntoma | Dónde |
|---|---|---|
| `ID_MCP_SLACK` mal | Cinco entradas de allowlist que no matchean nada; permisos a mano para siempre | Fase 2 |
| `pnpm lint` sin generar el cliente de datos | 8 errores de tipos apuntando a `$disconnect`, no a «falta generar». `pnpm verificar` lo hace en orden | Fase 4.1 |
| Equipo `po` vacío | GitHub no asigna a nadie. El gate del PO no existe y nada lo dice | Fase 1 |
| **Equipos sin escritura sobre el repo** | GitHub **ignora** al code owner sin avisar: el review cruzado queda asignado a nadie y el PR se ve normal. `gh repo create` no da acceso a ningún equipo | Fase 3.2 |
| **El repo destino ya existía** | `gh repo create` devuelve 422 `name already exists` y corta el primer comando ejecutable de la guía | Fase 3.3 |
| Handle de GitHub equivocado | Asigna a un tercero real, o a nadie | Fase 1 |
| `@v1` en vez de versión exacta | No falla: el repo simplemente **no recibe versiones nuevas** ni aparece en el censo | Fase 6.3 |
| Dependabot apagado | Igual que arriba, y no hay aviso | Fase 6.3 |
| Labels `area:*` ausentes | La constitución las exige y nadie las crea | Fase 6.2 |
| Los 3 recuadros 🕳️ del andamio | El primer CI sale **rojo** en «Sin marcadores del scaffold sin resolver», y uno de los tres no se puede borrar antes de que el CI corra | Fase 5.1 |
| Primer PR con el bootstrap adentro | Rojo en cobertura: el diff agrega el esqueleto entero | Fase 5 |
| **BMAD instalado DENTRO del repo** | El check de marcadores del scaffold da **rojo** por 2 archivos de BMAD, y `git add` falla con `Filename too long` en sus `__pycache__`. Se instala en un directorio aparte | Fase 7.1 |
| **Entrar por la fase 1 de BMAD** | Sirve para sacarle información a alguien preguntándole, y el trabajo ya está hecho. Se entra por `bmad-prd`, que pide los documentos por nombre | Fase 7.1 |
| **Esperar que BMAD genere los specs de OpenSpec** | No los genera, y no hay comando que convierta el PRD en deltas. El paso 7 es a mano, y es así a propósito | Fase 7.1 |
| **Pedirle a BMAD un cambio sin commitear antes** | No hay deshacer: `.memlog.md` es bitácora de decisiones, no historial de versiones, y la skill no menciona backup | Fase 7.1, paso 5 |
| **Pasarle a la sesión el PRD y no los documentos** | Puede citar el PRD pero no la fuente: la lista de cobertura queda apuntando al intermediario | Fase 7.1, paso 7 |
| **Pedir los cuatro artefactos de OpenSpec de una** | El PO gatea proposal y specs; si el design ya está escrito, su aprobación es un trámite | Fase 7.1, paso 7 |
| **Editar el prompt de una skill de BMAD** | Dejás de usar una herramienta y empezás a mantener un fork ajeno. Si no entiende los documentos, ESO es el resultado: se anota y se sigue a mano | Fase 7.1 |

---

## Cómo evoluciona este documento

**Canónico.** Se actualiza cuando alguien arranca un proyecto y encuentra algo que
acá no está — que es exactamente para lo que sirve el primer ensayo. Si un paso te
trabó, la corrección va en el mismo PR que la arregla.

**Y para que ese ensayo deje evidencia y no una anécdota**: llená el
[registro de fricción](plantillas/registro-de-friccion.md) *mientras* corrés esta
guía, no después. Se guarda en `docs/adopciones/AAAA-MM-DD-<proyecto>.md`.

Sus dos reglas de uso, acá también porque son las que se rompen: **no arregles la
guía mientras la corrés** —arreglar sobre la marcha te deja un documento que
funciona para vos y para nadie más, y borra el dato que vinimos a buscar— y **un
tropiezo cuyo arreglo empieza con «hay que recordar que…» no va a la guía**: va como
fila al backlog de [reglas no escritas](reglas-no-escritas.md#backlog-de-automatización).
