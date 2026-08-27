# `plantilla/` — el scaffold de Projects

Esto es lo que se copia **UNA vez** al crear un proyecto nuevo. Desde la copia, cada
archivo es del proyecto: si el proyecto necesita cambiarlo, lo cambia y no le debe nada a
Projects. Eso lo distingue de las otras piezas del marco:

| Pieza | Cómo evoluciona |
|---|---|
| **Scaffold** (esto) | Se copia una vez. Después es del proyecto. Un cambio acá NO llega a los repos ya creados. |
| **Referenciado** (workflows reusables, composite actions) | Se consume por `uses: {{ORG_MARCO}}/Projects/...@v1.7.0`, **por versión exacta**. Una versión nueva llega como PR de Dependabot, no empujada. |
| **Canónico** (specs del marco) | Viven solo en Projects. Nadie los copia. |
| **Regenerado** (skills y comandos de OpenSpec, y la porción del marco de la constitución) | No se vendoran: el marco pina la herramienta o publica el texto, y cada repo lo regenera. |

Corolario práctico: **nada que deba cambiar para todos los proyectos a la vez va acá.**
Si al editar un archivo del scaffold pensás "esto habría que propagarlo a los repos
existentes", es señal de que la regla pertenece a un workflow reusable, a un spec del marco
o a la porción regenerada de la constitución (sección 2.5), no a la plantilla.

Ese corolario es también la explicación de por qué `AGENTS.md` **adelgazó**: las reglas
comunes del área estaban acá, en un archivo que se copia una vez, y cada proyecto terminaba
con su propia versión envejecida de la misma regla. Ahora el scaffold entrega lo del
proyecto —stack, ambientes, sus reglas propias— y lo común llega regenerado.

---

## 0. El atajo: `projects init`

Las secciones 1, 2 y 2.5 de abajo son **transcripción**, y hay una herramienta que
las hace en un comando. Desde la raíz del repo nuevo, con un clon del marco:

```bash
node <clon-del-marco>/herramientas/projects-init.mjs --ejemplo > valores.json
# llenar valores.json con la tabla de la seccion 2
node <clon-del-marco>/herramientas/projects-init.mjs --valores valores.json --destino .
```

Hace el copiado (sección 1), la sustitución de los marcadores (sección 2), el
`openspec init` con el pin del marco (sección 4) y el render de la constitución
(sección 2.5). Falla cerrado y verifica releyendo el árbol.

**Las secciones de abajo siguen siendo la fuente de verdad de los VALORES** —qué
poner en cada uno, con ejemplo y caso borde— y el camino manual completo, que es el
fallback. Lo que la herramienta no hace está en la sección 5.

---

## 1. Copiar

```bash
# Git Bash / macOS / Linux
git clone --depth 1 https://github.com/{{ORG_MARCO}}/Projects /tmp/projects
cp -r /tmp/projects/plantilla/. .        # el "/." final copia TAMBIEN los dotfiles
rm README.md                             # este archivo es la guia del scaffold, no el del proyecto
mv README-del-proyecto.md README.md      # y ESTE si es el del proyecto: aterriza con su nombre
```

```powershell
# Windows (robocopy no se traga los dotfiles ni deja archivos atras)
git clone --depth 1 https://github.com/{{ORG_MARCO}}/Projects $env:TEMP\projects
robocopy "$env:TEMP\projects\plantilla" . /E /XF README.md
Rename-Item README-del-proyecto.md README.md
# robocopy devuelve exit code 1 cuando copio archivos: es exito, no error
```

Los dos pasos son **uno solo**, y por eso van pegados: en la raiz del scaffold conviven dos
documentos que en el repo nuevo se llamarian igual —la guia del bootstrap y el README del
proyecto—, asi que el segundo viaja como `README-del-proyecto.md` y se renombra al aterrizar.
Saltear el `mv` deja el repo **sin portada**: lo unico que GitHub renderiza al entrar es
`README.md`, y su ausencia no pone nada en rojo.

Verificá que llegaron los ocultos: `ls -a` (o `Get-ChildItem -Force`) tiene que mostrar
`.claude/` (con `settings.json`, `skills/` y `agents/` adentro), `.github/` (con
`workflows/`: `ci.yml`, `claude.yml` y `actualizar-marco.yml`), `.gitignore`,
`.gitattributes`, `.prettierrc`, `.prettierignore`, `.projects-valores.json` y
`.projects-desvios.json`. Y en la raíz, junto a `eslint.config.mjs` y
`tsconfig.base.json`, tiene que estar `vitest.config.base.mjs`: ahí viaja el
**umbral de cobertura del total** que el marco reparte, para que un paquete nuevo no
lo tenga que inventar. Un umbral que cada paquete se pone a sí mismo termina siendo el
número que la medición dio el día que se escribió: un valor con decimales —`functions: 70.6`
y parecidos— es la firma de esa forma de fijarlo, y no exige nada, porque ya está cumplido
por construcción en el momento en que se anota.

Lo que llega en `.github/workflows/ci.yml` es un **llamador delgado**: hereda del marco el
carril de docs y la validación de OpenSpec con `uses: {{ORG_MARCO}}/Projects/...@v1.7.0`, y deja el
`build-test` del producto para que este repo lo llene. La mecánica del marco NO se copia:
si se copiara, un arreglo en Projects dejaría de llegar acá.

Los otros dos workflows son scaffold porque **escriben o responden en este repo**, y eso no
se puede consumir por referencia: `claude.yml` es el bot de @claude en issues y PRs (con la
política de modelo del área ya puesta), y `actualizar-marco.yml` es el que abre solo el PR
que trae al día la porción del marco de la constitución (sección 2.5). Los dos traen su
propio encabezado explicando qué exigen del repo antes de funcionar.

`.gitattributes` llega con `* text=auto eol=lf` y **no es cosmético**: el marco compara
contenido byte a byte —el artefacto de la constitución, los fixtures de sus actions—, así
que un repo que materialice CRLF en el checkout sale rojo por un motivo que no es el suyo.

**No copies `plantilla/README.md`** (este archivo): es la guía del bootstrap. El README del
proyecto llega en `README-del-proyecto.md` y aterriza renombrado, con la estructura puesta y
los valores ya sustituidos —estructura del repo, ambientes, cómo correr en local, cómo se
verifica un cambio, quién revisa qué— y con huecos `RELLENAR` que son las respuestas que
ninguna herramienta puede inventar. Cuántos son lo dice el grep, no este párrafo: se llenan
antes del primer push con `grep -n RELLENAR README.md`.

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
| `{{ORG}}` | Org de GitHub: el handle de la organización, no un equipo dentro de ella. Se interpola en `uses: {{ORG_MARCO}}/Projects/...`, o sea en la coordenada con la que GitHub resuelve el marco | `Ejemplo-Org` |
| `{{ORG_MARCO}}` | La cuenta de GitHub donde vive **el marco**, que NO es la de tu proyecto. La herramienta la deriva sola del clon desde el que corre, así que un fork del marco produce proyectos que apuntan al fork | `im-diego-ec` | Nada: no se contesta a mano |
| `{{PAQUETES}}` | Paquetes del monorepo, lista legible | `web, api, e2e` |

### Paquetes (derivados de `{{PAQUETES}}`, uno por rol)

Los necesitan los globs de lint y la config de Dependabot: la herramienta tiene que saber
cuál paquete corre en Node y cuál en el navegador.

| Placeholder | Qué poner | Ejemplo | Si no existe |
|---|---|---|---|
| `{{PAQUETE_API}}` | Carpeta del backend | `api` | — |
| `{{PAQUETE_WEB}}` | Carpeta del frontend | `web` | Borrar los bloques `[FRONT]` de `eslint.config.mjs` y sus imports |
| `{{PAQUETE_SITIO}}` | Carpeta del sitio de contenido | `sitio` | Solo viaja cuando la forma elegida es «un sitio para leer». En las demás formas la carpeta no llega al proyecto, y este valor queda sin usar |
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

| Placeholder | Qué poner | Ejemplo |
|---|---|---|
| `{{EQUIPO_BUILDERS}}` | Slug del **equipo** de builders en la organización: el de la URL del equipo, **en minúsculas**, no su nombre para mostrar. Se usa en `CODEOWNERS` | `builders` |
| `{{EQUIPO_PO}}` | Slug del **equipo** del PO, con la misma regla. Se usa en `CODEOWNERS` | `po` |
| `{{BUILDER_1}}` | Handle de GitHub del builder que sostiene **la llave de producción**: su OK explícito es obligatorio para toda escritura en prod. **Sin la arroba**: el scaffold la pone donde va | `handle-del-builder-1` |
| `{{BUILDER_2}}` | Handle del otro builder, sin arroba (el review cruzado es simétrico entre ambos) | `handle-del-builder-2` |
| `{{PO}}` | Handle del PO, sin arroba: dueño de proposals y specs | `handle-del-po` |

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
| `{{PERFIL_DEV}}` | Nombre del perfil de la CLI para dev. **Sin espacios**: viaja dentro del patrón `Bash(AWS_PROFILE={{PERFIL_DEV}} terraform plan *)` de la allowlist de `.claude/settings.json`, donde un espacio no rompe el JSON, rompe el patrón — y una entrada de allowlist que no matchea nada no avisa | `ejemplo-dev` |
| `{{PERFIL_PROD}}` | Ídem, para producción | `ejemplo-prod` |
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
| `{{ID_MCP_SLACK}}` | ID del servidor MCP de Slack, tal como aparece en el nombre de sus tools: `mcp__<id>__slack_read_channel`. Alfanumérico y guiones, **sin guiones bajos**: uno acá corre el separador `__` y la entrada deja de matchear. Si el equipo no usa Slack, borrá esas cinco entradas de `.claude/settings.json` | `00000000-0000-0000-0000-000000000000` |

### Verificar que no quedó ninguno

```bash
grep -rnE "\{\{[A-Z0-9_]+\}\}" --exclude-dir=node_modules --exclude-dir=.git .
```

Sin salida = listo. Con salida = el scaffold está a medio llenar y el repo no está para el
primer commit.

> El patrón exige **mayúsculas entre las llaves** a propósito: un `grep "{{"` a secas marca
> también las expresiones de GitHub Actions (`${{ github.ref }}`, `${{ needs.marco.result }}`)
> que el `ci.yml` usa de forma legítima y que NO se sustituyen nunca.

Los valores de `.projects-valores.json` entran en ese mismo buscar-y-reemplazar: el archivo
llega con los placeholders como valores, así que se llena solo con el resto del árbol. Es
la única lista donde conviene revisar el resultado dos veces, porque de ahí sale el texto
de la constitución que los agentes leen todos los días.

---

## 2.5. La porción del marco de la constitución

`AGENTS.md` tiene **dos mitades y una sola es del proyecto**. Las reglas comunes del área
—OpenSpec, git y despliegue, las fronteras de tres niveles, seguridad y observabilidad,
AWS, secretos, GitHub— no se copian: llegan como **artefacto generado** y se actualizan
solas. Eso arregla el problema que este mecanismo existe para arreglar: una constitución
copiada a mano llega incompleta la primera vez y envejece a partir de ahí, y cada proyecto
termina con una versión distinta de la misma regla.

| Archivo | Qué es | Quién lo escribe |
|---|---|---|
| `.projects/AGENTS-marco.md` | La porción del marco, renderizada con los valores de este repo. Abre con un sello de una línea (comentario HTML con la versión y el `sha256` del cuerpo) | **El marco.** No se edita a mano: el CI compara el cuerpo contra ese sello —eso caza la edición a mano— y la action del marco, que tiene el texto canónico a mano, hace el diff byte a byte |
| `.projects-valores.json` | Los valores del proyecto con los que se renderiza | El proyecto, una vez, en el bootstrap |
| `.projects-desvios.json` | Los desvíos declarados: reglas del marco de las que este repo se aparta | El proyecto, cuando hace falta, con motivo escrito |
| `AGENTS.md` | Lo del proyecto: stack, ambientes, sus reglas propias. Y la línea que carga el artefacto | El proyecto |

**Las entradas viven en la raíz y no dentro de `.projects/` a propósito**: ese directorio es
del marco y es desechable —el modo escribir puede borrarlo y re-emitirlo entero—, así que
un `rm -rf .projects` seguido de un render no puede llevarse un desvío del proyecto. Todo lo
de adentro es descartable; todo lo de afuera es tuyo.

**La cadena de carga es mecánica y el CI la verifica**: `CLAUDE.md` importa `AGENTS.md`, que
importa `.projects/AGENTS-marco.md`. Si el eslabón se rompe —alguien borra la línea, o la deja
dentro de un bloque de código, donde no se resuelve— el agente trabaja sin la mitad de las
reglas y nada en la sesión lo delata. Por eso el check nombra el eslabón roto en vez de
confiar en que se note.

`.projects-valores.json` es **plano**: las claves en MAYÚSCULAS son los placeholders del
render —exactamente los que el texto canónico usa, ni uno más (uno que sobra sale como
aviso, igual que una exclusión muerta)— y `superficies` es la única clave en minúsculas.

Esa lista declara las **superficies de instrucciones** de este repo, por nombre. Llega con
las dos que el área usa hoy:

```json
{ "superficies": ["claude-code", "cursor"] }
```

`claude-code` emite `.projects/AGENTS-marco.md` y se carga por la cadena de arriba; `cursor`
emite `.cursor/rules/00-marco.mdc`, con el mismo cuerpo y un frontmatter que lo hace de
carga siempre, porque esa herramienta lee markdown plano y no expande imports. **La cadena
de cada superficie la sabe el marco**, no este repo: acá solo se declara qué superficies se
usan. Si el equipo no usa una, se la saca de la lista y deja de emitirse; lo que no se puede
es declarar cero. Y una herramienta que alguien enchufe sin declararla queda fuera: el marco
cubre lo declarado, no lo que nadie dijo.

**Generarlo la primera vez**, después del primer push:

```bash
gh workflow run actualizar-marco.yml
```

Ese workflow corre semanalmente y abre el PR con el artefacto al día, así que el camino
normal deja de ser "acordate de regenerar" y pasa a ser "aparece un PR, lo revisás y lo
mergeás". Leé su encabezado antes del primer merge: hay dos límites de GitHub —el PR nace
sin checks si no hay un token propio, y el commit de un bot no va firmado— que conviene
conocer antes de topárselos.

**Apartarse de una regla del marco, cuando hay razón para hacerlo.** No se edita el
artefacto (el CI lo ve como edición a mano) ni se escribe la regla contraria en `AGENTS.md`
(nada la reconoce como override). Se declara el desvío:

```json
{
  "desvios": [
    {
      "regla": "dev-no-contacta-usuarios",
      "motivo": "Este repo comparte la instancia de identidad entre dev y prod hasta que se aprovisione la segunda; mientras tanto las notificaciones salientes quedan apagadas por configuracion.",
      "aprobado_por": "@builder-uno",
      "fecha": "2026-08-19"
    }
  ]
}
```

El `id` de la regla lo trae el propio artefacto, en un comentario HTML pegado a cada regla
(`<!-- projects:regla id=... -->`): se lee de ahí, no se inventa. Cada entrada anula **una**
cosa: o una `regla` del canónico, o un `permiso` exacto del allowlist del agente (el caso de
la sección 3). El `motivo` es obligatorio —sin él es rojo—; `aprobado_por` y `fecha` son
para el humano que relee el desvío en la revisión trimestral, y su ausencia sale como aviso.

El desvío se imprime **pegado a la regla que anula**, dentro del mismo artefacto que los
agentes cargan: una excepción que el agente no lee produce algo peor que la regla sola —un
agente cumpliendo a rajatabla algo que el proyecto ya anuló, o leyendo una prohibición y
una autorización sin saber cuál manda. Y **caduca solo**: el día que el marco elimine esa
regla, el desvío queda huérfano y el CI falla, con el motivo que tenía escrito en el
mensaje. Un desvío que sobrevive a lo que lo justificaba tapa un agujero que ya nadie ve.

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
- **`vitest.config.base.mjs` → conectarlo desde cada paquete**. El archivo llega con el
  umbral del total del marco (80 en las cuatro métricas), el `include` que mete al cálculo
  **todo** el `src/` del paquete —también lo que ninguna prueba importó— y el `projectRoot`
  del reporter lcov en la raíz del monorepo. Lo que falta es la línea que lo importa desde la
  config de cada paquete (`import { coberturaDelMarco } from "../vitest.config.base.mjs"`).
  El umbral **no se baja**: si un paquete todavía no llega, se declara la deuda en SU
  `package.json` con `projects.cobertura.deuda = { motivo, fecha }` y el marco la reporta en
  cada corrida hasta que se paga o vence. Bajar el umbral acá tampoco serviría de atajo: la
  action `cobertura-diff` mide el total por su cuenta desde el lcov y contra el 80 del
  marco, así que el umbral local solo puede **subir** la exigencia.
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
  comandos de lectura/verificación: lint, typecheck, tests, build, `terraform validate`,
  `terraform plan` **con el perfil de dev**, `gh run watch`. Los patrones de OpenSpec llegan
  con el paquete y la versión que el marco pina (`npx --yes @fission-ai/openspec@1.9.0 ...`):
  si el pin sube, se actualizan acá también. Ojo con el nombre — `openspec` a secas en npm es
  un paquete ajeno (placeholder `0.0.0`), así que un patrón sin scope permitiría correr otra
  cosa.

  **Nada que escriba, y la asimetría es deliberada**: un permiso de más es un riesgo, uno de
  menos es fricción. Por eso no hay `terraform apply`, ni `git push`, ni `gh pr merge`. Y
  esto **ya tiene check**: el paso *Permisos del agente sin escritura* del job `higiene` lee
  la forma de cada entrada y se pone rojo con dos cosas — un **verbo que escribe** (`apply`,
  `push`, `merge`, `create-*`, `put-*`, `-X DELETE`…) y un **comodín en la posición del
  subcomando** (`Bash(terraform *)` autoriza todos los subcomandos de terraform, `apply`
  incluido). Si una de las dos es deliberada, no se agrega en silencio: se declara como
  desvío de permiso en `.projects-desvios.json`, con motivo, y el check lo absorbe de ahí y
  reimprime el motivo en cada corrida.

  Sobre el **perfil de producción**: el marco autoriza expresamente *leer* producción por
  CLI (`validate`, `plan`, `describe-*`), así que una entrada con ese perfil no es un
  hallazgo — el check la imprime como `::notice::` en cada corrida para que esté a la vista,
  y lo que sí exige es que el subcomando esté clavado. El scaffold trae solo el `plan` con
  el perfil de dev: si este proyecto quiere además el de producción, es una línea que se
  agrega a conciencia, sabiendo que va a aparecer en el log de cada corrida.

  Una forma de equivocarse que no se ve a simple vista: **un patrón que termina en `*` se
  traga los argumentos que vengan**, así que una entrada de aspecto inofensivo como
  `Bash(gh api repos/... *)` autoriza también `-X DELETE`. Lo que se autoriza es el comando
  entero, no el verbo que uno tenía en la cabeza.

  La otra es **un ejecutor sin versión exacta**, y esa tampoco depende ya de que alguien se
  acuerde: el check *Ejecutores de paquetes
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
- **`.claude/skills/` y `.claude/agents/` → nada que llenar, pero conviene saber qué son.**
  El scaffold trae dos piezas escritas a mano por el marco, que no las genera ningún CLI:
  la skill `projects-archive-change` (archivar un change de OpenSpec sin el CLI de archive, que
  en Windows dice "Specs updated successfully" y hace rollback de todo) y el subagente
  `cazador-fail-open` (auditor adversarial de caminos que terminan en verde sin haber
  verificado nada). Llevan el prefijo del marco para no chocar con las skills que **sí**
  regenera el CLI de OpenSpec en cada repo. Son scaffold: desde la copia son de este
  proyecto, y si las mejorás de una forma que le sirva a cualquiera, esa mejora sube al
  marco en la revisión trimestral de divergencia.

---

## 4. Lo que el scaffold NO trae (y de dónde sale)

| Falta | De dónde sale |
|---|---|
| `package.json`, `pnpm-workspace.yaml` | Del proyecto: dependen del stack elegido. Ver el snippet de abajo para la parte de lint/format, que sí es del marco. |
| El resto de `.github/workflows/*` (deploy, verificación, cron) | Del proyecto: dependen de su topología de infraestructura. La MECANICA del marco no se copia nunca: `ci.yml` ya la consume por `uses: ...@<versión>`. |
| Las skills y comandos **de OpenSpec** (`.claude/skills/openspec-*`, `.claude/commands/`) | **Regenerado**: los genera el CLI de OpenSpec en la versión que pina el marco. No se vendoran ni se editan a mano. Lo que sí llega en el scaffold son las dos piezas escritas a mano del marco (sección 3), que ningún CLI regenera. |
| `.projects/AGENTS-marco.md` | **Generado por el marco** en el repo nuevo: lo escribe `actualizar-marco.yml` (sección 2.5). Las entradas del render sí llegan en el scaffold. |
| `openspec/` | Lo inicializa el CLI de OpenSpec en el repo nuevo, con la versión que pina el marco: `npx --yes @fission-ai/openspec@1.9.0 init --tools claude`. **No es opcional**: el job de OpenSpec del marco hace `[ -d openspec ] \|\| exit 1`, así que sin este paso el primer PR sale rojo. La misma corrida genera las skills y comandos de la fila de arriba. Los specs del MARCO son canónicos y viven en Projects. |
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

Lo que hace que el marco se cumpla solo depende de que estos puntos queden hechos **una
vez**; después ninguno pide que alguien se acuerde de nada.

- [ ] `grep -rnE "\{\{[A-Z0-9_]+\}\}" .` sin resultados (fuera de `node_modules` y `.git`)
- [ ] `README.md` es el del PROYECTO (llegó como `README-del-proyecto.md` y se renombró) y
      `grep -n RELLENAR README.md` no devuelve nada. Es lo único que GitHub renderiza en la
      portada del repositorio, así que es lo primero que lee quien llega — y un README con
      los rótulos del scaffold todavía puestos no pone nada en rojo: se lee como si el
      proyecto no tuviera la respuesta
- [ ] Tabla de stack de `AGENTS.md` llena y sección "🕳️ Antes del primer commit" borrada
- [ ] `.projects-valores.json` con los valores reales y las superficies que el equipo usa. De
      ahí sale el texto de la constitución que los agentes cargan todos los días: es la
      única sustitución que conviene releer
- [ ] `openspec/` inicializado con el CLI en la versión que pina el marco (sección 4). Sin
      esto el primer PR sale rojo: el marco exige que las specs vivan en el repo
- [ ] `.projects/AGENTS-marco.md` existe y `AGENTS.md` sigue teniendo la línea que lo importa,
      fuera de todo bloque de código. El CI lo verifica: primero avisando, después en rojo.
      **Generalo en LOCAL**, que tarda un segundo y no pide ningún permiso:
      `CONSTITUCION_MODO=escribir node <clon-del-marco>/actions/constitucion/constitucion.mjs`
      desde la raíz de este repo. El `gh workflow run actualizar-marco.yml` hace lo mismo
      por PR y de forma recurrente, pero exige que la organización tenga habilitado *Allow
      GitHub Actions to create and approve pull requests*: al 2026-08-21 está **apagado**, y
      con eso apagado ese camino devuelve **403** con un error que no nombra el permiso. Que
      el workflow quede cableado sigue siendo lo que hace que el artefacto no dependa de que
      alguien se acuerde — pero el primer commit no tiene que esperarlo
- [ ] Secret `CLAUDE_CODE_OAUTH_TOKEN` cargado y la GitHub App de Claude instalada sobre el
      repo, si el equipo quiere el bot de `@claude` en issues y PRs. Sin los dos,
      `claude.yml` falla a propósito cuando alguien lo menciona, en vez de dejar la mención
      sin respuesta
- [ ] `pnpm lint` y `pnpm format:check` corren y pasan en el repo vacío
- [ ] La config de cobertura de cada paquete importa `coberturaDelMarco` de
      `vitest.config.base.mjs`. Sin esa línea el paquete no tiene umbral de total propio, y
      el primer PR que lo deje por debajo de 80 se enterará por el rojo del marco en vez de
      por su propia suite local
- [ ] Cada paquete declara `typecheck`, `test` y `build` (o su excepción está escrita con el
      motivo en `EXCEPCIONES` del `ci.yml`). No hace falta acordarse: el CI lo exige y falla
      nombrando el `package.json` incompleto
- [ ] `.github/workflows/ci.yml`: el job `build_test` refleja el stack real y el job `marco`
      apunta a `<org>/Projects/.github/workflows/marco-ci.yml@<versión exacta>` (nunca
        `@v1`: un tag móvil no produce PR de Dependabot, y sin ese PR este repo no
        aparece en el censo de consumidores del marco)
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
