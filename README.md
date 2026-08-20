# Projects — el marco de ingeniería de Transformación Digital y Data

Projects es el marco con el que nacen y se operan los proyectos del área: el
flujo de especificación (OpenSpec), los guardrails de CI/CD, la gobernanza
del repositorio (CODEOWNERS, protección de `main`, plantilla de PR), la
constitución para humanos y agentes (`AGENTS.md`) y las plantillas de
documentación de proceso (ADRs, post-mortems).

**Premisa de diseño:** el cumplimiento del marco tiene que ser **automático**.
El builder diseña y revisa especificaciones; no gasta tiempo en acordarse de
cumplir el marco a mano. Un ritual que alguien debe recordar **no cuenta como
enforcement** — solo cuentan los checks que fallan solos. Cada pieza candidata
a entrar acá pasa por la misma pregunta: *¿esto se puede hacer cumplir con un
validador en CI, un scaffold o una skill preconfigurada, o depende de que un
humano se acuerde?*

Las reglas para trabajar **en** el marco viven en [AGENTS.md](AGENTS.md).

---

## Por qué existe

Porque cada regla que vivía en disciplina humana terminó fallando hasta que se
volvió check automático — y porque esos checks se pagaron caro una vez y no
tiene sentido volver a pagarlos en cada proyecto nuevo.

El marco no se diseñó de arriba hacia abajo: **cada guardrail nació de un
incidente documentado**. Una muestra, toda trazable a los post-mortems y a los
changes archivados de otro repo:

| Incidente | Lo que enseñó | Guardrail que quedó |
|---|---|---|
| 2026-07-27 — Aurora rota la contraseña administrada y la app la llevaba congelada como env var del deploy | Una credencial rotativa capturada como valor estático es una caída con fecha | Los secretos se resuelven en el **arranque de cada tarea** (SSM SecureString por el rol de ejecución), nunca se copian al build; el valor jamás entra al contexto de un agente |
| 2026-07-28 — el scheduler de **dev** mandó notificaciones a usuarios reales, y 4 empleados "reservaron" en el ambiente de pruebas | La separación de ambientes por convención no separa nada | Guard **estructural** por `APP_ENV` para el modo real, instancias de auth separadas por ambiente, integraciones en sandbox fuera de producción |
| 2026-07-29 → 2026-08-05 — el ruleset de `main` exigía el check `build-test`, que un PR de solo docs **nunca reporta** | Un check requerido que solo reporta en un carril bloquea el otro para siempre | Un **veredicto agregado único** (`ci-ok`) que reporta siempre —docs o código— y es el único check requerido |
| 2026-07-31 — un delta `MODIFIED` que omitía escenarios vigentes los **borraba** del spec al archivar | `validate --strict` en verde no garantiza que no estés perdiendo contrato | Guardrail de deltas en CI: compara el delta contra el spec vivo y falla si el archive perdería escenarios |
| 2026-08-05 — el carril rápido de docs nunca actuó durante una semana: el token no tenía `pull-requests: read`, daba 403 y el fail-open lo tapaba **en silencio** | Un fail-open silencioso es indistinguible de que la función no exista | Permisos declarados explícitamente por workflow, el fallo de detección emite `::warning::` **ruidoso**, y todo job nuevo se audita acción por acción contra los permisos de su token antes del estreno |
| 2026-08-13 — dos deploys corrieron a la vez sobre dev; ambas corridas salieron verdes y aun así dejaron la configuración del ambiente corrupta | "Salió verde" no es lo mismo que "fue correcto" | Los deploys se **serializan por cola** (nunca cancelación): dev es un ambiente compartido |
| 2026-08-13 — un PR enlazaba su issue con `ref #N` en texto plano; GitHub no crea ningún vínculo con eso | La trazabilidad que depende de recordar la sintaxis correcta no es trazabilidad | `Closes #<issue>` obligatorio desde la creación del PR, en la plantilla y en el checklist |

Escribir esa tabla otra vez, proyecto por proyecto, es el costo que Projects
elimina.

---

## Principio de distribución: referenciar > copiar

La pregunta que ordena todo el repo no es *"¿esto sirve para otros
proyectos?"* sino **"¿cómo tiene que evolucionar esta pieza?"**.

Lo que debe cambiar **una vez para todos** se referencia. Lo que a partir del
día uno es del proyecto se copia. Lo que es contrato del marco vive solo acá.
Lo que genera una herramienta no se guarda: se regenera desde una versión
pinada.

| Forma | Qué es | Dónde vive en Projects | Cómo llega al proyecto | Cómo se actualiza |
|---|---|---|---|---|
| **Referenciado** | Workflows reusables y composite actions: la mecánica de CI/CD que no debe divergir | `.github/workflows/`, `actions/` | `uses: im-diego-ec/Projects/.github/workflows/marco-ci.yml@v1` | **Solo**, cuando el tag mayor `v1` se mueve. El proyecto no toca nada |
| **Scaffold** | Plantilla de arranque: el `AGENTS.md` propio del proyecto, gobernanza, configuración, plantillas de docs | `plantilla/` | Se copia **una vez** al crear el repo y se sustituyen sus placeholders | No se actualiza solo. A partir de la copia es del proyecto; la divergencia se revisa cada trimestre |
| **Canónico** | Los specs del marco (OpenSpec): el comportamiento que Projects garantiza | `openspec/specs/` | **No se copia.** El proyecto lee acá; sus specs describen SU dominio | Change de OpenSpec en este repo, con aprobación del PO |
| **Regenerado** | Skills y comandos del CLI de OpenSpec | En ningún lado: Projects pina la **versión** (el default del input `version_openspec`) | Cada repo los regenera con el CLI pinado | Subiendo el pin acá y regenerando en cada repo |

Por qué las skills **no** se vendoran: cada `SKILL.md` que genera el CLI trae
`generatedBy: "<versión>"` en su cabecera. En otro repo quedaron skills
generadas por la 1.6.0 mientras CI validaba con la 1.9.0 — copiarlas al marco
habría congelado esa divergencia para todos los proyectos a la vez. El marco
pina la versión; la herramienta genera.

> **Gotcha operativo:** para que un repo privado pueda hacer `uses:` de este,
> Projects necesita **Settings → Actions → General → Access = "Accessible from
> repositories in the organization"**. Sin eso, el consumidor falla con un
> error de repositorio no encontrado que parece un typo en la ruta. La
> organización está en plan GitHub Team, que sí soporta compartir Actions entre
> repos privados.

---

## Cómo lo consume un proyecto NUEVO

El proyecto nace **dentro** del marco: el scaffold se copia antes del primer
commit de código.

1. **Crear el repo vacío** en la organización.
2. **Copiar el contenido de `plantilla/`** a la raíz del repo nuevo —dotfiles
   incluidos (`.claude/`, `.github/` con su `workflows/ci.yml`, `.gitignore`,
   `.prettierrc`) y sin su propio `README.md`, que es la guía del bootstrap y no
   el README del proyecto.
3. **Sustituir los placeholders** (tabla abajo). Nada de `{{...}}` debe
   sobrevivir al primer commit; la verificación es
   `grep -rnE "\{\{[A-Z0-9_]+\}\}" .` —con mayúsculas obligatorias, para no
   confundirlos con las expresiones `${{ ... }}` de GitHub Actions—.
4. **Regenerar las skills y comandos de OpenSpec** con el CLI en la versión
   que pina el marco — no se copian desde acá.
5. **Cargar `vars` y `secrets`** del repo en GitHub Actions: todo lo que el
   pipeline consume en runtime (URLs de sondas, ARNs, log groups, tokens) va
   ahí, nunca hardcodeado en el scaffold.
6. **Aplicar la protección de `main`** como acto humano deliberado, con el
   veredicto agregado de CI (`ci-ok`) como único check requerido, y
   documentarla en el repo con su estado real.

> Los comandos exactos —incluida la variante de Windows, que necesita
> `robocopy` porque `cp` deja dotfiles atrás— y la tabla completa de
> placeholders con sus casos borde viven en
> **[`plantilla/README.md`](plantilla/README.md)**: esa es la guía operativa
> del bootstrap y manda sobre este resumen.

El `ci.yml` que el scaffold trae ya apunta a `@v1` y es lo único de CI que se
copia: un llamador delgado. El proyecto nace consumiendo la mecánica del marco
por referencia, no con una copia que se va a quedar vieja.

## Cómo lo consume un proyecto EXISTENTE

Sin big bang: se adopta por partes, empezando por lo referenciado.

1. **Apuntar los jobs de marco a `@v1`.** El `ci.yml` del proyecto deja de
   contener la mecánica (detección del carril de docs, guardrail de deltas,
   validación estricta de OpenSpec) y pasa a llamarla:
   ```yaml
   # Obligatorio: un workflow reusable NUNCA recibe mas permisos que los que
   # le concede quien lo llama. Sin pull-requests:read, la deteccion del
   # carril de docs cae al fail-open y nunca actua (incidente del 2026-08-05).
   permissions:
     contents: read
     pull-requests: read

   jobs:
     marco:
       uses: im-diego-ec/Projects/.github/workflows/marco-ci.yml@v1

     build_test:          # lo del producto: lint, typecheck, test, build
       name: build-test
       needs: marco
       if: needs.marco.outputs.solo_docs == 'false'
       # ...
   ```
   El catálogo del workflow reusable —sus `inputs`, `outputs`, los permisos que
   exige y el ejemplo completo de consumo— vive en el encabezado de
   [`.github/workflows/marco-ci.yml`](.github/workflows/marco-ci.yml); el de las
   composite actions, en [`actions/README.md`](actions/README.md). El mismo
   `ci.yml` armado que describe el paso 1 es el que el scaffold ya trae en
   [`plantilla/.github/workflows/ci.yml`](plantilla/.github/workflows/ci.yml):
   sirve de referencia para migrar.
2. **Dejar lo específico del proyecto donde está.** Lo que no es marco —el
   deploy con su topología de infraestructura, sus migraciones, sus sondas—
   sigue viviendo en el repo del proyecto.
3. **Adoptar el scaffold pieza por pieza** (`AGENTS.md`, CODEOWNERS, plantilla
   de PR, plantillas de docs), sustituyendo los placeholders con los valores
   que el proyecto ya usa.
4. **Verificar el nombre del check requerido.** El ruleset del proyecto debe
   exigir el **veredicto agregado** (`ci-ok`), que reporta en los dos carriles.
   Si exige un job que solo reporta en uno —`build-test`, por ejemplo, que en
   un PR de solo docs queda `skipped` y nunca reporta— ese carril queda
   bloqueado para siempre esperando una señal que no llega. Es el error más
   caro de la migración, y ya se cometió una vez: el ruleset de otro repo
   vivió una semana pidiendo el check equivocado.

> **Regla dura:** el proyecto **no edita el marco desde su repo**. Si necesita
> algo distinto, o es un **parámetro** que le falta al workflow, o es un
> **change de OpenSpec acá**. Ver [AGENTS.md](AGENTS.md).

---

## Parámetros del scaffold

Convención única para todo el repo: en archivos de `plantilla/` los valores del
proyecto van como **placeholders de dobles llaves**. Los handles de GitHub se
parametrizan **por rol**, nunca por nombre propio: los roles sobreviven a las
personas.

Los ejemplos de la tabla son **inventados a propósito**: en el marco no se
escriben handles, cuentas ni dominios reales de ningún proyecto. Es una frontera
🛑 de [AGENTS.md](AGENTS.md) y un ítem del checklist de PR.

| Placeholder | Qué es | Ejemplo |
|---|---|---|
| `{{PROYECTO}}` | Nombre del proyecto y del repo | `people-agenda` |
| `{{ORG}}` | Organización de GitHub | `po` |
| `{{EQUIPO_BUILDERS}}` | Slug del equipo de builders en la org (va en `CODEOWNERS`) | `builders` |
| `{{EQUIPO_PO}}` | Slug del equipo del PO (va en `CODEOWNERS`) | `po` |
| `{{BUILDER_1}}` | Handle del builder que sostiene la llave de producción | `@builder-uno` |
| `{{BUILDER_2}}` | Handle del otro builder (el review cruzado es simétrico) | `@builder-dos` |
| `{{PO}}` | Handle del Product Owner | `@po-del-area` |
| `{{CUENTA_DEV}}` | Cuenta AWS de dev | `111111111111` |
| `{{CUENTA_PROD}}` | Cuenta AWS de producción | `222222222222` |
| `{{REGION}}` | Región AWS | `us-east-1` |
| `{{PERFIL_DEV}}` | Perfil local de la CLI para dev | `la organización-dev` |
| `{{PERFIL_PROD}}` | Perfil local de la CLI para producción | `la organización-prod` |
| `{{DOMINIO_DEV}}` | Dominio del ambiente dev | `agenda-dev.ejemplo.com` |
| `{{DOMINIO_PROD}}` | Dominio de producción | `agenda.ejemplo.com` |
| `{{CANAL_ALERTAS}}` | Canal donde suenan las alarmas | `#alertas-prod` |
| `{{PREFIJO_RECURSOS}}` | Prefijo de recursos AWS y raíz de las rutas de SSM (`/<prefijo>/<env>/<NOMBRE>`) | `agenda` |

El scaffold define además unos pocos placeholders **derivados** —los paquetes
uno por rol (`{{PAQUETE_API}}`, `{{PAQUETE_WEB}}`, `{{PAQUETE_E2E}}`), que los
globs de lint y Dependabot necesitan por separado, y `{{ID_MCP_SLACK}}`, el
identificador del servidor MCP de Slack— con sus casos borde (qué borrar si el proyecto no tiene
frontend, o no usa Slack). La tabla operativa completa, esa que se sigue
mientras se hace el bootstrap, vive en
[`plantilla/README.md`](plantilla/README.md).

**Regla para decidir si algo es placeholder:** si el valor cambia sin que
cambie el repo, es `vars`/`secrets`; si es parte de la identidad del proyecto,
es placeholder.

**Lo que NO es placeholder nunca:** todo lo que el pipeline consume en
**runtime** —URLs de sondas, ARNs, log groups, identificadores de distribución,
tokens—. Un placeholder se sustituye una vez y queda escrito en el repo; una
variable de Actions se cambia sin tocar código, y un secret no se filtra en un
diff.

---

## Mapa del repo

```
├── README.md              # esta puerta de entrada
├── AGENTS.md              # constitución de ESTE repo: cómo se cambia el marco
├── CHANGELOG.md           # qué cambió en cada versión (lo leen los consumidores)
├── CLAUDE.md              # importa AGENTS.md al contexto de Claude Code (sin reglas propias)
├── .gitignore             # el de Projects; el de los proyectos vive en plantilla/
├── .github/
│   ├── CODEOWNERS         # review cruzado de builders + gate del PO sobre los specs
│   ├── PULL_REQUEST_TEMPLATE.md   # pide distribución, impacto en consumidores y veredicto de breaking
│   ├── proteccion-main.md # estado REAL del ruleset de main y los pasos para aplicarlo
│   └── workflows/         # REFERENCIADO: marco-ci.yml (reusable, @v1) + ci.yml (el CI propio, dogfooding)
│                          #   + aviso-version.yml: al publicar un release avisa a los consumidores
├── actions/               # REFERENCIADO: composite actions (una carpeta por action, con su action.yml)
│   └── README.md          #   catálogo: qué hace cada una, inputs/outputs y permisos mínimos
├── plantilla/             # SCAFFOLD: el árbol que se copia UNA vez al crear un proyecto,
│                          #   con su propio README como guía del bootstrap y un
│                          #   .github/workflows/ci.yml que ya llama al marco por @v1
├── openspec/              # CANÓNICO: el contrato del marco
│   ├── config.yaml        #   contexto y reglas de OpenSpec para este repo
│   ├── specs/             #   los specs vivos del marco (una carpeta por capability)
│   └── changes/           #   vacío hasta el primer change: así se cambia Projects
└── docs/                  # el porqué: ADRs, reglas no escritas, upgrade del CLI y plantillas
                           #   de documentos de proceso (post-mortem, runbook)
```

Las cuatro formas de distribución no son una metáfora: son carpetas. Si al
agregar una pieza no sabés en cuál va, la pregunta correcta es cómo tiene que
evolucionar.

Las capabilities de `openspec/specs/` son las del **marco**, no las de ningún
producto: base tecnológica, calidad de código, gobierno de la contribución,
despliegue y CI, pipeline de entrega, verificación de lo desplegado,
observabilidad, gestión de secretos y operación de la infraestructura. Un
proyecto no las copia: sus specs describen su dominio, y estas describen el
carril por el que ese dominio viaja — y, la primera, con qué está construido.

---

## Qué NO es Projects

- **No es una librería de código de aplicación.** Acá no vive lógica que se
  importe en tiempo de ejecución: ni componentes, ni helpers, ni clientes de
  API, ni utilidades compartidas. Projects gobierna **cómo se construye y se
  entrega** el software, no qué hace el software. Un paquete compartido de
  código sería otro repo, con otro ciclo de vida.
- **Trae una base, y la salida está declarada.** El área fija su base
  tecnológica —cómputo, persistencia, frontend, backend, identidad, validación de
  input externo, IaC, pipeline, gestor de paquetes y pruebas— y Projects la publica
  y la entrega **ya escrita**: es la **primera opción** de todo proyecto, y
  apartarse de cualquier capa se **pregunta antes de implementar**. Un proyecto
  con una necesidad legítimamente distinta no queda afuera: declara el desvío de
  esa capa con su aprobador y su motivo, **conserva las propiedades del marco**
  —el flujo de specs, la gobernanza, los guardrails, el veredicto único de CI, la
  promoción por ambientes— y es dueño de su despliegue, sin consumir las piezas
  de entrega de referencia. Lo que Projects no hace es adivinar: la base se publica
  en un solo lugar y solo cambia por un change de este repo. La capability
  `base-tecnologica` lo especifica.
- **No es un sustituto del criterio del equipo.** Los guardrails atrapan lo que
  ya nos pasó. Lo que no nos pasó todavía lo caza una revisión adversarial: en
  otro repo, un change pasó `validate --strict` **y** el guardrail de
  deltas en verde y aun así tenía dos bloqueantes de contrato. Herramientas
  verdes no bastan para specs que cambian contrato.
- **No es un repo donde se hacen parches de proyecto.** Nadie edita Projects para
  destrabar un proyecto: se parametriza o se propone un change.
