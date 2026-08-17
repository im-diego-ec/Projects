# Changelog

Todos los cambios notables de Projects se documentan acá.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

**Este archivo lo leen los consumidores.** Los proyectos hacen
`uses: im-diego-ec/Projects/...@v1`, y `v1` es un tag **móvil**: lo que se
publique acá les llega sin que ellos toquen una línea. Por eso la entrada del
changelog se escribe en el **mismo PR** que introduce el cambio, no al momento
del release, y por eso cada entrada dice **qué tiene que hacer un consumidor**
(normalmente: nada).

Convención de secciones: `Añadido`, `Cambiado`, `Obsoleto`, `Eliminado`,
`Corregido`, `Seguridad`. Todo lo que sea **BREAKING para `@v1`** se marca en
mayúsculas al inicio de la línea y obliga a abrir línea mayor nueva: `v1` no se
mueve sobre un cambio incompatible.

> Nota: en los **proyectos** el changelog es el archive de OpenSpec y no se
> mantiene un archivo aparte. Projects es la excepción deliberada porque tiene
> consumidores externos: el archive guarda el *porqué* de cada decisión; este
> archivo guarda el *qué* por versión.

> **Excepción declarada del bootstrap.** `AGENTS.md` fija que todo cambio al
> marco entra como change de OpenSpec con su proposal aprobado. Este primer
> commit no lo es, y no puede serlo: el proceso que exige el change es
> justamente lo que este commit crea, y `openspec/changes/` nace vacío. La
> excepción vale **solo para el bootstrap**; desde el segundo cambio rige la
> regla sin excepciones. Queda escrita acá en vez de resolverse en silencio,
> porque un marco cuyo primer acto es incumplirse a sí mismo sin decirlo enseña
> justo lo contrario de lo que pretende enseñar.

---

## [No publicado]

Nada todavía.

---

## [1.0.0] — 2026-08-17

**Primera versión publicada del marco.** A partir de acá los proyectos lo
consumen con `uses: im-diego-ec/Projects/...@v1`, y `v1` es un tag
**móvil**: apunta siempre a la última `1.x`.

Validado contra un consumidor real antes de publicarse: `un-proyecto-anterior`
reemplazó sus jobs de marco por el reusable y quedó verde de punta a punta —los
tres jobs del marco más su `build-test` completo (Postgres, Prisma, lint,
typecheck, tests y builds)—. Esa validación encontró y corrigió un defecto de
diseño antes del tag; está abajo, en *Corregido*.

### Corregido

- **El guardrail de deltas viaja como composite action, no por `checkout`.** El
  reusable hacía `actions/checkout` del repo del marco para traerse el script y
  fallaba con `Not Found`: el `GITHUB_TOKEN` de un consumidor **no tiene lectura
  sobre otro repo**, ni dentro de la misma organización. En la misma corrida el
  job de detección sí pasó, lo que reveló la regla general: **el `uses:` de un
  workflow o de una action en repo privado se resuelve por la configuración de
  Actions de la organización, sin token; `checkout` no**. Consecuencia para el
  consumidor: **no hace falta crear ningún PAT** — desaparecen los inputs
  `ruta_guardrail`, `repo_marco` y `ref_marco`, y el secret `token_marco`.

### Para consumidores

Un proyecto nuevo nace del scaffold (`plantilla/`). Uno existente reemplaza sus
jobs de marco por una llamada al reusable y conserva el nombre de su check
agregado —el que exige la protección de rama— para no dejar `main` esperando una
señal que ya no existe.

### Cambiado — decisiones del PO sobre el bootstrap (2026-08-14)

- **`CODEOWNERS` pasa a equipos de la organización** en vez de handles
  personales, acá y en el scaffold: `@{{ORG}}/{{EQUIPO_BUILDERS}}` sobre todo y
  `@{{ORG}}/{{EQUIPO_PO}}` sobre los contratos. Sobrevive a que un rol cambie de
  persona, saca los nombres propios del marco y hace auditable la composición en
  un solo lugar. Se documentan las dos condiciones que **fallan en silencio**:
  el equipo necesita acceso de **escritura** o GitHub lo ignora como code owner
  sin avisar, y el PO **no** debe pertenecer al equipo de builders o podría
  satisfacer su propio gate (quien crea un equipo por API queda dentro
  automáticamente — pasó, y se corrigió).
- **pnpm queda fijado por el marco**, junto a Terraform y GitHub Actions: deja
  de ser un hueco 🕳️ del scaffold. El CI que trae la plantilla lo ejecuta
  directamente y el marco depende de una propiedad concreta del workspace —un
  único lockfile en la raíz— que el `.gitignore` del scaffold ya protege.

### Añadido — la casa (raíz del repo)

- `README.md`: qué es Projects, por qué existe —con la tabla de incidentes reales
  y el guardrail que dejó cada uno—, el principio **referenciar > copiar** con
  las cuatro formas de distribución, la adopción para proyectos nuevos y
  existentes, y el mapa del repo.
- `AGENTS.md`: la constitución de **este** repo. Todo cambio al marco es un
  change de OpenSpec con aprobación; versionado semver con tag mayor móvil `v1`;
  la **regla de oro** —un guardrail nace de un incidente y sube al MARCO, no al
  proyecto: el post-mortem ES el proposal—; la prohibición de editar el marco
  desde el repo de un proyecto (o es parámetro, o es change acá); la definición
  operativa de qué es BREAKING para `@v1`; y la revisión trimestral de
  divergencia del scaffold.
- `.github/CODEOWNERS`: review cruzado automático entre builders sobre todo el
  repo, con el PO como owner **exclusivo** de los specs canónicos y de los
  proposals.
- `.github/proteccion-main.md`: el estado **real** del ruleset de `main` (hoy
  todo pendiente, porque el repo recién nace), por qué el check requerido es
  `ci-ok` y los pasos exactos para aplicarlo o restablecerlo desde cero. El
  scaffold lleva su gemelo parametrizado.
- `.github/PULL_REQUEST_TEMPLATE.md`: adaptada a que acá lo que cambia es el
  marco. Pide la clasificación de distribución, el **impacto en los proyectos
  consumidores**, el veredicto explícito de si el cambio es breaking para `@v1`
  y la evidencia de haberlo probado contra un consumidor real.
- `CLAUDE.md` (importa `AGENTS.md` sin agregar reglas propias) y `.gitignore`
  de Projects — el de los proyectos es otro y vive en el scaffold.
- **Convención única de parametrización**, documentada en el README: los valores
  de proyecto van como placeholders `{{...}}` —con los handles de GitHub
  parametrizados **por rol**, nunca por nombre propio— y todo lo que el pipeline
  consume en runtime (URLs de sondas, ARNs, log groups) viaja por `vars` y
  `secrets` de GitHub Actions.

### Añadido — referenciado (`@v1`)

- `.github/workflows/marco-ci.yml`: los jobs de CI que todo proyecto hereda
  —detección del carril rápido de docs, guardrail de deltas de OpenSpec,
  validación estricta y veredicto agregado—, consumibles con `uses:`.
- `actions/carril-docs/` y `actions/guardrail-deltas/`: las composite actions
  sobre las que se apoya ese workflow.
- El CI propio de Projects, que **dogfoodea** el marco: si un guardrail no sirve
  para este repo, tampoco sirve para los demás.

### Añadido — scaffold (`plantilla/`)

El árbol que se copia una vez al crear un proyecto: `AGENTS.md` y `CLAUDE.md`,
gobernanza (`CODEOWNERS`, plantilla de PR, `dependabot.yml`), configuración
(`eslint.config.mjs`, `tsconfig.base.json`, Prettier, `.gitignore`,
`.claude/settings.json`) y un `README.md` propio que es la guía operativa del
bootstrap.

Incluye `.github/workflows/ci.yml`: un **llamador delgado** que consume
`marco-ci.yml@v1` y deja el `build-test` del producto como hueco a llenar. Es la
única pieza de CI que se copia —la mecánica sigue siendo referenciada— y existe
para que el repo nuevo nazca con el veredicto `ci-ok` ya armado, sin que nadie
tenga que acordarse de escribirlo.

### Añadido — canónico (`openspec/specs/`)

Los ocho specs del marco, destilados de los specs vivos de otro repo:
`calidad-codigo`, `despliegue-ci`, `gestion-secretos`, `gobierno-contribucion`,
`observabilidad`, `operacion-infra`, `pipeline-entrega` y
`verificacion-desplegada`. `openspec/changes/` queda vacío a propósito: el
primer change que se proponga nace ahí.

### Añadido — el porqué (`docs/`)

Los tres ADRs del marco (OpenSpec como fuente de verdad, trunk-based con
promoción por ambientes, verificación dentro del pipeline) con su convención de
formato; `reglas-no-escritas.md` —las reglas que se practicaban sin estar
escritas, con su estado de enforcement y el backlog de automatización—;
`upgrade-openspec.md`, el procedimiento para subir el pin del CLI con sus tres
trampas; y las plantillas de post-mortem y de runbook, que se copian al proyecto
cuando hace falta la primera (no al crear el repo).

### Contexto de origen

El marco se destila del estado **actual** de `un-proyecto-anterior` (primer commit
2026-07-03), no de un starter previo: `projects-starter` quedó archivado el
2026-08-14. Cada guardrail que entra a Projects trae su incidente detrás —la tabla
del README los enumera con fecha— y esa trazabilidad es un requisito, no un
adorno: el post-mortem es el proposal del change que crea el guardrail.

