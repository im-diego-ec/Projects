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

> **Lo primero que hay que entender, porque decide el orden de todo lo demás:** el
> marco trae la **mecánica** (pipeline, reglas, guardrails) y **no trae la
> aplicación**. `projects init` escribe 49 archivos y **ni uno** es código de producto:
> no hay `package.json`, no hay `pnpm-lock.yaml`, no hay `api/` ni `web/`. El
> esqueleto de aplicación es otro repo, `projects-starter`. Son **dos piezas**, y
> el orden entre ellas importa (fase 3).

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

**2. El board donde van los issues macro.** Hoy el único project del área es
*«Roadmap del área»* (project 2), que es de otro repo. Decidí si el proyecto
nuevo entra ahí (y se renombra, lo que toca a otro repo) o si se crea uno propio.
Es una decisión, no un comando.

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

## Fase 3 — El repo y las dos piezas, en este orden · **[vos]**

```bash
gh repo create po/<proyecto> --private --clone
cd <proyecto>
```

### 3.1 Primero el esqueleto de aplicación

```bash
git clone --depth 1 git@github.com:im-diego-ec/projects-starter.git /tmp/starter
(cd /tmp/starter && git archive HEAD) | tar -x -C .
git add -A && git commit -m "chore: esqueleto de aplicacion desde projects-starter"
```

**Commiteá antes de seguir.** Ese commit es lo que convierte un pisado silencioso en
cuatro líneas de `git status` (ver 3.3).

### 3.2 Borrá tres cosas del starter, antes de cualquier otra cosa

```bash
rm -rf infra/ spec/ .github/workflows/deploy.yml
```

- ⚠️ **`infra/` no es un molde: es la infraestructura de otro repo con los nombres
  puestos.** `variables.tf` trae `default = "la organización-otro repo"`, `main.tf` crea el
  bucket `${var.project}-web`, el rol OIDC apunta a otro repo, no declara backend
  remoto de tfstate, y declara `db_password` — que contradice la regla del área (IAM
  auth, sin password). Y como los dos proyectos viven en la **misma cuenta dev**, un
  `terraform plan` desde ahí razona sobre recursos de otro proyecto. La infra del
  proyecto nuevo se escribe cuando toque, con su propio backend y su prefijo.
- **`spec/`** es la convención vieja. Hoy la fuente de verdad es `openspec/`, que
  `projects init` deja armado.
- **`deploy.yml`** del starter no es el del área.

### 3.3 Después el andamio del marco

```bash
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs \
  --valores <ruta>/valores.json --destino .
```

**Este orden es el correcto, y no por simetría.** Hay exactamente **4 archivos** que
existen en las dos piezas: `.github/workflows/ci.yml`, `.gitignore`, `AGENTS.md`,
`tsconfig.base.json`. En este orden, `projects init` **aborta con exit 1 y te los
lista**:

```
::error::el destino ya tiene 4 archivo(s) del andamio. Se aborta para no sobreescribir trabajo:
  - .github/workflows/ci.yml
  - .gitignore
  - AGENTS.md
  - tsconfig.base.json
Si de verdad queres sobreescribirlos: --forzar
```

Acá pisar es lo que querés: el andamio gana y lo que se pierde es barato (un
`ci.yml` stub de 18 líneas, un `AGENTS.md` genérico, un `.gitignore` subconjunto, y
un `tsconfig.base.json` cuyos `compilerOptions` son los mismos). Así que:

```bash
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs \
  --valores <ruta>/valores.json --destino . --forzar
```

⚠️ **El orden inverso pisa en silencio.** Si corrés `init` primero y traés el starter
encima con `cp -r` o `tar`, se sobreescriben los mismos 4 archivos con **exit 0 y sin
una sola línea de aviso**: `ci.yml` pasa de **399 a 18 líneas** y `AGENTS.md` deja de
encadenar con `.projects/AGENTS-marco.md`. O sea: perdés el pipeline entero y la mitad
de las reglas que tus agentes leen, y la sesión no te lo dice. El guard que avisaría
vive **dentro del archivo que se reemplaza**, así que muere con él. Si tenés que
hacerlo en ese orden, `tar --keep-old-files` te nombra los 4 y sale exit 2 sin pisar
nada.

**Si ya pisaste:** con el andamio commiteado, `git status` te nombra los 4 y
`git restore` los devuelve. Si **no** estaba commiteado no hay nada que restaurar
(`git restore` falla con *pathspec did not match*) y el rescate es volver a correr
`projects init ... --forzar`, que es idempotente. Ese comando sirve en los dos casos:
si dudás, usá ese.

### 3.4 Qué escribió init

**49 archivos.** El mensaje dice `escritos 22 archivos` y **está bien**: 22 son los
del andamio, y los otros 27 los escribe por otros dos caminos — las herramientas de
OpenSpec y el render de la constitución. No falta nada.

**No hace falta `openspec init` a mano:** init ya lo corrió, con el pin del marco
(`1.9.0`). Y el andamio nace pinado a la versión publicada del marco, así que su
artefacto de constitución arranca al día.

---

## Fase 4 — Lo que falta para que el CI arranque verde · **[vos]**

Acá es donde un primerizo pierde la mañana. Nada de esto lo trae ninguna de las dos
piezas.

### 4.1 Los scripts de raíz que el pipeline invoca, y sus dependencias

El `package.json` del starter no tiene los scripts que el `ci.yml` del marco llama.
Agregalos, junto a las devDependencies del linter y el formateador (`@eslint/js`,
`eslint`, `eslint-config-prettier`, `globals`, `prettier`, `typescript-eslint`).

⚠️ **`pnpm lint` del starter sale VERDE sin lintear una sola línea.** Los scripts de
`api` y `web` invocan un `eslint` que no está instalado, y el error queda tapado.
Verde que no verifica nada.

### 4.2 Regenerá el lockfile en el MISMO commit

```bash
pnpm install
git add package.json pnpm-lock.yaml
```

⚠️ Sin esto, el CI muere en su cuarto paso:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with <ROOT>/package.json
```

El disparador no es «tocaste un `package.json`»: es **cambiaste una dependencia
declarada**, en la raíz o en cualquier paquete.

### 4.3 Los excluidos de cobertura del propio andamio

⚠️ **El marco reparte tres archivos que su propia compuerta de cobertura reclama y
que ninguna prueba puede cubrir.** En un repo nuevo el primer diff agrega todo, así
que los reclama uno por uno: **300 de las 402 líneas en rojo son del marco, no
tuyas**. En el `package.json` de la raíz:

```json
"projects": { "cobertura": { "excluidos": [
  { "patron": "eslint.config.mjs", "motivo": "config del linter: corre al arrancar eslint, no bajo pruebas" },
  { "patron": "vitest.config.base.mjs", "motivo": "config de cobertura del marco: es lo que MIDE, no algo medible" },
  { "patron": ".claude/skills/**/*.mjs", "motivo": "herramientas de agente que reparte el marco; no son codigo de producto" }
] } }
```

Y en cada paquete, los suyos de configuración (`vite.config.ts`,
`tailwind.config.js`, `postcss.config.js` en web; `prisma.config.ts`,
`vitest.config.ts` en api).

### 4.4 Cableá la cobertura, que llega y nadie la consume

⚠️ El andamio deja `vitest.config.base.mjs` en la raíz — es la pieza que da
`all: true` y el `projectRoot` correcto — y **la única referencia a ese archivo en
todo el árbol está dentro de su propio comentario**. Ni `api` ni `web` lo extienden.
Y el starter **no trae proveedor de cobertura** (`@vitest/coverage-v8`: cero
ocurrencias en el lockfile).

```bash
pnpm --filter <api> add -D @vitest/coverage-v8   # la version acompaña a la de vitest
pnpm --filter <web> add -D @vitest/coverage-v8
```

Después, en la config de vitest de cada paquete, importá `coberturaDelMarco()` de
`../vitest.config.base.mjs`, y cambiá el script `test` a **`vitest run --coverage`**.
⚠️ Sin `--coverage` no se emite `lcov.info`, y la compuerta del marco da rojo por
«no se encontró ningún reporte». El `test` del starter es `vitest run` pelado: pasa
en verde y no deja nada que medir.

### 4.5 La deuda de cobertura que heredás

Con la cobertura bien cableada, el código **que trae el starter** reprueba 3 de los 4
umbrales: **39,18 % de líneas contra 80**. `server.ts` y `lib/prisma.ts` están al
0 %. Es código que no escribiste. Dos caminos:

- **Declarar la deuda** (lo honesto el día 1), en el `package.json` del paquete:
  ```json
  "projects": { "cobertura": { "deuda": {
    "motivo": "heredado del esqueleto projects-starter: server.ts y lib/prisma.ts llegan sin pruebas",
    "fecha": "2026-09-30"
  } } }
  ```
  La fecha **no es libre**: el 2026-09-30 es cuando se cierra sola la ventana de
  gracia de la cobertura del marco. Pedir más plazo que eso es pedir algo que la
  compuerta no da. Y ⚠️ **son dos compuertas distintas**: la deuda apaga la del
  marco, no los umbrales locales de vitest — esos hay que bajarlos a lo que el
  paquete mide hoy, o el `test` del paquete sigue rojo.
- **Escribir las pruebas** antes del primer push.

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
los revisa **el otro builder**. Los comandos `/opsx:*` que el andamio dejó en
`.claude/commands/` cubren el ciclo.

---

## Los fallos silenciosos, en una tabla

Si algo no cierra, buscá acá primero. Todos están medidos y todos **pasan en verde**
o apuntan al lugar equivocado.

| Qué | Síntoma | Dónde |
|---|---|---|
| Traer el starter **sobre** el andamio | Exit 0, sin una línea de aviso. `ci.yml` 399 → 18 líneas | 3.3 |
| `pnpm lint` del starter | Verde sin lintear nada: el `eslint` que invoca no está instalado | 4.1 |
| `test` sin `--coverage` | Verde, y la compuerta del marco falla por «no se encontró reporte» | 4.4 |
| `vitest.config.base.mjs` | Llega a la raíz y **nadie lo extiende** | 4.4 |
| `ID_MCP_SLACK` mal | Cinco entradas de allowlist que no matchean nada; permisos a mano para siempre | Fase 2 |
| Equipo `po` vacío | GitHub no asigna a nadie. El gate del PO no existe y nada lo dice | Fase 1 |
| Handle de GitHub equivocado | Asigna a un tercero real, o a nadie | Fase 1 |
| `@v1` en vez de versión exacta | No falla: el repo simplemente **no recibe versiones nuevas** ni aparece en el censo | 6.3 |
| Dependabot apagado | Igual que arriba, y no hay aviso | 6.3 |
| Labels `area:*` ausentes | La constitución las exige y nadie las crea | 6.2 |
| Primer PR con el bootstrap adentro | Rojo en cobertura por archivos **del marco** | Fase 5 |

---

## Cómo evoluciona este documento

**Canónico.** Se actualiza cuando alguien arranca un proyecto y encuentra algo que
acá no está — que es exactamente para lo que sirve el primer ensayo. Si un paso te
trabó, la corrección va en el mismo PR que la arregla.
