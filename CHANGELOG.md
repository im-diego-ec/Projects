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

**El alcance de la verificación deja de declararse y pasa a derivarse, y el
código nuevo llega con pruebas.** Dos composite actions nuevas más dos checks
estáticos que cierran huecos donde el marco afirmaba algo y nada lo verificaba.

Todo es **MINOR** por semver, pero hay una acción obligatoria del lado del
consumidor: sin cablear el paso del censo, el check de cableado da rojo. Ver
*Para consumidores*.

### Añadido

- **`actions/censo-fuentes`** — deriva el alcance real de la verificación de
  calidad y falla si un archivo fuente versionado queda fuera de él. Resta el
  universo de `git ls-files` menos lo que enumera el analizador estático del
  repo, menos lo que lista el compilador de cada `tsconfig` que declara sus
  entradas, menos las exclusiones declaradas con motivo. Lo que sobra es rojo,
  con el archivo nombrado y las tres salidas concretas para cubrirlo.

  La propiedad es por **archivo**, no por paquete, y esa es toda la diferencia:
  los dos agujeros que motivaron la pieza vivían dentro de paquetes
  correctamente configurados, así que cualquier check que pregunte si el
  *paquete* está configurado los declara sanos.

  **Frontera nueva y declarada:** hasta hoy el marco solo *leía* archivos del
  consumidor; el censo *ejecuta* su toolchain para preguntarle qué archivos ve.
  Por eso el paso va después del install, y por eso sin dependencias instaladas
  emite un `::warning::` ruidoso en vez de pasar en verde.

- **`actions/cobertura-diff`** — mide qué proporción de las líneas que el pull
  request agrega o modifica ejercitan las pruebas, cruzando los reportes `lcov`
  del repo con el diff. Mínimo del marco: 80% sobre las líneas del cambio.

  El núcleo no es el porcentaje, es qué pasa cuando no hay datos: si ninguna
  ruta `SF:` de los reportes corresponde a un archivo versionado, es **rojo
  ruidoso** con el arreglo escrito. La herramienta externa candidata, en esa
  misma situación, no encuentra líneas que medir, reporta cobertura total y sale
  con éxito — o sea que cablearla mal deja el gate abierto. Por eso el
  comparador es propio.

  «No hay datos» es rojo en las **cuatro** formas en que aparece, no solo en la
  más visible: ninguna ruta `SF:` versionada; un archivo **fuente** del cambio
  que ningún reporte reclama (qué es fuente sale de la lista de extensiones del
  censo, no de las que casualmente traen los reportes); un reporte que reclama
  el archivo pero no llega hasta donde el cambio escribió (`lcov` rancio: cache
  de CI, suite no recorrida); y una ruta `SF:` que corresponde a dos archivos
  versionados en un monorepo sin `projectRoot`. La válvula de escape legítima es
  la exclusión declarada con motivo en `projects.cobertura.excluidos`, la misma
  mecánica del censo.

  El porcentaje **nunca** se publica solo: la salida `lineas_fuera_de_medicion`
  dice cuántas líneas fuente quedaron fuera del denominador, porque una línea
  cubierta y cincuenta sin dato dan "100.00" sobre una cobertura real del 2%. Y
  un `minimo` por debajo del 80 del marco pasa, pero con un `::warning::` que
  dice cuál es el del marco: bajarlo es decisión del consumidor, y es visible.

- **Dos checks estáticos nuevos en el job `higiene` del workflow reusable.**
  Llegan solos a todo consumidor de `@v1`, sin nada que copiar del otro lado, y
  son independientes entre sí: un repo con los dos problemas los ve **los dos en
  la misma corrida**.

  1. **Scripts de verificación sin enmascaramiento.** Lee los `package.json`
     rastreados y marca en rojo todo script cuyo cuerpo termine en un sufijo que
     convierta un fallo en éxito. Un script que convierte un rojo en verde es,
     por construcción, invisible para todo lo que dependa de su código de salida
     —incluido el pipeline—, así que la única forma de atraparlo es examinarlo,
     no ejecutarlo. Un manifiesto que no parsea también es rojo: no se pudo
     leer, así que no se pudo verificar.
  2. **Censo de fuentes cableado.** Comprueba que algún flujo de
     `.github/workflows/` invoque `actions/censo-fuentes`. Sin ese paso, la
     derivación del alcance queda declarada pero apagada, y un archivo que
     ninguna herramienta mira no produce rojo en ningún lado. El fallo trae el
     paso listo para pegar.

- **Banco de pruebas de las composite actions en el CI de Projects** (job
  `pruebas-actions`). Es interno: ningún consumidor lo ve ni lo hereda.
  No es una buena práctica opcional — es la **única evidencia posible**. El
  marco no puede dogfoodear estos checks porque no tiene manifiestos de paquete
  propios, así que sobre este repo el censo no verifica nada (el mismo límite
  declarado que el check de marcadores del scaffold). La diferencia con todo lo
  publicado hasta ahora es que estas piezas traen **código no trivial**: sin el
  banco, ese código llegaría a todos los consumidores sin haberse ejecutado
  nunca sobre un caso controlado.

  El job deriva del árbol qué corre: una action nueva con pruebas queda cubierta
  sin tocar el workflow, cero bancos encontrados es rojo, y una action con script
  propio sin banco sale con un `::warning::` que la nombra.

### Cambiado

- **El scaffold deja de barrer el monorepo con `pnpm -r`.** Ese recorrido
  **saltea en silencio** los paquetes que no declaran el script y sale 0: en el
  consumidor real, la suite E2E nunca tuvo `typecheck` y el CI estuvo verde todo
  ese tiempo. En su lugar el `ci.yml` de la plantilla **deriva** de pnpm la lista
  de paquetes, comprueba contra cada manifiesto que el script esté declarado, y
  después lo corre parado **dentro** de cada paquete —la única forma que
  efectivamente falla cuando el script no existe—. La lista de paquetes no
  existe: un paquete nuevo queda cubierto sin que nadie agregue nada. Lo único
  escrito a mano son las **excepciones**, con su motivo al lado.

  Se descartó enumerar por filtro de paquete porque **también falla abierto**, y
  encima depende de la versión: con el script ausente, el mismo comando sale
  **0** en pnpm 9.15 y **1** en pnpm 11.18. Una garantía que cambia con un bump
  de herramienta no es garantía.

- **Placeholder nuevo del scaffold: `{{GENERAR_CLIENTE_DATOS}}`**, documentado en
  `plantilla/README.md` con su fila de qué hacer si el proyecto no lo necesita.
  El paso que genera el cliente de la capa de datos va entre el install y el
  lint: sin él, el código de acceso a datos vuelve a ser `any` silencioso y el
  lint pasa en verde sin haber verificado nada. Lleva `--fail-if-no-match`,
  porque sin esa bandera renombrar el paquete apaga la generación en silencio
  con salida 0.

- **El snippet del `package.json` raíz de `plantilla/README.md` ya no trae los
  agregadores `build` y `test`**: repartían el mismo defecto de `pnpm -r` a cada
  proyecto para uso local, y `pnpm test` en la raíz además disparaba la suite
  E2E completa.

Los tres puntos anteriores son **scaffold**: se copian una vez y quedan en el
proyecto. No alcanzan a los repos ya creados, que se ponen al día por su propio
change.

### Corregido — diez fail-open, encontrados por una auditoría adversarial

Antes de publicarse, las dos piezas pasaron por un crítico dedicado a buscar
**caminos que terminan en verde sin haber verificado nada**. Encontró diez, todos
reproducidos con casos ejecutables; los diez están cerrados y cada uno dejó su
caso en el banco. Vale la pena que un consumidor sepa qué se corrigió, porque
son exactamente los modos de falla que hacen que un gate dé confianza sin darla:

- **Un reporte de cobertura desactualizado** hacía que las líneas nuevas se
  leyeran como «no ejecutables» y el paso saliera en verde y mudo. Vector real:
  una caché de CI que restaura `coverage/`. Peor: una línea *modificada* que
  conserva su número heredaba el resultado viejo y contaba como cubierta.
- **Un archivo cuya extensión ningún reporte medía** salía en silencio, y en un
  cambio mixto el porcentaje publicado llegó a decir **100%** sobre una
  cobertura real del 2%. Ahora la clasificación usa la definición de «código
  fuente» del censo —la misma para las dos piezas— y el porcentaje **nunca** se
  publica sin declarar cuántas líneas quedaron fuera del denominador.
- **Un archivo fuente que ningún reporte reclama** avisaba y dejaba pasar,
  cuando el contrato promete que la integración falla. Ahora es rojo, y para no
  enrojecer lo legítimo se consultan las exclusiones declaradas con motivo, que
  el comparador ignoraba.
- **Un monorepo sin `projectRoot`** cuyas rutas colisionaban con homónimos de la
  raíz pasaba en verde y con el diagnóstico equivocado. Ahora es rojo y nombra
  la causa correcta.
- **El detector de enmascaramiento** dejaba pasar cinco formas verificadas
  —`|| echo`, `| tee`, `; echo`, un comentario al final, `|| true && echo`— y
  encima afirmaba haber comprobado algo que no comprobó. Se reemplazó la
  búsqueda de sufijos por un lector de la cadena de comandos.
- **El check de «censo cableado» se satisfacía con un README** que contuviera la
  línea del ejemplo — la misma línea que el propio mensaje de error imprime para
  que la pegues. Ahora solo mira los archivos que el proveedor de CI ejecuta.
- **Artefactos presentes sin versión declarada** contaban como «nada que
  verificar», justo la clase más atrasada posible y la que motivó el check.
- **Un `grep` sin permiso de lectura** devolvía error y el check lo tragaba.
- **El guardia de módulo del censo** podía volverlo un no-op absoluto invocado
  por una ruta no canónica: salida vacía, código 0.

Una de las correcciones introdujo un **falso positivo** que también se cazó y se
cerró antes de publicar: un archivo de puros tipos se volvía rojo, y ningún
reporte de cobertura puede medirlo. Es el archivo más común del stack fijado.

**Lo que esto deja como lección, más que como cambio:** el guardia de módulo ya
había sido corregido en la acción hermana, con un comentario que lo llamaba «el
único fail-open posible de este script». La lección estaba aprendida, escrita, y
a un directorio de distancia — y no cruzó. Copiar una corrección no la propaga.

### Límites declarados

- **La plantilla no es lintable como plantilla.** El validador de workflows deja
  hallazgos sobre los marcadores `{{...}}` dentro de un bloque de comandos. Sobre
  el scaffold ya sustituido no deja ninguno. Lo exigible en CI es que el YAML
  **parsee** y que el resultado sustituido linte limpio, no cero hallazgos sobre
  la plantilla sin resolver.
- **Los checks estáticos del job de marco no tienen banco de pruebas.** Son
  comandos dentro del YAML y quedan fuera de las pruebas automatizadas de las
  dos acciones. Se verifican a mano contra fixtures. Es deuda declarada, no un
  olvido.

### Para consumidores

**1. Cablear el censo. Es obligatorio y hay un check que lo exige.** El paso va
en el job que ya corre lint y typecheck, **después** de instalar dependencias:

```yaml
- run: pnpm install --frozen-lockfile
# DESPUES del install: el censo interroga al toolchain ya instalado.
- uses: im-diego-ec/Projects/actions/censo-fuentes@v1
```

Y declarar, en el `package.json` del paquete que los contiene, los archivos que
legítimamente ninguna herramienta mira:

```json
{ "projects": { "cobertura": { "excluidos": [
  { "patron": "vite.config.ts", "motivo": "por que este archivo no lo mira nadie" }
] } } }
```

`motivo` no puede estar vacío, y una exclusión que ya no corresponde a ningún
archivo rastreado es **roja**: las exclusiones no sobreviven al problema que las
justificó.

**2. Cablear la cobertura del diff.** El paso va después de correr las pruebas
con cobertura:

```yaml
- uses: actions/checkout@v7
  with: { fetch-depth: 0 }   # sin esto, el commit base puede no estar en el clon
# ... install, y las pruebas CON cobertura ...
- uses: im-diego-ec/Projects/actions/cobertura-diff@v1
```

Requisito que decide todo lo demás: **las rutas `SF:` de los `lcov` tienen que
ser relativas a la raíz del repositorio.** En un monorepo eso significa
configurar el `projectRoot` del reporter; sin eso, dos paquetes emiten `src/...`
indistinguibles entre sí. Si ninguna ruta resuelve, el paso es rojo — nunca un
100% simulado.

Aviso honesto: a diferencia del censo, **ningún check estático verifica todavía
que este paso esté cableado.** Un repo que no lo agregue no da rojo por eso; da
rojo el día que alguien confíe en una cobertura que nadie está midiendo.

**3. Scripts de verificación: probablemente nada que hacer.** Si los scripts del
repo ya propagan su código de salida, el check sale verde solo. Se verificó
contra el consumidor real: 28 scripts de 4 manifiestos, cero enmascaramiento.

**El consumidor actual da rojo hasta que se ponga al día, y por eso el orden es
primero el consumidor.** `proyecto-origen` hoy no cablea el censo, así que el
check de cableado lo pone rojo, y su censo encuentra 23 archivos fuera del
alcance: dos componentes de dominio tragados por un ignore pensado para
generados, los tres scripts de `api` fuera de todo programa de tipos, los cuatro
`.ts` de E2E sin ningún `tsconfig`, y seis archivos de configuración que son
candidatos legítimos a exclusión declarada.

Esto **no** es breaking para `@v1`, y el orden es toda la razón. La definición
del marco es que un consumidor *que no modifica una sola línea* quede roto; acá
el consumidor se pone al día **antes** de que el check aterrice, así que ningún
repo amanece en rojo. Es el mismo precedente aplicado en `marco-se-cumple-solo`,
no una excepción nueva. El modo aviso queda reservado para cuando haya
consumidores que no controlamos.

### Antes de mover `v1`

- El PR del consumidor con los dos pasos cableados tiene que estar **mergeado
  primero**. Si el tag se mueve antes, `proyecto-origen` queda roto sin haber
  tocado una línea, que es exactamente la definición de breaking de `AGENTS.md`.
- **El scaffold todavía no cablea ninguno de los dos pasos**: tal como está,
  todo proyecto nuevo nacería rojo el día uno por el check de cableado. Hay que
  cerrarlo antes del tag, no después.
- Probar las dos actions desde el consumidor apuntando a la **rama** del change
  y revertir ese pin en el mismo PR, como manda `AGENTS.md`.

---

## [1.1.0] — 2026-08-18

**El marco empieza a hacerse cumplir solo.** Tres checks nuevos que cierran
huecos donde el marco afirmaba algo y nada lo verificaba. Validado contra el
consumidor real antes de mover el tag móvil: `proyecto-origen` quedó verde de
punta a punta con el job `higiene` corriendo.

### Añadido

- **Tres checks nuevos en el job de marco (`higiene`), que cierran huecos donde
  el marco afirmaba algo y nada lo verificaba.** Llegan solos a todo consumidor
  de `@v1`: no hay nada que copiar ni configurar del otro lado.
  Los tres son independientes entre sí: un repo con dos problemas los ve
  **los dos en la misma corrida**, no de a uno por push.

  1. **Artefactos regenerados al día.** Compara la versión declarada en los
     artefactos que genera el CLI de OpenSpec (`.claude/`, `.agents/`) contra el
     pin del marco. *Regenerado* era la única de las cuatro formas de
     distribución que se apoyaba solo en que alguien se acordara de ejecutarla.
     El fallo trae el comando exacto de regeneración.
  2. **Definiciones de pipeline válidas** (actionlint, pineado, con `shellcheck`
     sobre cada bloque `run:`). Eran el único código del repo que nadie linteaba:
     un error de sintaxis o una expresión inválida se descubrían *ejecutando*, o
     sea después del merge.
  3. **Sin marcadores del scaffold sin resolver.** Un placeholder que sobrevive
     al bootstrap falla en silencio — en el archivo de propietarios de código no
     produce error alguno, simplemente no asigna revisores, y el review cruzado
     que el marco promete desaparece sin ruido desde el primer día.

- Input `version_actionlint` (default `1.7.12`) para pinar el validador.

### Para consumidores

**Checks 2 y 3: nada que hacer.** Se verificó contra el consumidor real antes de
publicar: `proyecto-origen` los pasa sin tocar una línea (con un hallazgo real
de `shellcheck` que se arregló en su propio repo, no acá).

**Check 1 (artefactos regenerados): puede pedir una acción de una sola vez.** Un
repo cuyos artefactos vengan de una versión anterior del CLI dará rojo hasta que
corra lo que el propio mensaje de error indica:

```
npx --yes @fission-ai/openspec@<pin> update --force
```

Esto **no** es breaking para `@v1`, y el orden es la razón. La definición del
marco es que un consumidor *que no modifica una sola línea* quede roto; acá el
consumidor regeneró **antes** de que el check aterrizara, así que ningún repo
amaneció en rojo. Cuando el marco tenga consumidores que no controlamos, un
endurecimiento así se estrena en modo aviso y endurece en el major siguiente
—como manda `AGENTS.md`—; con un solo consumidor y nuestro, ordenar los merges es
más honesto que enseñar a convivir con un aviso.

### Nota sobre el alcance del check 3

En **este** repo el check de marcadores se omite y lo dice en el log: Projects
distribuye el scaffold, así que los marcadores son su materia prima (están en
`plantilla/` y en toda la documentación que la explica). La detección es
automática —la presencia del scaffold— y no un input que un consumidor pueda
apagar sin querer. Consecuencia declarada: de los tres checks, este es el único
que el marco no se aplica a sí mismo. Su valor está entero del lado de los
proyectos.

---

## [1.0.0] — 2026-08-17

**Primera versión publicada del marco.** A partir de acá los proyectos lo
consumen con `uses: im-diego-ec/Projects/...@v1`, y `v1` es un tag
**móvil**: apunta siempre a la última `1.x`.

Validado contra un consumidor real antes de publicarse: `proyecto-origen`
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

Los ocho specs del marco, destilados de los specs vivos del repo de origen:
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

El marco se destila del estado **actual** de `proyecto-origen` (primer commit
2026-07-03), no de un starter previo: `projects-starter` quedó archivado el
2026-08-14. Cada guardrail que entra a Projects trae su incidente detrás —la tabla
del README los enumera con fecha— y esa trazabilidad es un requisito, no un
adorno: el post-mortem es el proposal del change que crea el guardrail.

