# `plantilla/` — el scaffold de Projects

Esto es lo que se copia **UNA vez** al crear un proyecto nuevo. Desde la copia, cada
archivo es del proyecto: si el proyecto necesita cambiarlo, lo cambia y no le debe nada a
Projects. Eso lo distingue de las otras piezas del marco:

| Pieza | Cómo evoluciona |
|---|---|
| **Scaffold** (esto) | Se copia una vez. Después es del proyecto. Un cambio acá NO llega a los repos ya creados. |
| **Referenciado** (workflows reusables, composite actions) | Se consume por `uses: {{ORG}}/Projects/...@v1`. Cambia una vez para todos. |
| **Canónico** (specs del marco) | Viven solo en Projects. Nadie los copia. |
| **Regenerado** (skills y comandos de OpenSpec) | No se vendoran: el marco pina la versión del CLI y cada repo las regenera. |

Corolario práctico: **nada que deba cambiar para todos los proyectos a la vez va acá.**
Si al editar un archivo del scaffold pensás "esto habría que propagarlo a los repos
existentes", es señal de que la regla pertenece a un workflow reusable o a un spec del
marco, no a la plantilla.

---

## 1. Copiar

```bash
# Git Bash / macOS / Linux
git clone --depth 1 https://github.com/{{ORG}}/Projects /tmp/projects
cp -r /tmp/projects/plantilla/. .        # el "/." final copia TAMBIEN los dotfiles
rm README.md                          # este archivo es la guia del scaffold, no el README del proyecto
```

```powershell
# Windows (robocopy no se traga los dotfiles ni deja archivos atras)
git clone --depth 1 https://github.com/{{ORG}}/Projects $env:TEMP\projects
robocopy "$env:TEMP\projects\plantilla" . /E /XF README.md
# robocopy devuelve exit code 1 cuando copio archivos: es exito, no error
```

Verificá que llegaron los ocultos: `ls -a` (o `Get-ChildItem -Force`) tiene que mostrar
`.claude/`, `.github/` (con `workflows/ci.yml` adentro), `.gitignore`, `.prettierrc`,
`.prettierignore`.

Lo que llega en `.github/workflows/ci.yml` es un **llamador delgado**: hereda del marco el
carril de docs y la validación de OpenSpec con `uses: {{ORG}}/Projects/...@v1`, y deja el
`build-test` del producto para que este repo lo llene. La mecánica del marco NO se copia:
si se copiara, un arreglo en Projects dejaría de llegar acá.

**No copies `plantilla/README.md`** (este archivo). El README del proyecto se escribe
aparte: qué hace la app, ambientes, cómo correr en local, cómo verificar, pipeline.

---

## 2. Reemplazar los placeholders

Convención única de todo Projects: **doble llave**, `{{DOBLE_LLAVE}}`. Se resuelven **una sola
vez**, al crear el repo, con un buscar-y-reemplazar sobre todo el árbol.

> Lo que el pipeline consume en RUNTIME (URLs de sondas, ARNs, log groups, IDs de cluster)
> **no** es un placeholder: va por `vars`/`secrets` de GitHub Actions y se resuelve en cada
> corrida. Regla para decidir: si el valor cambia sin que cambie el repo, es `vars`; si es
> parte de la identidad del proyecto, es placeholder.

### Identidad del proyecto

| Placeholder | Qué poner | Ejemplo |
|---|---|---|
| `{{PROYECTO}}` | Nombre del repo, kebab-case | `people-agenda` |
| `{{ORG}}` | Org de GitHub | `im-diego-ec` |
| `{{PAQUETES}}` | Paquetes del monorepo, lista legible | `web, api, e2e` |

### Paquetes (derivados de `{{PAQUETES}}`, uno por rol)

Los necesitan los globs de lint y la config de Dependabot: la herramienta tiene que saber
cuál paquete corre en Node y cuál en el navegador.

| Placeholder | Qué poner | Ejemplo | Si no existe |
|---|---|---|---|
| `{{PAQUETE_API}}` | Carpeta del backend | `api` | — |
| `{{PAQUETE_WEB}}` | Carpeta del frontend | `web` | Borrar los bloques `[FRONT]` de `eslint.config.mjs` y sus imports |
| `{{PAQUETE_E2E}}` | Carpeta de la suite E2E | `e2e` | Borrar esa entrada del glob de Node **y las dos entradas `EXCEPCIONES` de `ci.yml`** (una excepción que no corresponde a ningún paquete es roja, a propósito) |

### Generación de código previa a la verificación

| Placeholder | Qué poner | Ejemplo | Si no existe |
|---|---|---|---|
| `{{GENERAR_CLIENTE_DATOS}}` | Comando que genera el cliente de la capa de datos, tal como se invoca **dentro** del paquete de backend | `prisma generate` | Borrar el paso "Generar el cliente de la capa de datos" de `.github/workflows/ci.yml` |

El paso existe y va **antes** del lint por una razón concreta: el código de acceso a datos
está tipado contra el cliente generado, así que si el cliente no está, las reglas
type-aware no tienen tipos que mirar y cada acceso a datos vuelve a ser `any` silencioso —
el lint pasa en verde sin haber verificado nada. Vale para cualquier artefacto generado del
que dependa el tipado, no solo para el cliente de datos: si el proyecto tiene otro, se
agrega junto a este.

### Personas, por ROL (nunca nombres propios en la prosa)

| Placeholder | Qué poner |
|---|---|
| `{{EQUIPO_BUILDERS}}` | Slug del **equipo** de builders en la organización (ej. `builders`). Se usa en `CODEOWNERS` |
| `{{EQUIPO_PO}}` | Slug del **equipo** del PO (ej. `po`). Se usa en `CODEOWNERS` |
| `{{BUILDER_1}}` | Handle de GitHub del builder que sostiene **la llave de producción**: su OK explícito es obligatorio para toda escritura en prod |
| `{{BUILDER_2}}` | Handle del otro builder (el review cruzado es simétrico entre ambos) |
| `{{PO}}` | Handle del PO: dueño de proposals y specs |

**Equipos en `CODEOWNERS`, handles en la prosa**, y la distinción tiene motivo. La
asignación automática de reviewers va por equipo: sobrevive a que un rol cambie de persona
(se edita el equipo, no N archivos en N repos) y su composición es auditable en un solo
lugar. La prosa, en cambio, necesita nombrar a alguien concreto: "el OK de un equipo" no
es una autoridad, "el OK de @fulano" sí.

Dos condiciones que **fallan en silencio** si no se cumplen, así que conviene verificarlas:

- Los equipos deben tener **acceso de escritura** al repo. Sin eso GitHub los ignora como
  code owners y no avisa nada — el review cruzado desaparece sin ruido.
  Verificá con `gh api repos/{{ORG}}/{{PROYECTO}}/teams --jq '.[] | "\(.slug): \(.permission)"'`.
- El PO **no debe ser miembro del equipo de builders**. Si lo fuera, podría satisfacer su
  propio gate desde el otro rol y la separación se cae. Ojo: quien crea un equipo por API
  queda dentro automáticamente.

El orden de los builders tampoco es cosmético — `{{BUILDER_1}}` aparece en las fronteras 🛑
y en el checklist del PR como el que autoriza producción. Si esa autoridad cambia de
persona, se cambia el handle en `AGENTS.md` y en `.github/PULL_REQUEST_TEMPLATE.md`.

### AWS

| Placeholder | Qué poner | Ejemplo |
|---|---|---|
| `{{CUENTA_DEV}}` | ID de cuenta AWS de dev (12 dígitos) | `111111111111` |
| `{{CUENTA_PROD}}` | ID de cuenta AWS de producción | `222222222222` |
| `{{REGION}}` | Región | `us-east-1` |
| `{{PERFIL_DEV}}` | Nombre del perfil de la CLI para dev | `la organización-dev` |
| `{{PERFIL_PROD}}` | Nombre del perfil de la CLI para prod | `la organización-prod` |
| `{{PREFIJO_RECURSOS}}` | Prefijo de nombres de recursos AWS **y** raíz de las rutas de SSM (`/{{PREFIJO_RECURSOS}}/<env>/<NOMBRE>`). Sin em dashes | `agenda` |

> Los IDs de cuenta y los dominios de esta tabla son **de ejemplo, inventados**. Los reales
> de cada proyecto se ponen al sustituir, y nunca se escriben en el marco: la plantilla de PR
> de Projects rechaza cuentas, ARNs y dominios concretos en el diff.

### Operación

| Placeholder | Qué poner | Ejemplo |
|---|---|---|
| `{{DOMINIO_DEV}}` | Host del frontend de dev, sin esquema | `agenda-dev.ejemplo.com` |
| `{{DOMINIO_PROD}}` | Host del frontend de producción, sin esquema | `agenda.ejemplo.com` |
| `{{CANAL_ALERTAS}}` | Canal donde caen las alarmas de producción | `#alertas-prod` |
| `{{ID_MCP_SLACK}}` | ID del servidor MCP de Slack, tal como aparece en el nombre de sus tools: `mcp__<id>__slack_read_channel`. Si el equipo no usa Slack, borrá esas cinco entradas de `.claude/settings.json` | — |

### Verificar que no quedó ninguno

```bash
grep -rnE "\{\{[A-Z0-9_]+\}\}" --exclude-dir=node_modules --exclude-dir=.git .
```

Sin salida = listo. Con salida = el scaffold está a medio llenar y el repo no está para el
primer commit.

> El patrón exige **mayúsculas entre las llaves** a propósito: un `grep "{{"` a secas marca
> también las expresiones de GitHub Actions (`${{ github.ref }}`, `${{ needs.marco.result }}`)
> que el `ci.yml` usa de forma legítima y que NO se sustituyen nunca.

---

## 3. Llenar los huecos que NO son placeholders

Un buscar-y-reemplazar no los resuelve: son decisiones.

- **`AGENTS.md` → tabla "Stack fijado"**. Llega marcada con 🕳️ y vacía **a propósito**.
  Una plantilla que trae el stack del proyecto anterior miente desde el día 1, y el resto de
  la constitución la referencia ("el validador del stack", "el proveedor de auth"). Llenala
  antes del primer commit y borrá la sección "🕳️ Antes del primer commit".
- **`eslint.config.mjs` → `ignores`**. Hay dos ejemplos comentados: el cliente del ORM y los
  componentes de UI generados. Poné los generados reales de este proyecto; lintar un
  generado es ruido permanente.
- **`.prettierignore` → mismos generados** (dos líneas comentadas, misma razón).
- **`dependabot.yml` → versiones ignoradas de node**. La lista filtra las **impares**
  (no-LTS, soporte corto); las pares llegan como PR automático. Ajustala si el proyecto
  arranca en otra mayor.
- **`.github/workflows/ci.yml` → `SCRIPTS` y `EXCEPCIONES`** del paso "Todo paquete declara
  los scripts de verificación". `SCRIPTS` es lo que el CI le exige a **cada** paquete
  (`typecheck test build` por defecto); `EXCEPCIONES` es la lista —escrita, con su motivo al
  lado— de los pares `<carpeta>:<script>` que legítimamente no corren. Vienen con las dos de
  la suite E2E (su `test` levanta navegadores contra un ambiente desplegado y una suite no
  produce artefacto). No hay que mantener ninguna lista de paquetes: esa se deriva de pnpm
  en cada corrida. Las dos formas de equivocarse acá terminan en rojo, nunca en un verde
  falso: si falta una excepción, el CI pide el script que falta; si sobra, falla por
  excepción muerta.
- **`.claude/settings.json`**. Es el allowlist del EQUIPO (por eso se versiona, a
  diferencia de `settings.local.json`, que es por máquina y está en `.gitignore`). Trae solo
  comandos de lectura/verificación: lint, typecheck, tests, `terraform validate`,
  `terraform plan`, `gh run watch`. **Nada que escriba**: ni `terraform apply`, ni
  `git push`, ni `gh pr merge`. Los patrones de OpenSpec llegan con el paquete y la versión
  que el marco pina (`npx --yes @fission-ai/openspec@1.9.0 ...`): si el pin sube, se
  actualizan acá también. Ojo con el nombre — `openspec` a secas en npm es un paquete ajeno
  (placeholder `0.0.0`), así que un patrón sin scope permitiría correr otra cosa.

  Esto **ya no depende de que alguien se acuerde**: el check *Ejecutores de paquetes
  pinados* del job `higiene` lee todos los archivos rastreados del repo (menos los `.md`,
  que son prosa) y se pone rojo si un `npx`, `bunx`, `npm exec`, `npm x`, `pnpm dlx`,
  `yarn dlx` o `bun x` corre un paquete sin versión exacta. No lo decide con un regex de
  línea: **tokeniza** respetando comillas simples, comillas dobles y escapes, así que un
  valor de bandera entrecomillado con espacios (`pnpm -C "./mi dir" dlx …`) no lo ciega, y
  desenvuelve el comando cuando viaja dentro de un string de JSON, que es exactamente la
  forma en la que aparece en este archivo. Si el binario ya lo trae una dependencia declarada,
  la salida correcta es `pnpm exec <comando>`: lee `node_modules` y falla si no está, en
  vez de salir a buscar a npm un nombre que puede ser de otro. **Un repo que ignore
  `.claude` entero en su `.gitignore` esconde de ese check justo este archivo** — por eso
  el `.gitignore` del scaffold ignora `settings.local.json` y no el directorio.

---

## 4. Lo que el scaffold NO trae (y de dónde sale)

| Falta | De dónde sale |
|---|---|
| `package.json`, `pnpm-workspace.yaml` | Del proyecto: dependen del stack elegido. Ver el snippet de abajo para la parte de lint/format, que sí es del marco. |
| El resto de `.github/workflows/*` (deploy, verificación, cron) | Del proyecto: dependen de su topología de infraestructura. La MECANICA del marco no se copia nunca: `ci.yml` ya la consume por `uses: ...@v1`. |
| `.claude/skills/`, `.claude/commands/` | **Regenerado**: los genera el CLI de OpenSpec en la versión que pina el marco. No se vendoran ni se editan a mano. |
| `openspec/` | Lo inicializa el CLI de OpenSpec en el repo nuevo. Los specs del MARCO son canónicos y viven en Projects. |
| `infra/`, `infra-prod/` | Terraform del proyecto. El marco fija que la IaC es Terraform y los nombres de esas dos carpetas (`dependabot.yml` y `AGENTS.md` ya los asumen). |
| `README.md` del proyecto | Se escribe a mano: qué hace la app, ambientes, correr en local, verificar, pipeline, estructura. |
| `docs/adr/`, `docs/runbooks/`, `docs/postmortems/`, `docs/accesos.md` | Carpetas vacías al inicio; `AGENTS.md` ya las nombra como destino de ADRs, runbooks, post-mortems y matriz de accesos. Las plantillas de post-mortem y runbook están en `docs/plantillas/` de Projects: se copian cuando hace falta la primera, no al crear el repo. |

### Snippet para el `package.json` de la raíz

Los scripts y devDependencies que `eslint.config.mjs`, `.prettierrc` y el CI del marco dan
por hechos. `--max-warnings=0` no es opcional: es lo que hace que no exista el "warning
tolerado".

```json
{
  "name": "{{PROYECTO}}",
  "private": true,
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "globals": "^15.14.0",
    "prettier": "^3.4.2",
    "typescript-eslint": "^8.19.0"
  }
}
```

**`typecheck`, `test` y `build` NO van en la raíz: los declara cada paquete.** El CI se los
exige uno por uno y falla nombrando el `package.json` que no los tenga, así que un paquete
nuevo queda cubierto sin que nadie lo agregue a ninguna lista. Y en la raíz no hay
`"test": "pnpm -r test"` ni `"build": "pnpm -r build"` **a propósito**: `pnpm -r <script>`
saltea en silencio todo paquete que no declara ese script —imprime `Scope: N of M workspace
projects` y sale 0— y, en el caso de `test`, además dispararía la suite E2E con navegadores.
Un agregador que miente en verde es peor que no tener agregador. Para correr una
verificación local se usa la del paquete: `cd <paquete> && pnpm run typecheck`.

Con frontend React, agregar además: `eslint-plugin-react-hooks`,
`eslint-plugin-react-refresh` y —solo si se usa TanStack Query—
`@tanstack/eslint-plugin-query`. Sin esos paquetes instalados, los bloques `[FRONT]` de
`eslint.config.mjs` rompen el arranque de ESLint: o se instalan, o se borran junto a sus
imports.

---

## 5. Checklist del primer commit

Lo que hace que el marco se cumpla solo depende de que estos cinco puntos queden hechos una
vez; después ninguno pide que alguien se acuerde de nada.

- [ ] `grep -rnE "\{\{[A-Z0-9_]+\}\}" .` sin resultados (fuera de `node_modules` y `.git`)
- [ ] Tabla de stack de `AGENTS.md` llena y sección "🕳️ Antes del primer commit" borrada
- [ ] `pnpm lint` y `pnpm format:check` corren y pasan en el repo vacío
- [ ] Cada paquete declara `typecheck`, `test` y `build` (o su excepción está escrita con el
      motivo en `EXCEPCIONES` del `ci.yml`). No hace falta acordarse: el CI lo exige y falla
      nombrando el `package.json` incompleto
- [ ] `.github/workflows/ci.yml`: el job `build_test` refleja el stack real y el job `marco`
      apunta a `<org>/projects/.github/workflows/marco-ci.yml@v1`
- [ ] Los tres handles de `.github/CODEOWNERS` existen en la org y tienen acceso de escritura
      al repo (un handle mal escrito no falla: GitHub simplemente **no asigna a nadie**, y el
      review cruzado deja de existir sin avisar)
- [ ] Ruleset de `main` activo: 1 aprobación requerida + review de code owner + firmas
      requeridas. Sin el ruleset, CODEOWNERS solo sugiere reviewers — la regla existe pero
      nadie la hace cumplir
- [ ] El check requerido del ruleset es **`ci-ok`**, con ese nombre exacto. Nunca
      `build-test`: en un PR de solo docs queda `skipped`, y un check omitido no reporta
      nunca — el PR esperaría para siempre una señal que no llega
- [ ] `.github/proteccion-main.md` actualizado con el estado REAL del ruleset (los pasos y
      la tabla ya vienen en el scaffold; lo que falta es pasar los 🔴 a 🟢 y borrar el
      recuadro 🕳️)

---

## 6. Convenciones de estilo de estos archivos

- Prosa, comentarios y docs **en español**. Los keywords de OpenSpec (`SHALL`, `WHEN/THEN`,
  `Scenario`, `Requirement`) y los técnicos, en inglés.
- **Sin acentos en los comentarios de archivos de configuración** (`.gitignore`,
  `CODEOWNERS`, `eslint.config.mjs`, `dependabot.yml`, `tsconfig.base.json`). El markdown sí
  lleva acentos normales.
- Sin em dashes en nombres ni descripciones de recursos AWS (guiones). La prosa de docs
  sigue el estilo normal.
