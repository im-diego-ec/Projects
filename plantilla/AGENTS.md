# AGENTS.md — Reglas de ingeniería · {{ORG}} / {{PROYECTO}}

> Este archivo es la **constitución** para agentes de IA (Claude Code, Cursor) y humanos en
> este repo. Se carga en **cada sesión** de codificación. Vive en la raíz del repo.
> Regla de oro: **el spec es la fuente de verdad; el código es el artefacto generado y verificable.**

> **Procedencia**: este archivo llegó como scaffold del marco **Projects** y desde la copia es
> propiedad de este proyecto — editalo cuando el proyecto lo necesite. Lo que NO vive acá:
> los specs del marco (canónicos en Projects), los workflows reusables (se consumen por
> `uses: {{ORG}}/Projects/...@v1`) y las skills/comandos de OpenSpec (se regeneran con el CLI
> que el marco pina, no se editan a mano).

---

## 🕳️ Antes del primer commit (borrar esta sección cuando esté hecho)

El scaffold llega con huecos a propósito: una plantilla que trae el stack de otro proyecto
miente desde el día 1.

1. Llenar **Stack fijado** (la sección siguiente). Sin eso, las reglas de abajo que
   nombran "el stack" no tienen referente.
2. Reemplazar todos los placeholders de doble llave del repo (la lista completa, con qué
   poner en cada uno, está en el README del scaffold de Projects).
3. Confirmar los tres roles del encabezado de OpenSpec (PO y dos builders) y que
   `.github/CODEOWNERS` tenga los handles reales.
4. Pedir el acceso al canal donde Projects avisa cada versión que publica (sección
   **Cuando el marco publica una versión**, más abajo). Este repo consume `@v1`, que es un
   tag **móvil**: sin ese aviso, el proyecto se entera de un comportamiento nuevo del marco
   el día que un check lo pone en rojo.
5. Borrar esta sección y este párrafo. **Recién ahí** corre la verificación final:
   `grep -rnE "\{\{[A-Z0-9_]+\}\}" --exclude-dir=node_modules --exclude-dir=.git .` no debe
   devolver nada (esta sección es la única que menciona la doble llave a propósito; el
   patrón exige mayúsculas para no marcar las expresiones `${{ ... }}` de GitHub Actions).

---

## Stack fijado (no se cambia sin aprobación de @{{BUILDER_1}})

> 🕳️ **COMPLETAR AL CREAR EL PROYECTO.** Llená cada fila con la herramienta elegida y
> borrá las filas que no apliquen (un proyecto sin frontend no tiene fila Frontend).
> El valor de esta tabla no es la lista: es que **queda congelada**. Una vez llena,
> introducir un framework, ORM, base de datos o servicio que no esté acá es una decisión,
> no una implementación — se pregunta primero (la aprobación puede venir del design de un
> change).

| Capa | Herramienta |
|---|---|
| Frontend | 🕳️ |
| Backend | 🕳️ |
| Datos | 🕳️ |
| Auth | 🕳️ |
| Validación de input externo | 🕳️ (por defecto del marco: **Zod**) |
| Infra | **AWS** + **Terraform** (IaC; `infra/` dev, `infra-prod/` producción) |
| CI/CD | **GitHub Actions** (promoción por ambientes, workflows reusables de Projects) |
| Package manager | **pnpm** con workspaces (monorepo: {{PAQUETES}}) |
| Tests | 🕳️ (unit/integración) + 🕳️ (E2E contra dev) |

Las filas **Infra**, **CI/CD** y **Package manager** llegan llenas porque no son
elección del proyecto: Terraform como IaC, GitHub Actions como pipeline y pnpm con
workspaces los fija el marco. Todo lo demás lo decide el proyecto una vez, acá.

pnpm está fijado porque el CI que trae el scaffold lo ejecuta directamente
(`corepack enable`, `pnpm install --frozen-lockfile`, y `pnpm list -r` para derivar
de pnpm —y no de una lista escrita a mano— qué paquetes hay que verificar) y porque
el marco depende de una propiedad concreta
del workspace: **un único lockfile, en la raíz**. Un lockfile suelto dentro de un
paquete hace que local y CI resuelvan dependencias distinto; por eso el `.gitignore`
del scaffold los bloquea. Cambiar de package manager no es sustituir un comando: es
reescribir el job de build del CI y rehacer esa garantía.

Toda dependencia nueva se pregunta primero. Para las dependencias YA existentes, la
política automática está en las fronteras (⚠️).

---

## Cómo trabajamos: OpenSpec

La fuente de verdad del comportamiento es **`openspec/`**.

**Roles**: **@{{PO}} es el PO** — dueño del *qué* y el *por qué* (proposal y specs, con los
scenarios en lenguaje de negocio). **@{{BUILDER_1}} y @{{BUILDER_2}} son builders** —
dueños del *cómo* (design, tasks, implementación), con review cruzado entre ellos: el
builder que no escribió, revisa. Independiente del rol, la regla operativa se mantiene:
**toda escritura en producción exige el OK explícito de @{{BUILDER_1}}**.

1. **Proposal** → por qué y qué cambia. **Aprueba @{{PO}} (PO)**.
2. **Specs** → deltas con `#### Scenario:` (ADDED/MODIFIED/REMOVED), en lenguaje de
   negocio. **Aprueba @{{PO}} (PO)**.
3. **Design** → decisiones con alternativas descartadas. Lo escribe un builder; **lo revisa
   el otro** (gate técnico).
4. **Tasks** → bloques ejecutables con evidencia. Al aprobarse: sub-issues por bloque
   colgados del issue macro (estándar GitHub Projects).
5. **Implementar** → TDD (rojo evidenciado en LOCAL), un PR por bloque, **review cruzado
   entre builders** de cada diff.
6. **Verify + archive** → el change cierra solo cuando los specs vivos validan `--strict` y
   las tareas tienen evidencia; el PR final cierra el issue macro vía `Closes`.

Tras editar CUALQUIER archivo de openspec: `openspec validate --strict` + relectura de
coherencia entre proposal/specs/design/tasks antes de commitear.

**El ciclo de vida de los specs** (modelo mental, en analogía git):

- `openspec/specs/` = **el contrato vigente** ("main"): lo que el sistema garantiza HOY.
  Documentos completos y autónomos; CI los valida `--strict` en cada PR. Para saber cómo se
  comporta algo, se lee AQUÍ.
- `openspec/changes/<nombre>/specs/` = **deltas** ("el diff del PR"): propuestas
  ADDED/MODIFIED/REMOVED contra los specs vivos. Solo existen mientras el change está activo.
- `openspec archive` = **el merge**: funde los deltas en los specs vivos (una capability
  nueva NACE ahí; una existente se actualiza) y mueve el change a `changes/archive/` como
  historia inmutable (porqué, decisiones, evidencia). Tras archivar, nadie lee el delta para
  entender el sistema — lee el spec vivo; el archive responde "por qué quedó así".
- ⚠️ Gotcha del CLI: una capability creada por archive nace con `Purpose: TBD` —
  completarlo en el MISMO PR del archive, no dejarlo.

**¿Change de OpenSpec o PR directo?** La pregunta diaria del builder:

- **Change de OpenSpec** cuando cambia el COMPORTAMIENTO o un contrato: feature nueva, regla
  de negocio, contrato de API o schema de datos, topología del pipeline, cualquier cosa que
  un spec vivo tendría que describir distinto después del merge.
- **PR directo** (con test y su issue si existe) cuando se RESTITUYE comportamiento ya
  especificado o no se toca comportamiento: bugfix contra un scenario existente,
  dependencias (salvo majors de auth o del runtime — ver la política de dependencias en las
  fronteras), refactor sin cambio observable, docs, tooling.
- Duda = pregunta corta al PO o al builder par en el PR. Regla de olfato: si el PR
  necesitaría explicar una DECISIÓN (no solo un arreglo), era un change.
- El **archive de OpenSpec ES el changelog** del proyecto — no se mantiene un CHANGELOG
  aparte.

Las decisiones estructurales viven como ADRs en `docs/adr/`. Los incidentes dejan
post-mortem en `docs/postmortems/` (48h, sin culpas) y lo operativo del "qué hago cuando
suena la alarma" vive en `docs/runbooks/`.

**Uso eficiente de Claude (modelos y effort)** — el default barato, la escalada deliberada:

- Default personal (`~/.claude/settings.json`): `"model": "sonnet"`,
  `"effortLevel": "medium"` — cubre implementar bloques con tasks aprobadas, tests, docs y
  deps. Este repo NO impone modelo en su `.claude/settings.json`: la elección es de cada
  quien.
- Escala por sesión (`/model`, `/effort high`) cuando la tarea lo paga: diseñar un change,
  cirugía de pipeline, diagnóstico de incidentes, review adversarial. `xhigh`/ultracode solo
  para auditorías.
- Subagentes: lo mecánico (recon, lectura masiva) en `model: sonnet` + `effort: low`; solo
  los verificadores con effort alto.
- El bot de GitHub (@claude) corre acotado: `sonnet`, `medium`, `max-turns 5`.
- `/fast` NO se usa: es Opus a precio premium (varias veces el costo por MTok de sonnet) —
  paga velocidad que este trabajo no necesita.
- La palanca más grande no es de config: sesiones acotadas por bloque, este archivo como
  contexto compartido, memoria persistente y el carril de docs.

---

## Cuando el marco publica una versión

Este repo consume Projects por `uses: {{ORG}}/Projects/...@v1`, y **`v1` es un tag móvil**: lo que
Projects publique llega a este pipeline sin que nadie acá toque una línea. Ese es el valor de lo
referenciado —una corrección del marco llega sola, sin abrir un PR— y también su riesgo: un
check nuevo puede poner este repo en rojo **sin que nadie lo haya leído**. Pasó el
2026-08-19, al mover `v1` la primera vez.

Por eso el CHANGELOG de Projects no alcanza: es superficie de consulta, y nadie consulta a
tiempo. **Projects avisa.** Al publicar una versión dispara un mensaje al canal del área con la
sección «Para consumidores» de esa entrada, que es exactamente donde dice qué hay que hacer
en este repo (lo normal: nada).

- **Estar en ese canal es requisito del proyecto, no una cortesía.** Si los avisos no
  llegan, pedile el acceso a @{{BUILDER_1}}: el destino se configura en Projects, no acá — este
  repo no tiene ningún secret ni workflow que dependa del aviso.
- **Un aviso con acción requerida se convierte en issue de este repo el mismo día.** Un
  mensaje leído y no anotado es un rojo esperando al próximo PR de cualquiera, y quien lo
  cobre no va a ser quien lo leyó.
- **El aviso es la notificación, no la fuente.** Ante cualquier duda manda el `CHANGELOG.md`
  de Projects en la versión publicada, enlazado en el propio mensaje. Si el aviso llega
  recortado, es porque la entrada era larga: el resto está en ese enlace.
- **Un aviso marcado BREAKING no debería existir sobre `v1`.** Si aparece, no se trabaja
  alrededor: se escala en Projects ese mismo día, porque `v1` no se mueve sobre un cambio
  incompatible.
- **Lo que NO se hace** cuando un check nuevo molesta: copiar el workflow del marco a este
  repo para editarlo, ni pinar una versión vieja para ganar tiempo. Las dos cosas rompen la
  propiedad que hace útil al marco (un arreglo llega a todos). Se abre issue o change **en
  Projects**.

---

## Git y despliegue

- **Trunk-based, una sola rama permanente: `main`.** Ramas de trabajo (`feat/*`, `chore/*`,
  `docs/*`) salen SIEMPRE de main actualizado
  (`checkout main && pull --ff-only && checkout -b`, atómico) y vuelven por PR obligatorio
  con review. Verificar los commits del PR antes de abrirlo.
- **Commits firmados** (GPG). CI corre lint (`--max-warnings=0`), typecheck, suites y build;
  los merges de solo docs van por carril rápido.
- **Promoción por ambientes**: merge de código → deploy a DEV → smoke API → E2E → deploy a
  PROD → verificar-prod. Producción no recibe nada que dev no haya verificado; las únicas
  vías que saltan dev son el rollback por `image_tag` y el dispatch manual de emergencia
  sobre main.
- **dev es staging compartido** y los Deploy se serializan (cola, nunca cancelación).
  Probar ramas: dispatch manual eligiendo la rama.
- **Done** = spec cumplido · tests verdes · PR revisado · sin secrets · desplegado por la
  promoción y verificado.

**Ambientes**

| | dev (staging) | producción |
|---|---|---|
| Frontend | https://{{DOMINIO_DEV}} | https://{{DOMINIO_PROD}} |
| API | https://api.{{DOMINIO_DEV}} | https://api.{{DOMINIO_PROD}} |
| Cuenta AWS | {{CUENTA_DEV}} | {{CUENTA_PROD}} |
| Perfil CLI | `{{PERFIL_DEV}}` | `{{PERFIL_PROD}}` |
| Región | {{REGION}} | {{REGION}} |

Usar siempre las URLs canónicas: el CORS del API solo permite esos orígenes.

---

## Fronteras de tres niveles

**✅ Siempre (hazlo sin preguntar)**
- Suite local ANTES de cada push (CI es la corrida final, no el banco de pruebas).
- Tests para cada endpoint y cada path crítico; TDD con rojo evidenciado.
- Validar TODO input externo con el validador de schemas del stack (Zod salvo que la tabla
  diga otra cosa) antes de usarlo.
- Logging por `{{PAQUETE_API}}/src/lib/log.ts` (JSON estructurado; `no-console` es error).
- Verificar autorización en el backend en cada operación (nunca confiar en el cliente).
- Respetar el stack y la estructura de carpetas fijados.
- Si un comando corre por un ejecutor que DESCARGA (`npx`, `bunx`, `npm exec`, `npm x`,
  `pnpm dlx`, `yarn dlx`, `bun x`, con o sin banderas globales entre el gestor y su
  subcomando), escribirlo con el paquete completo y su **versión exacta**. El nombre pelado
  de un paquete en npm lo puede tener otro: `openspec` a secas es un placeholder ajeno, y
  `npx --yes openspec ...` lo descarga y lo ejecuta sin preguntar. Cuando el binario ya lo
  trae una dependencia declarada del repo, la forma correcta es `pnpm exec <comando>`, que
  lee `node_modules` y falla si no está en vez de salir a buscarlo. El CI del marco lo
  verifica solo (check *Ejecutores de paquetes pinados*), incluido el allowlist de
  `.claude/settings.json`.

**⚠️ Pregunta primero (requiere OK humano)**
- Agregar una dependencia nueva.
  Para las EXISTENTES, la política es fija: Dependabot corre semanal (lunes; npm agrupa
  minor+patch en un PR, los majors llegan solos).
  **Minor/patch**: los mergea cualquier builder con la promoción en verde — el pipeline
  (suite, smoke, E2E) ES la verificación; sin auto-merge (el humano mira el changelog un
  minuto). **Majors**: nunca sueltos — sesión dedicada con orden de riesgo (devDeps →
  runtime → auth) y verificación real en dev antes de prod. Un major de una lib de AUTH o
  del RUNTIME se trata como change de comportamiento.
- Cambiar el schema de la base (migración) — y las migraciones de datos llevan invariantes
  de PROPIEDADES (jamás de cantidades esperadas: un invariante con número esperado aborta
  migraciones sanas por un falso fallo).
- Tocar Terraform o config de despliegue.
- Cambiar un contrato de API existente.
- Integrar cualquier servicio externo nuevo.

**🛑 Nunca**
- **Escribir en producción sin el OK explícito de @{{BUILDER_1}} en esa sesión** — aplica a
  `terraform apply`, one-offs, datos y config, aunque parezca inerte.
- **Contactar usuarios reales desde dev**: la instancia dev del proveedor de identidad es
  separada (solo usuarios de prueba) y las integraciones salientes (chat, correo, SMS)
  corren en sandbox u off — el modo real exige `APP_ENV=prod` (guard estructural en el
  código, no una convención).
- **Poner secrets en código, contexto o logs.** Viven en el store de secretos de AWS / env
  del runtime / secrets de Actions; se verifican DONDE ya existen, jamás leyéndolos hacia
  afuera.
- Guardar tiempos con zona horaria en la base: **la base guarda UTC**; la conversión a la
  zona local del negocio es de la capa de aplicación.
- Crear otra base de datos (una sola base por proyecto).
- Escribir en sistemas de terceros (ERP, nómina, facturación) sin compuerta de aprobación
  explícita.
- Borrar datos sin confirmación humana (las bajas de usuarios son LÓGICAS).
- Desplegar a mano (solo por el pipeline).
- Inventar endpoints, tablas o features que no estén en el spec.

---

## Seguridad y observabilidad

- Auth: el proveedor fijado en el stack. El front usa sus componentes; el API verifica el
  token **offline** con claims firmados (email/nombre del token, jamás del body; sin claim →
  fail-closed).
- Authz: cada request valida permiso sobre el recurso (ownership / rol). El backend es la
  autoridad; cero lógica de seguridad en el cliente.
- Logs: JSON por línea con `requestId` automático (trace del balanceador). Un `[fatal]` mata
  el proceso; `error` alerta; lo rutinario (auth fallida, integración caída) es `warn` — **la
  semántica de niveles es un contrato** de verificar-prod y las alarmas.
- Alertar cuando debe y con el **origen preciso** (requestId, versión, línea real vía
  sourcemaps): equipo chico = diagnóstico en minutos. Las alarmas de producción notifican a
  `{{CANAL_ALERTAS}}`.
- Un job nuevo del pipeline se audita **acción por acción** contra los permisos de su
  token/role ANTES del estreno.

---

## AWS y herramientas del agente

- **IaC = Terraform, sin excepción**: `infra/` (dev, cuenta {{CUENTA_DEV}}), `infra-prod/`
  (prod, cuenta {{CUENTA_PROD}}), región {{REGION}}. En este repo NO se genera CDK ni
  CloudFormation, ni siquiera como borrador o comparación. Tocar Terraform o config de
  despliegue ya requiere OK humano (fronteras ⚠️) y todo `apply` en producción exige el OK
  explícito de @{{BUILDER_1}}.
- **Lectura de AWS por CLI**, con los perfiles que el repo ya permite (`{{PERFIL_DEV}}`,
  `{{PERFIL_PROD}}`): `terraform validate`, `terraform plan`, `describe-*`, Logs Insights.
  El servidor MCP de AWS es configuración personal de cada máquina, no un supuesto del repo:
  si no está, la CLI es el camino normal, no un sustituto degradado.
- **Skills**: antes de una tarea de AWS, revisar si hay una skill que aplique y cargarla con
  la tool `Skill`; su guía manda sobre el conocimiento general. Ojo: las skills disponibles
  cubren CDK, CloudFormation y serverless, **no Terraform** — se usan como referencia del
  SERVICIO, jamás como permiso para cambiar de IaC.
- **Ante la duda sobre un detalle de AWS** (parámetro de API, permiso, límite, código de
  error) se verifica contra documentación en vez de adivinar, y se declara la incertidumbre
  si no se puede confirmar.
- **Well-Architected** como marco de referencia al diseñar infraestructura.
- **Sin em dashes en nombres ni descripciones de recursos AWS** (usar guiones). La regla
  aplica SOLO a valores que viajan a AWS; la prosa de docs y los comentarios siguen el
  estilo normal del área.

### Secretos: dónde viven y cómo NO se leen

- Mecanismo del marco: **SSM Parameter Store (SecureString)**, resuelto por el rol de
  ejecución del runtime en cada arranque
  (`secret { value_from = "arn:aws:ssm:{{REGION}}:<cuenta>:parameter/{{PREFIJO_RECURSOS}}/<env>/<NOMBRE>" }`
  en `infra*/`). Los parámetros se crean por CLI, **fuera de Terraform**, para que el valor
  nunca entre al tfstate. La base usa **IAM auth**, no password. Secrets Manager guarda
  ÚNICAMENTE el secreto master del motor administrado (rotado por el proveedor) y ningún
  proceso lo lee.
- **El valor de un secreto jamás entra al contexto del agente**: nada de
  `secretsmanager get-secret-value`, `batch-get-secret-value` ni
  `ssm get-parameter --with-decryption`. Se verifica que el secreto EXISTE y que su
  consumidor lo resuelve, nunca su valor.
- Crear o rotar un parámetro es tarea humana; en producción, además, exige el OK explícito
  de @{{BUILDER_1}}.
- La matriz de accesos (quién puede qué, bus factor) vive en `docs/accesos.md`.

---

## GitHub (estándar del área): branches, issues, PRs, Projects

- **Branches**: `feat/*`, `chore/*`, `docs/*` — SIEMPRE desde main actualizado, atómico. Se
  borran al mergear.
- **Issues**: pendientes macro = issues en el Project del área; los hijos (sub-issues por
  tarea/bloque) NO van al board. Para changes de OpenSpec: los sub-issues nacen recién con
  el tasks.md aprobado, uno por bloque.
- **Review cruzado AUTOMATIZADO**: `.github/CODEOWNERS` tiene a AMBOS builders como owners
  de todo — GitHub solicita review a los owners que NO son el autor, así que el par queda
  asignado solo. El enforcement duro vive en el ruleset de `main`: 1 aprobación requerida +
  review de code owner + firmas requeridas, con el veredicto agregado `ci-ok` como único
  check requerido. Su estado real y los pasos para aplicarlo viven en
  `.github/proteccion-main.md`, y se actualizan en el mismo PR que cambie la configuración.
  La última regla de CODEOWNERS le da al PO la
  propiedad de proposals y specs: ahí su aprobación ES el gate del PO y ningún builder puede
  satisfacerlo por él.
- **PR ↔ issue, obligatorio y verificable**: todo PR de bloque lleva `Closes #<sub-issue>`
  en el body **desde su creación** (la relación bloque↔PR es 1:1) — es lo ÚNICO que crea el
  enlace en la sección Development de ambos lados; un "ref #N" en texto plano NO enlaza
  nada. La evidencia del bloque va como comentario en el sub-issue ANTES del merge; el merge
  lo cierra solo — no se cierran sub-issues a mano.
- `Closes` apunta solo al sub-issue 1:1; el issue macro del change lo cierra únicamente el
  PR final del change.
- **Labels** de dos dimensiones: el campo Type para la naturaleza; `area:*` para el dominio.
  Sin milestones (deploy continuo).
