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

Hoy el único project del área es *«la organización Parking — Roadmap»* (project 2). Si el proyecto
nuevo entra ahí, se renombra, y eso toca a parqueadero: por eso está en esta fase y no en
la última.

```bash
gh project list --owner im-diego-ec
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
grep -o 'mcp__[0-9a-f-]\{36\}' <ruta-a-proyecto-origen>/.claude/settings.json | sort -u | head -1
```

El valor va **sin** el prefijo `mcp__`. Con el valor mal, el andamio queda con cinco
entradas de allowlist que no matchean ninguna herramienta y cada lectura de Slack te
pide permiso a mano. **Ningún check lo detecta**: lo único que se verifica es que no
sobrevivan marcadores `{{...}}`, y un UUID de ceros no es un marcador.

---

## Fase 3 — El repo · **[vos]** · dos comandos

```bash
gh repo create im-diego-ec/<proyecto> --private --clone
cd <proyecto>
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs \
  --valores <ruta>/valores.json --destino .
```

Eso es todo. **No hay una segunda pieza que traer.**

Hasta el 2026-08-22 acá había una fase entera: el andamio traía la mecánica y no la
aplicación, así que había que clonar un segundo repo (`projects-starter`), extraer de
él una lista exacta para no arrastrar la infraestructura de otro proyecto, y resolver
cuatro archivos en colisión. Ese repo **se borró**, y su reemplazo es el andamio: hoy
`projects init` escribe **69 archivos con 116 sustituciones** — la mecánica **y** los tres
paquetes con sus pruebas pasando.

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
- `TOKEN_ACTUALIZAR_MARCO` — **opcional**, y el consumidor de referencia nunca lo
  puso. Sin él el PR semanal de actualización nace sin checks; el propio workflow lo
  avisa y explica el rodeo.

**Variables (`vars`): ninguna.** El consumidor de referencia tiene cero.

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
los revisa **el otro builder**. Los comandos `/opsx:*` que el andamio dejó en
`.claude/commands/` cubren el ciclo.

---

## Los fallos silenciosos, en una tabla

Si algo no cierra, buscá acá primero. Todos están medidos y todos **pasan en verde**
o apuntan al lugar equivocado.

| Qué | Síntoma | Dónde |
|---|---|---|
| `ID_MCP_SLACK` mal | Cinco entradas de allowlist que no matchean nada; permisos a mano para siempre | Fase 2 |
| `pnpm lint` sin generar el cliente de datos | 8 errores de tipos apuntando a `$disconnect`, no a «falta generar». `pnpm verificar` lo hace en orden | Fase 4.1 |
| Equipo `po` vacío | GitHub no asigna a nadie. El gate del PO no existe y nada lo dice | Fase 1 |
| Handle de GitHub equivocado | Asigna a un tercero real, o a nadie | Fase 1 |
| `@v1` en vez de versión exacta | No falla: el repo simplemente **no recibe versiones nuevas** ni aparece en el censo | Fase 6.3 |
| Dependabot apagado | Igual que arriba, y no hay aviso | Fase 6.3 |
| Labels `area:*` ausentes | La constitución las exige y nadie las crea | Fase 6.2 |
| Los 3 recuadros 🕳️ del andamio | El primer CI sale **rojo** en «Sin marcadores del scaffold sin resolver», y uno de los tres no se puede borrar antes de que el CI corra | Fase 5.1 |
| Primer PR con el bootstrap adentro | Rojo en cobertura: el diff agrega el esqueleto entero | Fase 5 |

---

## Cómo evoluciona este documento

**Canónico.** Se actualiza cuando alguien arranca un proyecto y encuentra algo que
acá no está — que es exactamente para lo que sirve el primer ensayo. Si un paso te
trabó, la corrección va en el mismo PR que la arregla.
