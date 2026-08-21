---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO
estado: pendiente-de-revision
---

# entrega-referenciada — Design

> Este design **no se rediseña acá**: es el volcado del panel de decisión y de
> su revisión posterior, cuando Builder 1 fijó la infraestructura base del área. Lo
> que cambió respecto del design previo (el híbrido: scaffold parametrizado +
> verificador estático) está en la sección «Qué cambió con la premisa», y las
> alternativas descartadas conservan el argumento con el que se descartaron.

## Context

El design previo del pipeline de entrega resolvió «scaffold parametrizado +
verificador estático»: el deploy se copia una vez, con placeholders, y un check
del marco vigila sus propiedades. Ese design estaba premisado en un contrato que
el propio marco tiene escrito: **«lo que sí es del proyecto: su deploy con la
topología de su infraestructura»** (`AGENTS.md:181-183`, y el paso 2 de la guía
de adopción, `README.md:148-150`).

Después de escribirlo, el DRI **fijó el stack y la infraestructura base del
área**. Con eso la topología del deploy deja de ser del proyecto y pasa a ser
del área: no es una reinterpretación del contrato, es un cambio de premisa —y
por eso arrastra un change de contrato propio, que este design flaguea y no
cierra (ver «Lo que sigue sin resolver»).

Los hechos del archivo real del consumidor, verificados sobre
`un-proyecto-anterior/.github/workflows/deploy.yml` (685 líneas al abrir este
change):

- El patrón de one-off en Fargate —`run-task` + `wait tasks-stopped` + check del
  exit code— aparece **cuatro veces**: `:121` (migraciones de dev), `:206`
  (smoke de API), `:324` (limpieza de residuos del E2E) y `:480` (migraciones de
  producción). Es el bloque más duplicado del archivo y el sustrato de las tres
  compuertas siguientes.
- `deploy-api` (`:51`) y `deploy-api-prod` (`:419`) comparten login al registro,
  validación fail-fast del tag de rollback, build+push con tag de SHA inmutable,
  migración one-off y update del servicio; difieren en gates, en `environment` y
  en secrets.
- Hay valores de runtime hardcodeados que cualquier scaffold tendría que cazar
  uno por uno: el dominio de la API (`:548-549`, `:588`), el log group
  (`:608`, `:610`), el repositorio del registro y el tópico de notificaciones
  (`:623`).
- Las tres lecciones del 2026-08-19 —contenedor de Playwright (`:248`), el
  `shell: bash` a nivel de job porque dentro de un contenedor los pasos corren
  en `sh` (`:256`), la limpieza en job aparte para que corra aunque la suite
  falle (`:302`)— y el `actions: read` que el detector necesitaba (`:366`, con
  su comentario de «TERCERA aparición de la lección») **no llegarían solas** a
  `intranet` ni a Supply Chain bajo scaffold+verificador: el verificador
  comprueba propiedades, no propaga arreglos.

Y hay un hecho del marco: N copias de una mecánica **idéntica por decreto** es
exactamente el anti-patrón que Projects existe para matar (`AGENTS.md:169-175`, «en
el momento en que existen dos copias, la divergencia es cuestión de tiempo y la
corrección de un incidente deja de propagarse»).

La pregunta de diseño, entonces, no es *si* la mecánica del deploy sube al
marco. Es **cuál es la unidad de distribución** — y ahí es donde el design
previo y el reusable completo se equivocaban en direcciones opuestas.

## Decisions

### D1 — La unidad de distribución baja del workflow a la COMPUERTA

Se adopta la **tercera vía**: el híbrido evoluciona, no se reemplaza ni se
abandona. **La mecánica de cada compuerta sube al marco como composite action
`@v1`**; la topología queda en el proyecto como scaffold delgado.

Las actions se extraen **incrementalmente, una por change**, en orden de
densidad de incidentes y de repetición:

1. **`one-off-ecs`** primero: es el patrón que aparece cuatro veces
   (`deploy.yml:121`, `:206`, `:324`, `:480`) y el sustrato de los tres
   siguientes.
2. **`migraciones-gate`**: one-off con el usuario migrator vía IAM auth, donde
   el fallo deja el servicio intacto (`deploy.yml:109-137` y su gemelo de
   producción `:468-496`).
3. **`build-push-ecr`**: tag de SHA inmutable + fail-fast del rollback contra el
   registro (`deploy.yml:79-96` / `:441-461`).
4. **`actualizar-servicio-express`** (`deploy.yml:135-139` / `:497-500`).

Ese orden es **compromiso del design**, no una sugerencia: es lo que evita que
el estado intermedio se estanque en el punto de menor valor (ver «Lo que sigue
sin resolver», el ritmo).

**Clasificación de distribución** de cada pieza que este change toca, como pide
`AGENTS.md:51-54`:

| Pieza | Forma | Por qué esa y no otra |
| --- | --- | --- |
| Las actions de compuerta (`actions/<compuerta>/`) | **Referenciado** | Es mecánica idéntica por decreto del área: debe cambiar una vez para todos, y su corrección tiene que llegar sin un PR por repo |
| El esqueleto de topología del deploy (`plantilla/.github/workflows/deploy.yml`) | **Scaffold** | Declara jobs, dependencias y ambientes del proyecto; se copia una vez y el verificador le vigila las propiedades (D2, D7) |
| Los dos requirements del delta | **Canónico** | Son propiedades del marco, no de un proyecto: viven solo acá y los consumidores las cumplen |
| — | Regenerado | No se toca |

### D2 — La topología queda copiada, y es un esqueleto de orquestación

Se quedan en el repo del proyecto: los jobs, los `needs`, los `if` con
`!cancelled()`, el `environment: production` de cada job de producción
(`deploy.yml:437`, `:514`, `:647`), el `concurrency` con `cancel-in-progress:
false` (`:29-31`) y los `permissions` de cada job.

El archivo pasa de 685 líneas de mecánica+topología a un esqueleto de ~200
líneas de **solo orquestación**, donde cada paso mecánico es
`uses: im-diego-ec/Projects/actions/<compuerta>@v1`.

### D3 — El invariante que vuelve verificable al dogfooding

El verificador estático del design previo **sobrevive** dentro de
`marco-ci.yml@v1` y gana un check nuevo:

> **Ninguna action del marco usada en un job de producción puede faltar en el
> tramo de dev de la misma promoción.**

El verificador lee el YAML del consumidor y falla si no. Ese check es lo que
convierte el argumento en propiedad: no hay que confiar en que la action «ya se
probó», la promoción lo demuestra en cada run.

El hecho que lo hace baratísimo de cumplir en el consumidor real: de las cuatro
apariciones del one-off, **tres están en el tramo de dev** (`:121`, `:206`,
`:324`) y una en producción (`:480`). La primera action extraída se ejercita
tres veces en dev antes de que un job de producción la toque, en el mismo run.

### D4 — Las tres vías dinámicas que esquivan el invariante, declaradas de antemano

El invariante tiene tres agujeros dinámicos y el spec los nombra como
**excepciones deliberadas**, no se descubren después:

1. **Rollback por `image_tag`.** Los jobs de dev quedan fuera por diseño
   (`deploy.yml:56-63`) y producción corre `actualizar-servicio-express` sin
   tramo de dev en ese run. Aceptable: despliega una imagen **que ya estuvo en
   producción**, y la validación fail-fast contra el registro corre antes de
   tocar el servicio (`:441-447`).
2. **Dispatch de emergencia sobre `main`.** Salta dev por diseño (capability
   `pipeline-entrega`, requirement «El deploy está gateado por el éxito de CI»,
   escenario «Deploy manual de emergencia»). Es la vía de emergencia: hereda el
   riesgo que siempre tuvo y queda registrada en el historial del proveedor.
3. **Reuso por tree** (`deploy.yml:395-416`). Producción corre referenciando una
   corrida de dispatch de hasta 24 h antes, que **pudo ejecutar las actions bajo
   un `v1` anterior** si el tag se movió en la ventana. Mitigación **operativa,
   no estructural**: mover `v1` es acción deliberada con OK humano
   (`AGENTS.md:233`) y la ventana es de horas.

### D5 — Secrets e inputs nombrados, jamás `secrets: inherit`

Las composite actions lo cumplen por construcción: no heredan el almacén de
secretos del llamador, reciben lo que el job les pasa con nombre. Esta mitad de
la razón (3) del design previo es **independiente de la topología** y sobrevive
intacta al cambio de premisa.

### D6 — Cada action debuta pinada a SHA en un consumidor real antes de que `v1` se mueva

Es el mecanismo que `AGENTS.md:177-179` ya sanciona: se permite apuntar a un SHA
para **probar** un change antes de que el tag se mueva, y ese pin se revierte en
el mismo PR que lo introdujo. `CHANGELOG.md` va en el mismo PR
(`AGENTS.md:227`), porque es la única superficie por la que un consumidor se
entera.

### D7 — El verificador cambia de trabajo, y se endurece

Con la infraestructura fijada, el verificador ya no vigila divergencia legítima
—no puede existir legítimamente—, pero no se vuelve overhead: **cambia de
trabajo**. Vigila el esqueleto de topología que sigue copiado y el invariante de
D3. Y puede endurecerse sin tolerar topologías arbitrarias: afirmar que las
migraciones gatean el update, que `cancel-in-progress` es `false`, que los jobs
de producción llevan `environment`.

Con una salvedad que no es negociable y viene de la constitución: endurecer un
check de modo que un repo que hoy pasa mañana falle **es breaking**
(`AGENTS.md:143-145`), así que el endurecimiento **se estrena en modo aviso** y
el rojo llega en la línea mayor siguiente. El check del invariante (D3) no cae
en esa categoría: para un consumidor que todavía no adoptó ninguna compuerta es
vacuamente verdadero —no usa ninguna action del marco en un job de producción—
y por eso puede nacer en MINOR sin romper a nadie.

## Alternativas descartadas

### A1 — El workflow reusable completo (`marco-entrega.yml`)

Descartado por tres razones. Con la premisa nueva, **una cayó, una sigue
vetándolo y una se partió en dos**:

- **Razón (1) — «el deploy con la topología de su infraestructura ES del
  proyecto»** (`AGENTS.md:181-183`, `README.md:148-150`). **Cayó entera**: el
  decreto del DRI vuelve la topología del área. Esta razón ya no defiende nada.
- **Razón (2) — el dogfooding.** Sigue vetándolo, y es la razón letal. El
  workflow es la unidad que **contiene código exclusivo de producción**: por
  spec, un dispatch de rama deja los jobs de producción en `skipped`
  (capability `despliegue-ci`, escenario «Disparo manual sobre una rama de
  trabajo»), así que la mitad de producción de un reusable **jamás corre antes
  de publicarse**. Projects publicaría código que no corrió en ninguna parte, y lo
  publicaría a N repos a la vez.
- **Razón (3) — diversidad creciente + seguridad.** Se partió: la mitad de
  diversidad cayó (con la infra fija, las actions pueden codificarla sin inputs
  de topología); la mitad de **seguridad** —jamás `secrets: inherit`— es
  independiente de la topología y sobrevive (D5).

La razón (2) **no se refuta: se rodea cambiando la unidad**. Bajando la unidad a
la compuerta, lo exclusivo de producción deja de contener código del marco:
**la misma action, en la misma versión, corrió en el tramo de dev del mismo run
minutos antes**. El dogfooding que Projects no puede hacer —no despliega nada— lo
hace cada consumidor en cada promoción, por construcción, y un check que falla
solo lo verifica (D3). Eso es la premisa de automatización del marco, no un
ritual.

### A2 — El reusable solo-dev (`marco-entrega-dev.yml`, la etapa 1 de la lectura a favor)

**No se adopta.** Parte la mecánica idéntica en **dos formas de distribución**:
un fix a la migración llegaría solo al tramo de dev de todos, mientras las
copias de producción quedan viejas. O sea **dev verificaría con un código
distinto del que producción ejecuta**, que es exactamente lo que la promoción
existe para impedir.

Y tiene un segundo filo, concreto: la conversión a workflow reusable **prefija
los nombres de los jobs**, y el reuso por tree hace grep de nombres exactos
(`deploy.yml:409`: `^smoke-api=success$`, `^e2e-dev=success$`). La sola
migración rompería la detección **en silencio**, cayendo hacia el fail-open.

### A3 — El canario (una app de mentira con sus dos ambientes)

**No se construye.** Su razón de existir era ejercitar código del marco que solo
corre en producción — y bajo esta decisión **ese código no existe**: lo
prod-only que queda es topología declarativa del proyecto, y toda action del
marco corre en dev minutos antes, en el mismo run. El canario pasa de compuerta
necesaria a costo fijo (app + dos ambientes + base de datos + mantenimiento) sin
cobertura marginal que lo pague con n=2-3 consumidores.

Se reabre **solo** si algún día una pieza del marco no puede tener gemelo de dev
(hoy el caso candidato son las sondas de producción; ver «Lo que sigue sin
resolver»).

### A4 — El híbrido puro (scaffold parametrizado + verificador, el design previo)

**Subresponde a la premisa.** Con la infraestructura fijada, mantener N copias
de una mecánica idéntica por decreto es el anti-patrón que Projects existe para
matar (`AGENTS.md:169-175`), y la evidencia del propio archivo lo condena: las
tres lecciones del 2026-08-19 (`deploy.yml:248`, `:256`, `:302`) más el
`actions: read` (`:366`) **no llegarían solas** a `intranet` ni a Supply Chain
bajo scaffold+verificador. El verificador comprueba propiedades; no propaga
fixes.

Es además el estado actual, así que su evaluación son los hechos del Context.

### A5 — Extraer el catálogo completo de una vez

**No.** El costo de diseño ya no está en la parametrización (la infra fija lo
sacó), pero la extracción sigue siendo trabajo que **se paga de a una**: cada
action tiene su debut pinado, su CHANGELOG y su verificación en un consumidor
real. Un catálogo grande de una vez es un debut grande de una vez, que es
justamente lo que `AGENTS.md:242` prohíbe hacer sin probar.

## Qué cambió con la premisa

- **Cayó entera la razón (1)** (A1). Y arrastra una tensión que el change de
  contrato debe resolver **de frente**: `README.md:265-270` declara **«No impone
  stack»**, y las actions nuevas codifican ECS Express + base relacional
  administrada. La resolución honesta: **el área fija stack e infraestructura;
  Projects publica la implementación de referencia; el proyecto de excepción
  registrada conserva los specs como propiedades pero es dueño de su deploy y
  NO consume las actions de entrega**. Escape limpio, sin parametrización
  especulativa.
- **Cayó la mitad de la razón (3)** que apostaba a diversidad creciente. Con
  «apartarse» como excepción registrada, las actions pueden codificar la infra
  fija sin inputs de topología — como `carril-docs@v1` ya lo hace
  (`deploy.yml:381`, en producción real desde su debut).
- **Se debilitó, con matiz, el argumento económico del híbrido**: el verificador
  ya no vigila divergencia legítima, pero no se vuelve overhead — cambia de
  trabajo (D7).
- **Lo que fijar la infra NO volvió válido:** ni el workflow reusable completo
  (la razón 2 sigue vetándolo), ni `secrets: inherit` (D5), ni el catálogo
  completo de una vez (A5).

## Qué gana el tercer proyecto

**Hoy** (design previo): Supply Chain copia el scaffold parametrizado de ~685
líneas, sustituye placeholders, carga ~9 secrets/vars — y hereda **cero**
correcciones futuras salvo por revisión trimestral. El archivo de origen muestra
lo fácil que es que la parametrización pierda algo: dominio (`:548-549`, `:588`),
log group (`:608`, `:610`), repositorio del registro y tópico de notificaciones
(`:623`) hardcodeados que un scaffold debe cazar uno por uno.

**Con esta decisión**: copia un esqueleto de ~200 líneas de topología (jobs,
`needs`, `if`, environments), donde cada paso mecánico es un `uses:` a `@v1` — y
esas actions ya traen puestas las lecciones pagadas: el patrón one-off completo,
el fail-fast del rollback, el tag de SHA inmutable, los permisos documentados
acción por acción. Carga sus `vars`/`secrets` (que es donde las URLs y los ARNs
siempre debieron vivir, `README.md:211-215`) y el verificador le comprueba desde
el día uno las propiedades del esqueleto más el invariante dev-antes-que-prod.

La diferencia estructural: cuando la CLI del servicio de cómputo cambie un flag,
o aparezca la cuarta lección de one-offs, a Supply Chain le llega como **PATCH de
`v1` sin tocar nada** — hoy le llegaría como un diff que alguien tiene que
acordarse de portarle.

Lo que Supply Chain sigue debiendo escribir, y está bien que así sea: sus
smoke/E2E (las actions invocan comandos del consumidor), sus sondas de dominio,
su Terraform sobre la infraestructura fija.

## Cómo se hace cumplir solo

Lo que exige `config.yaml` para un design de este repo: qué check se pone rojo si
alguien no cumple, y qué queda dependiendo de que alguien se acuerde.

| Propiedad | Qué la sostiene |
| --- | --- |
| Una action del marco en un job de producción tuvo gemelo en dev en la misma promoción | Check nuevo del verificador (D3): rojo, nombrando la pieza y el tramo que falta |
| Las excepciones al invariante son solo las tres declaradas | El verificador las reconoce **por nombre**; una vía nueva que las esquive es rojo por vía no declarada |
| El esqueleto de topología conserva sus propiedades (migraciones gatean el update, `cancel-in-progress: false`, jobs de producción con `environment`) | Verificador endurecido (D7), estrenado en modo aviso y rojo en la línea mayor siguiente |
| Ninguna action lleva valores de un proyecto | Frontera 🛑 de `AGENTS.md:243-245` + el ítem del checklist de PR |
| Ninguna action hereda el almacén de secretos | Por construcción de las composite actions (D5) |

**Deuda declarada, lo que NO falla solo:**

- **El avance de la extracción.** Que la serie llegue al final depende de la
  revisión trimestral (`AGENTS.md:187-209`), cuyo propio texto admite que «no es
  enforcement». El ítem 2 de esa revisión —«adopción de lo referenciado»— es el
  que audita el estado intermedio, y el aviso del verificador (mecánica copiada
  que ya existe como pieza referenciada) es lo más cerca de un check que se
  puede llegar sin romper repos.
- **El conteo de excepciones registradas.** Es dato de la revisión trimestral,
  no un check.
- **Mover `v1`.** Acto humano deliberado con OK (`AGENTS.md:233`), y es justo lo
  que acota el agujero del reuso por tree (D4.3).

## Lo que sigue sin resolver

- **`verificar-prod` no se extrae todavía.** Sus sondas —frescura del bundle
  (`deploy.yml:560-565`), sanidad de auth con 401 exacto (`:579-593`),
  vigilancia de logs (`:608-611`)— corren **solo en producción** (`:505-626`):
  no tienen gemelo de dev en el pipeline actual, así que una action `sonda`
  **violaría el invariante recién creado**. O se diseña un tramo
  `verificar-dev` (deseable: hoy dev se verifica por smoke+E2E pero nadie sonda
  su frescura de bundle), o esas sondas se quedan en el proyecto. Es un change
  propio, no un apéndice de este.
- **La topología copiada es donde vivieron los incidentes más sutiles** —los
  `!cancelled()`, el arrastre de `skipped`, la cola de concurrency del
  2026-08-13— y sus fixes siguen propagándose por verificador + revisión
  trimestral, no solos. El verificador es **ratchet**: cada incidente de
  topología nuevo se convierte en check, o queda en un repo.
- **El ritmo.** Son 4-5 changes con debut pinado cada uno: **semanas de
  builder**. El estado intermedio (mitad extraído, mitad copiado) es **peor que
  cualquiera de los dos extremos** si se abandona a medias — de ahí que el orden
  de extracción de D1 sea compromiso del design y que la revisión trimestral
  audite el avance.
- **Dónde queda escrita la infraestructura fijada** (¿spec canónico nuevo de
  Projects, o política del área que Projects implementa?) y la reescritura de
  `README.md:265-270` («No impone stack») son decisiones **del change de
  contrato**, con impacto en consumidores evaluado. Este design las **flaguea,
  no las cierra**. La primera mitad ya tiene dueño: el change hermano
  `stack-estandar` (capability nueva `base-tecnologica`) publica la base
  tecnológica del área como contrato y exige OK humano antes de apartarse — este
  change **depende** de que aterrice. La segunda mitad —reconciliar
  `AGENTS.md:181-183` con las actions de entrega, y escribir la figura de
  excepción registrada— sigue sin dueño asignado, y es lo que la tarea 0.2
  rastrea.
- **Si la diversidad reaparece** —un tercer o cuarto proyecto que legítimamente
  no quepa en la infraestructura fija—, la excepción registrada no consume las
  actions de entrega y el porcentaje de área cubierta por el marco baja en
  silencio. La revisión trimestral debe **contar excepciones**: dos son un dato,
  tres son una premisa equivocada y se reabre este design.
- **El residuo que queda tras todo esto**: un fix a una action se propaga a las
  promociones de producción de todos cuando `v1` se mueve. Se acota con lo que
  ya es regla — debut pinado a SHA en un consumidor real, actions **fail-red**
  (el modo de fallo probable es pipeline rojo multiplicado por N, no corrupción
  silenciosa) y el rollback por `image_tag`, que **no depende de ninguna action
  nueva**.
