# Projects — el marco de ingeniería de Transformación Digital y Data

**Qué es, sin jerga.** Projects es el conjunto de reglas de trabajo del área
convertidas en verificaciones que corren solas: cada vez que alguien propone un
cambio, el sistema comprueba que cumpla lo que el equipo ya prometió, y si no lo
cumple no lo deja entrar. No decide **qué** software se construye —eso es del
negocio—; decide **cómo** se construye, cómo se revisa y cómo se entrega. **Para quién es esta página.** Para el equipo entero, y sobre todo para quien
llega al repositorio y no sabe qué es: la tabla de más abajo reparte el camino
según quién sos. **Es una página técnica de punta a punta.** Si no sos técnico,
entrá por [`docs/01-introduccion.md`](docs/01-introduccion.md)
—qué es esto y por qué— o por
[`docs/04-arrancar-acompanado.md`](docs/04-arrancar-acompanado.md) —qué
comando copiar y qué vas a ver en pantalla—.

**Palabras propias de acá**, cada una definida en una línea en el
[glosario](docs/02-glosario.md): [ADR](docs/02-glosario.md),
[andamio](docs/02-glosario.md), [archive](docs/02-glosario.md),
[builder](docs/02-glosario.md), [bump](docs/02-glosario.md),
[canónico](docs/02-glosario.md), [capability](docs/02-glosario.md),
[carril](docs/02-glosario.md), [censo](docs/02-glosario.md),
[change](docs/02-glosario.md), [ci-ok](docs/02-glosario.md),
[CODEOWNERS](docs/02-glosario.md), [compuerta](docs/02-glosario.md),
[constitución](docs/02-glosario.md), [delta](docs/02-glosario.md),
[estreno](docs/02-glosario.md), [fail-open](docs/02-glosario.md),
[guardrail](docs/02-glosario.md), [marcador](docs/02-glosario.md),
[monorepo](docs/02-glosario.md), [PO](docs/02-glosario.md), [pin](docs/02-glosario.md),
[referenciado](docs/02-glosario.md), [regenerado](docs/02-glosario.md),
[reusable](docs/02-glosario.md), [ruleset](docs/02-glosario.md),
[scaffold](docs/02-glosario.md), [spec](docs/02-glosario.md),
[veredicto agregado](docs/02-glosario.md).

| Qué te da | Qué te exige |
|---|---|
| El pipeline de CI/CD ya escrito y probado: lo llamás, no lo copiás, y sus arreglos te llegan como pull request | Que **no lo edites desde tu repo**: si te falta algo, o es un parámetro del workflow o es una propuesta de cambio acá |
| Un repositorio nuevo completo en un comando: gobernanza, constitución, plantillas y CI ya conectado | Que **decidas los valores** del proyecto (cuentas, dominios, equipos) y toques GitHub a mano — eso no es transcripción |
| Guardrails que atrapan errores que ya costaron caro una vez, cada uno con su incidente y su fecha | Que el comportamiento se escriba como **contrato** (`openspec/`) antes de implementarlo, y que lo apruebe quien es dueño del qué |
| Una versión exacta y estable: nada cambia bajo tus pies | Que te mantengas **pineado a una versión** (`@vX.Y.Z`) y aceptes los bumps que llegan por pull request |

**Por dónde sigo, según quién soy:**

| Si sos… | Empezá por | Qué vas a encontrar |
|---|---|---|
| **Alguien que no es técnico** — un BA, un PO que recién llega, quien tenga que decidir si esto se adopta | [`docs/01-introduccion.md`](docs/01-introduccion.md) | Qué es esto en castellano llano, qué te da y qué te exige, cuánto cuesta, qué decisiones te va a pedir a vos y qué pasa si el equipo es una sola persona |
| **Alguien que no es técnico y tiene que arrancarlo igual** | [`docs/04-arrancar-acompanado.md`](docs/04-arrancar-acompanado.md) | El «hacelo conmigo»: qué comando copiar, **qué vas a ver en pantalla**, cómo saber que salió bien, cuánto tarda cada paso, las cuentas que hay que abrir con sus límites gratuitos medidos, y los rojos que son esperados |
| **El PO** — dueño del qué y el por qué | [`docs/06-para-el-po.md`](docs/06-para-el-po.md) | Una página sin código: qué rutas aprobás, cómo se lee un spec real línea por línea, y las cuatro preguntas con las que se devuelve una propuesta |
| **Un builder nuevo en el equipo** | [`docs/10-reglas-no-escritas.md`](docs/10-reglas-no-escritas.md), y después [`AGENTS.md`](AGENTS.md) | Cómo se trabaja acá, qué regla está automatizada y cuál todavía depende de una persona — declarado, no supuesto |
| **Un builder arrancando un proyecto** | [`docs/05-arrancar-tecnico.md`](docs/05-arrancar-tecnico.md) | De no tener repositorio a `ci-ok` en verde, con los fallos silenciosos del día 1 |
| **Alguien con un incidente en curso** | El runbook del proyecto, en **su** repo | Acá no hay recursos concretos; lo que vive acá es la plantilla con la que ese runbook se escribió ([`docs/plantillas/runbook.md`](docs/plantillas/runbook.md)) |

El resto de esta página es el detalle: por qué existe cada pieza, cómo se
distribuye y cómo se consume.

---

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
incidente documentado**, y cada uno se puede leer como lo que enseñó y lo que
quedó construido:

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
| **Referenciado** | Workflows reusables y composite actions: la mecánica de CI/CD que no debe divergir | `.github/workflows/`, `actions/` | `uses: im-diego-ec/Projects/.github/workflows/marco-ci.yml@vX.Y.Z`, **por versión exacta** | Por **PR de Dependabot** en el repo del proyecto. Un check nuevo aparece en rojo DENTRO de ese PR, que es donde se puede leer antes de mergear |
| **Scaffold** | Plantilla de arranque: constitución, gobernanza, configuración, plantillas de docs | `plantilla/` | Se copia **una vez** al crear el repo y se sustituyen sus placeholders | No se actualiza solo. A partir de la copia es del proyecto; la divergencia se revisa cada trimestre |
| **Canónico** | Los specs del marco (OpenSpec): el comportamiento que Projects garantiza | `openspec/specs/` | **No se copia.** El proyecto lee acá; sus specs describen SU dominio | Change de OpenSpec en este repo, con aprobación del PO |
| **Regenerado** | Skills y comandos del CLI de OpenSpec, **y la porción del marco de la constitución** (`.projects/AGENTS-marco.md` y su render para Cursor) | El pin del CLI (el default del input `version_openspec`); el texto de la constitución, en `actions/constitucion/canonico/` | Cada repo los regenera: las skills con el CLI pinado, la constitución con `actions/constitucion` en modo escribir | Subiendo el pin acá y regenerando en cada repo. El check del marco avisa cuando el artefacto quedó atrás |

Por qué las skills **no** se vendoran: cada `SKILL.md` que genera el CLI trae
`generatedBy: "<versión>"` en su cabecera. Un repo puede quedarse con skills
generadas por una versión mientras su CI valida con otra — copiarlas al marco
congelaría esa divergencia para todos los proyectos a la vez. El marco
pina la versión; la herramienta genera.

> **Gotcha operativo:** para que un repo privado pueda hacer `uses:` de este,
> Projects necesita **Settings → Actions → General → Access = "Accessible from
> repositories in the organization"**. Sin eso, el consumidor falla con un
> error de repositorio no encontrado que parece un typo en la ruta. La
> organización está en plan GitHub Team, que sí soporta compartir Actions entre
> repos privados.

---

## Cómo lo consume un proyecto NUEVO

El proyecto nace **dentro** del marco: el scaffold se instancia antes del primer
commit de código. **Lo mecánico lo hace `projects init`**; lo que queda es decidir
valores y tocar GitHub, que son actos humanos.

```bash
# 0. El clon del marco, UNA vez. Va por `gh` y no por `git clone` de una URL:
#    este repo es privado, y el HTTPS anónimo contesta 404 —indistinguible de un
#    typo en la ruta— o se para a pedir credenciales. `gh` usa la sesión que ya
#    tenés. Anotá dónde quedó: <ruta-al-clon> es esa ruta.
gh repo clone im-diego-ec/Projects

# 1. El esqueleto de valores, con una clave por decisión
node <ruta-al-clon>/herramientas/projects-init.mjs --ejemplo > valores.json

# 2. Llenarlo (qué va en cada uno: plantilla/README.md sección 2)

# 3. Instanciar, desde la raíz del repo nuevo
node <ruta-al-clon>/herramientas/projects-init.mjs --valores valores.json --destino .
```

El clon **no va a `/tmp`**: ese directorio no existe en Windows nativo, y el clon
te sirve para todos los proyectos, no para uno. El paso a paso completo —con gemelo
en PowerShell **en los bloques donde el comando no es el mismo en las dos shells**,
que son los menos: `git`, `node`, `pnpm`, `npx` y `gh` corren igual en los tres
sistemas— está en [`docs/05-arrancar-tecnico.md`](docs/05-arrancar-tecnico.md).

Eso copia **el andamio entero** —dotfiles incluidos, que es donde falla el copiado
a mano— sustituye **todas** las ocurrencias de sus marcadores, corre
`openspec init` con el pin del marco y renderiza la porción del marco de la
constitución. **Falla cerrado**: un valor que falta, un marcador que sobrevive o un
destino que ya tiene andamio abortan sin escribir nada, con el nombre de lo que
falta. Y verifica lo que hizo releyendo el árbol, no confiando en su propio
resultado.

> **Cuántos archivos y cuántas ocurrencias, exactamente: se mide, no se escribe
> acá.** Este README llegó a decir «copia los 22 archivos» y «sustituye las 89
> ocurrencias» mientras el encabezado de la herramienta decía `23/122` para el mismo
> acto, y las dos cifras estaban mal. No es descuido de nadie: **crecen con cada
> archivo que entra a `plantilla/`**, y un número escrito a mano al lado de algo que
> crece es exactamente la clase de dato que este repo existe para no mantener a
> mano. Comprobado midiendo dos veces el mismo día con un archivo nuevo en el medio:
> la cifra se movió entre las dos.
>
> El comando que la produce —con las **mismas piezas** que usa la herramienta, así
> que mide lo que la corrida hace y no una aproximación con `grep`— está entero en el
> encabezado de [`herramientas/projects-init.mjs`](herramientas/projects-init.mjs),
> bajo *ESOS CUATRO NUMEROS SE MIDEN*. Y una corrida real lo dice sola en su primera
> línea, con la forma `escritos N archivos, M ocurrencias sustituidas`.
>
> Lo que sí está fijo y sí se escribe es **23 marcadores**: es el largo de la lista
> `REQUERIDOS` de la herramienta, y esa lista no crece al agregar un archivo — crece
> sólo cuando se agrega una **decisión**, que es un acto deliberado y con PR. Quien la
> sostiene es un banco del marco, `pruebas/andamio/tabla-de-valores.test.mjs`: se pone
> rojo si `plantilla/.projects-valores.json` deja de declarar uno de ellos, y rojo si
> la tabla de `plantilla/README.md` se queda sin la fila de uno. Medido borrando
> `ID_MCP_SLACK` del registro del andamio: el caso `registro · el andamio declara los
> valores en su .projects-valores.json` falla nombrando la clave.
>
> **Y conviene saber qué NO hace `projects init` con esa cifra, porque es fácil
> suponerlo de más.** El desfase del andamio no lo mira: sobre el destino ya escrito lo
> reporta como `::warning::` y sale **0** (medido, con la forma `guarda N de los M valores`,
> `EXIT=0`, el andamio entero copiado igual). Lo que sí lo pone rojo es el otro lado
> —un marcador del andamio que el archivo de valores no declara— y ahí es `::error::`
> con `EXIT=1`, pero **después** de la copia, no antes: esa corrida igual arranca
> imprimiendo `escritos N archivos` y el destino queda con esos N. El motivo de las dos
> decisiones está en el JSDoc de `clavesQueElRegistroNoDeclara`, y no es un descuido: un
> andamio mínimo sin registro es un caso legítimo.
>
> Las otras dos cifras —archivos y ocurrencias— hoy no las sostiene nadie, y lo que
> falta para que envejecer sea rojo es un caso en `pruebas/init/projects-init.test.mjs`
> que recompute los cuatro números y falle nombrando los lugares a actualizar.

Lo que **no** hace, porque no es transcripción:

1. **Crear el repo vacío** en la organización.
2. **Decidir los valores.** Los 21 que la herramienta pide salen de la tabla de
   `plantilla/README.md` sección 2, con ejemplo y caso borde cada uno (el 22.º,
   `{{PAQUETES}}`, **no se pregunta**: se deriva de los tres paquetes). Tres tienen
   un camino "si no existe" que exige borrar bloques a mano: la herramienta los
   **nombra al final** en vez de adivinar el borrado.
3. **Cargar `vars` y `secrets`** del repo en GitHub Actions: todo lo que el
   pipeline consume en runtime (URLs de sondas, ARNs, log groups, tokens) va
   ahí, nunca hardcodeado en el scaffold.
7. **Aplicar la protección de `main`** como acto humano deliberado, con el
   veredicto agregado de CI (`ci-ok`) como único check requerido, y
   documentarla en el repo con su estado real.
8. **Dejar el canal del marco abierto**, que es el paso que nadie extraña porque
   su falta no produce ningún rojo: darle a **Dependabot acceso al repo privado**
   del marco, y en `.github/dependabot.yml` dejar el marco en **su propio grupo**
   (el andamio ya viene así). Sin lo primero no hay PRs de bump; con el marco
   dentro del grupo `*`, un PR trabado por cualquier otra action deja de
   proponerlos. En los dos casos el repo simplemente **no recibe versiones nuevas
   y no aparece en el censo de consumidores**, sin avisar.

> **La tabla de valores**, con qué poner, ejemplo y caso borde de cada uno,
> vive en **[`plantilla/README.md`](plantilla/README.md)** sección 2. Ese archivo es
> la fuente de verdad de los valores y manda sobre este resumen; también documenta
> el camino **manual**, que sigue siendo válido y es el fallback si `projects init`
> falla.
>
> **Y no hace falta llenarla a mano.** `projects init --asistente` hace entre 9 y 17
> preguntas en castellano —depende de lo que contestes— y deriva los 23 valores de
> las respuestas: no pide un id de cuenta de AWS a quien no eligió AWS. Produce este
> mismo archivo y lo valida con el mismo `validarValores`, así que no son dos caminos
> que puedan divergir: es un generador y una puerta. El paso a paso está en
> [`docs/04-arrancar-acompanado.md`](docs/04-arrancar-acompanado.md).

> **`projects init` se estrenó el 2026-08-22 como piloto acotado**, con el camino manual
> intacto al lado. Es superficie nueva del marco: lo que le corresponde es un change
> de OpenSpec con el gate del PO, y entra como el primer change del proyecto que la
> usa. Hasta entonces, si hace algo raro, el camino manual es el que manda.

El `ci.yml` que el scaffold trae ya apunta a la **versión exacta** del marco y es
lo único de CI que se copia: un llamador delgado. El proyecto nace consumiendo la
mecánica del marco por referencia, no con una copia que se va a quedar vieja.

> **Nunca `@v1` en el repo de un proyecto.** El tag existe, pero solo para una línea
> interna del marco (ver `AGENTS.md`). Para un consumidor es una trampa: Dependabot no
> propone bump para un tag mayor —para él ya es la mayor vigente—, así que un repo pinado
> así no recibe versiones nuevas por PR y **no aparece en el censo de consumidores**. Es
> el modo de falla más callado de todo el bootstrap.

## Cómo lo consume un proyecto EXISTENTE

Sin big bang: se adopta por partes, empezando por lo referenciado.

1. **Apuntar los jobs de marco a la versión exacta** (`@vX.Y.Z`, nunca `@v1`). El `ci.yml` del proyecto deja de
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
       # La version exacta, no el tag mayor: un tag movil no produce PR de
       # Dependabot (para el ya es la mayor vigente), asi que el repo no
       # recibiria versiones nuevas ni apareceria en el censo.
       # vX.Y.Z es un marcador a proposito: la version vigente la pina el
       # andamio en plantilla/.github/workflows/ci.yml, y un numero escrito
       # aca envejeceria sin que nada lo mida.
       uses: im-diego-ec/Projects/.github/workflows/marco-ci.yml@vX.Y.Z

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

   ⚠️ **`Projects` va con mayúscula, y en este archivo eso no lo sostiene ningún
   check.** GitHub resuelve el `uses:` sin distinguir mayúsculas, así que la
   ortografía mala **funciona** y no hay rojo que la denuncie; lo que se rompe son
   los escaneos que el marco construye alrededor de ese slug, que van por texto —ya
   se rompieron dos veces por eso, y una guarda que no encuentra la línea que viene a
   auditar sale verde por construcción. El banco que vigila la ortografía
   (`pruebas/andamio/lo-que-viaja-al-proyecto.test.mjs`, bloque 4) recorre
   `archivosDelAndamio()`, o sea **sólo `plantilla/`**: comprobado bajando a minúscula
   las tres apariciones de este README sobre una copia, el banco completo sale verde
   igual. Lo que falta es extender ese bloque a la prosa del repo, con esta forma —el
   `[p]` entre corchetes evita que el comando se encuentre a sí mismo:

   ```bash
   grep -rn 'im-diego-ec/[p]rojects' --include='*.md' .
   ```

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
   caro de la migración, y ya se cometió una vez: un ruleset vivió una semana
   pidiendo el check equivocado.

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

**La tabla es la lista COMPLETA de los 21, y eso es una frontera 🛑 de
[AGENTS.md](AGENTS.md)** («Dejar `{{PLACEHOLDER}}` sin documentar en el README»).
Que esté completa se comprueba con un comando, y hasta que un caso de banco lo corra
solo, la única defensa es correrlo:

```bash
diff <(grep -rhoE '\{\{[A-Z0-9_]+\}\}' plantilla --exclude=README.md | sort -u) \
     <(grep -oE '^\| `\{\{[A-Z0-9_]+\}\}`' README.md | grep -oE '\{\{[A-Z0-9_]+\}\}' | sort -u)
```

Hoy no imprime nada. El caso que falta vive en `pruebas/andamio/manifiestos.test.mjs`
y compara `REQUERIDOS` de `herramientas/projects-init.mjs` contra esta tabla **y** la
de `plantilla/README.md`.

| Placeholder | Qué es | Ejemplo |
|---|---|---|
| `{{PROYECTO}}` | Nombre del proyecto y del repo | `people-agenda` |
| `{{ORG}}` | Organización de GitHub: el handle de la org, no un equipo dentro de ella. Se interpola en `uses: {{ORG}}/Projects/...` | `Ejemplo-Org` |
| `{{PAQUETE_API}}` | Carpeta del paquete de backend en el monorepo | `api` |
| `{{PAQUETE_WEB}}` | Carpeta del paquete de frontend. Si el proyecto no tiene frontend, el valor se pide igual y quedan los bloques `[FRONT]` de `eslint.config.mjs` **y sus imports**, que hay que borrar a mano | `web` |
| `{{PAQUETE_E2E}}` | Carpeta de la suite end-to-end. Sin suite E2E, hay que borrar esa entrada del glob de Node **y** las dos excepciones de `ci.yml` | `e2e` |
| `{{GENERAR_CLIENTE_DATOS}}` | El comando que genera el cliente de la capa de datos, que el CI corre antes de compilar. Si el proyecto no genera ninguno, borrar el paso de `.github/workflows/ci.yml` **no alcanza**: el mismo valor viaja al script `datos` de `package.json` y al `build` de `api/package.json`, donde sin comando queda un `&&` colgando. `grep -rn GENERAR_CLIENTE_DATOS plantilla/` los enumera todos | `prisma generate` |
| `{{EQUIPO_BUILDERS}}` | Slug del equipo de builders en la org (va en `CODEOWNERS`) | `builders` |
| `{{EQUIPO_PO}}` | Slug del equipo del PO (va en `CODEOWNERS`) | `po` |
| `{{BUILDER_1}}` | Handle del builder que sostiene la llave de producción | `@builder-uno` |
| `{{BUILDER_2}}` | Handle del otro builder (el review cruzado es simétrico) | `@builder-dos` |
| `{{PO}}` | Handle del Product Owner | `@po-del-area` |
| `{{CUENTA_DEV}}` | Cuenta AWS de dev | `111111111111` |
| `{{CUENTA_PROD}}` | Cuenta AWS de producción | `222222222222` |
| `{{REGION}}` | Región AWS | `us-east-1` |
| `{{PERFIL_DEV}}` | Perfil local de la CLI para dev | `ejemplo-dev` |
| `{{PERFIL_PROD}}` | Perfil local de la CLI para producción | `ejemplo-prod` |
| `{{DOMINIO_DEV}}` | Dominio del ambiente dev | `agenda-dev.ejemplo.com` |
| `{{DOMINIO_PROD}}` | Dominio de producción | `agenda.ejemplo.com` |
| `{{CANAL_ALERTAS}}` | Canal donde suenan las alarmas | `#alertas-prod` |
| `{{ID_MCP_SLACK}}` | ⚠️ Cómo **tu cliente local** nombra al servidor MCP de Slack, sin el prefijo `mcp__`. No se genera ni se pide a nadie: se copia de un repo que ya funciona. Con el valor mal, cinco entradas del allowlist no matchean nada y **ningún check lo detecta** — un UUID de ceros no es un marcador sin resolver | `00000000-0000-0000-0000-000000000000` |
| `{{PREFIJO_RECURSOS}}` | Prefijo de recursos AWS y raíz de las rutas de SSM (`/<prefijo>/<env>/<NOMBRE>`) | `agenda` |

**Y uno que el andamio usa y la herramienta NO pregunta:** `{{PAQUETES}}`, la lista
del monorepo (`web, api, e2e`), que se **deriva** de los tres paquetes de arriba. Una
lista escrita aparte de sus elementos es una segunda declaración que puede divergir,
así que no está en `valores.json` — quien llene el archivo buscando una clave
`PAQUETES` está buscando una que no existe. La tabla operativa completa, esa que se
sigue mientras se hace el bootstrap, con caso borde de cada valor, vive en
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
│   └── workflows/         # REFERENCIADO: marco-ci.yml (el reusable que consumen los proyectos)
│                          #   + ci.yml (el CI propio, dogfooding) + aviso-version.yml (avisa cada
│                          #   release a los consumidores) + claude.yml (el bot @claude, acotado)
├── actions/               # REFERENCIADO: composite actions (una carpeta por action, con su action.yml)
│   └── README.md          #   catálogo: qué hace cada una, inputs/outputs y permisos mínimos
├── plantilla/             # SCAFFOLD: el árbol que se copia UNA vez al crear un proyecto,
│                          #   con su propio README como guía del bootstrap y un
│                          #   .github/workflows/ci.yml que ya llama al marco por versión exacta
├── herramientas/          # projects-init.mjs: instancia el andamio en un repo nuevo en un comando
│                          #   (copia + marcadores + openspec init + render de la constitucion)
├── pruebas/                # el banco de los pasos INLINE de marco-ci.yml y del pinado del andamio:
│                          #   ese código no puede salir de su bloque `run:` (cuando un consumidor
│                          #   llama al reusable, el árbol checkouteado es el DEL CONSUMIDOR), así
│                          #   que se prueba leyendo el YAML y corriendo el script contra fixtures
├── .claude/                # skills del marco (projects-adoptar, projects-release, projects-archive-change,
│                          #   projects-validar-consumidor) + el subagente cazador-fail-open
├── openspec/              # CANÓNICO: el contrato del marco
│   ├── config.yaml        #   contexto y reglas de OpenSpec para este repo
│   ├── specs/             #   los specs vivos del marco (una carpeta por capability)
│   └── changes/           #   los changes en vuelo (`openspec list`) y su historia en changes/archive/
└── docs/                  # el porqué: ADRs, reglas no escritas, el stack declarado capa por capa
                           #   (03-stack.md), la puerta de entrada para quien no es técnico, upgrade
                           #   del CLI, cómo forkear el marco a otra cuenta, y plantillas de
                           #   documentos de proceso. El índice completo: docs/README.md
```

El mapa de arriba nombra las carpetas; **[`docs/README.md`](docs/README.md) es el
índice de la documentación**, con qué es cada documento y cómo evoluciona cada uno.

Las cuatro formas de distribución no son una metáfora: son carpetas. Si al
agregar una pieza no sabés en cuál va, la pregunta correcta es cómo tiene que
evolucionar.

Las capabilities de `openspec/specs/` son las del **marco**, no las de ningún
producto: calidad de código, gobierno de la contribución, despliegue y CI,
pipeline de entrega, verificación de lo desplegado, observabilidad, gestión de
secretos y operación de la infraestructura. Un proyecto no las copia: sus specs
describen su dominio, y estas describen el carril por el que ese dominio viaja.

---

## Qué NO es Projects

- **No es una librería de código de aplicación.** Acá no vive lógica que se
  importe en tiempo de ejecución: ni componentes, ni helpers, ni clientes de
  API, ni utilidades compartidas. Projects gobierna **cómo se construye y se
  entrega** el software, no qué hace el software. Un paquete compartido de
  código sería otro repo, con otro ciclo de vida.
- **No fija dónde corre tu proyecto — fija el carril por el que viaja.** La
  distinción importa y este README la tenía mal hasta el 2026-08-21, cuando
  Builder 1 lo señaló; la corrección de ese día enumeró lo fijado y, de paso,
  metió una topología concreta de infraestructura como «primera opción». Eso
  último se retiró: **dónde se despliega es la decisión con más impacto en el
  costo, y es del proyecto**.
  **Lo que el marco FIJA**, y no es elección de nadie: el **flujo de
  especificación** (el contrato se escribe y se aprueba antes que el código), el
  **pipeline** (workflows reusables con un veredicto agregado único), la
  **gobernanza del repositorio** (propiedad por rutas, protección de `main`,
  plantilla de PR, CHANGELOG obligatorio) y los **guardrails**, cada uno con su
  incidente detrás. Todo eso son **propiedades**: se cumplen desplegando en
  cualquier proveedor, y por eso los specs de `openspec/specs/` no nombran
  ninguno.
  **Lo que el andamio congela**, en la tabla de `plantilla/AGENTS.md` —el
  archivo que el proyecto hereda—: **pnpm con workspaces** como gestor del
  monorepo, **Zod** para validar todo input externo, y el resto de esa tabla
  (React, Express, Prisma, Vitest y el proveedor de identidad). Apartarse de
  una de esas filas se pregunta **antes** de implementar y queda escrito con su
  motivo.
  **Lo que el proyecto elige**: la plataforma donde despliega —la única fila de
  esa tabla que es suya— y su dominio entero.
  La tabla capa por capa —qué fija el marco, qué trae el andamio, qué elige el
  proyecto, y en qué archivo vive la versión de cada pieza— está en
  [`docs/03-stack.md`](docs/03-stack.md), que no escribe un solo número: los deriva de
  los manifiestos y tiene un banco de pruebas detrás.
- **No es un sustituto del criterio del equipo.** Los guardrails atrapan lo que
  ya nos pasó. Lo que no nos pasó todavía lo caza una revisión adversarial: ya
  hubo un change que pasó `validate --strict` **y** el guardrail de deltas en
  verde y aun así tenía dos bloqueantes de contrato. Herramientas
  verdes no bastan para specs que cambian contrato.
- **No es un repo donde se hacen parches de proyecto.** Nadie edita Projects para
  destrabar un proyecto: se parametriza o se propone un change.
