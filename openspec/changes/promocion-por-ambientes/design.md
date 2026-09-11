---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
decisiones-del-po: 2026-09-10
---

# Design — promocion-por-ambientes

> Las cuatro decisiones que faltaban las tomó el PO el 2026-09-10. Este design
> las escribe y deriva lo demás.

## Las decisiones, y lo que cada una cierra

| # | Decisión | Qué cierra |
|---|---|---|
| **D1** | La topología es **Local → DEV → PROD**. Se valida en local, se envía a DEV, se prueba ahí, y de ahí a producción | H1 |
| **D2** | **La pregunta «¿cuántas copias querés?» se elimina.** DEV y PROD siempre | H2 |
| **D3** | Una **aplicación** también llega a internet, por el mismo camino | H3 |
| **D4** | **Supabase** deja de ser sólo auth: tiene despliegue | H4 |
| **D5** | **El piso de la compuerta de PROD es el botón, no el environment.** La promoción exige `workflow_dispatch` en **todos** los planes; el environment agrega un **segundo** candado donde el repositorio lo admite | la medición de abajo |
| **D6** | **Promover exige haber pasado por DEV en verde, y se comprueba.** Si no se puede comprobar, **no se promueve** | un hueco que el diseño original no veía |

### D2 — por qué se elimina en vez de implementarse

Con D1, la pregunta tiene **una sola respuesta correcta**, y una pregunta con una
sola respuesta correcta no es una elección: es un examen. `menu-que-no-miente`
—change vivo de este mismo repo— lo dice de frente: *«le hace creer a la persona
que eligió una arquitectura cuando eligió un texto»*.

La asimetría de costo lo confirma: **no** tener DEV se paga descubriendo en
producción, con usuarios adelante; tenerlo cuesta un Worker más de los 100 del
plan libre. Y quien de verdad no quiere desplegar ya tiene salida: `plataforma:
ninguna`.

**La pregunta de plataforma también se va**, por la misma razón y con la
investigación ya hecha (`la-pregunta-de-plataforma.md`): el andamio sabe generar
**una sola** rama que funciona, así que el menú ofrecía tres caminos de los cuales
dos no existen.

## Cómo se hace DEV, y por qué así

Tres formas evaluadas en `alternativas.md` §1. Gana **versiones + preview URL** de
Cloudflare, y el motivo es el que define una promoción:

**Es la única que promueve un artefacto YA CONSTRUIDO.** Las otras dos —environments
de wrangler, o un segundo Worker por `--name`— vuelven a compilar para producción,
y entonces lo que se verificó en DEV **no es exactamente lo que sale publicado**.
Eso vacía de sentido el ambiente de prueba: se probó otra cosa.

Además no cuesta un solo acto humano nuevo — el permiso «Edit Cloudflare Workers»
de la credencial que la persona **ya carga** alcanza para subir una versión y para
promoverla.

Dos precisiones que no se pierden:

- **`preview_urls` se declara explícitamente en `wrangler.jsonc`**, con su comentario.
  El default cambió tres veces durante 2025; apoyarse en él es apoyarse en algo que
  ya demostró moverse.
- **No se declara ningún bloque `env`**: hacerlo obliga a `--env` en todo comando de
  wrangler y agrega un warning a cada corrida. Es el costo escondido de las otras dos.

## La compuerta de PROD: se MIDE, no se asume

Acá hay un muro que no es técnico y que el marco ya conoce: **en un repositorio
privado del plan gratuito no existe ninguna compuerta de environment.** No es que
sea cara: los environments directamente no están disponibles. Revisores
obligatorios en privado exigen Enterprise —**21 USD por persona al mes**, no 4—.

> ⚠️ **Los «21 USD por persona al mes» no están confirmados, y quedan marcados en vez
> de repetirse.** Al volver a mirar la documentación de GitHub el **2026-09-10**, lo
> único que dice con todas las letras es que *«Organizations with GitHub Team and users
> with GitHub Pro can configure environments for private repositories»* y que *«some
> features for environments have no or limited availability for private repositories»*
> — **sin decir cuáles ni a qué plan corresponde cada una**. O sea que la cifra puede
> ser correcta y no está respaldada por ninguna fuente que se haya podido leer.
>
> **No cambia ninguna decisión**, y por eso se marca en vez de bloquear: desde **D5**
> el piso de la compuerta es el botón, que es gratis en todos los planes. Lo que esta
> cifra decide es sólo cuánto cuesta el **segundo** candado — y nadie tendría que pagar
> nada apoyándose en un número sin fuente.

| Compuerta | Repo público, gratis | Repo privado, gratis |
|---|---|---|
| Revisores obligatorios | **sí** | **no** |
| Temporizador de espera | sí | no |
| `workflow_dispatch` manual | sí | sí |

**Se resuelve con el patrón que este marco ya tiene y que funciona:** el mismo de
`proteccion-main.md`. La herramienta **mide** si el repositorio admite compuertas
de environment y escribe lo que encontró:

- **admite** → además del botón, el pase a PROD puede pedir **aprobación de otra
  persona** en el environment `produccion`. Eso agrega al rastro **quién aprobó**, que
  no es necesariamente quien disparó.
- **no admite** → **se declara el desvío**, igual que hoy se declara el de protección
  de rama. Y se declara con el nombre preciso: no es que no haya compuerta —el botón
  sigue siendo un acto humano— es que **no hay tercero**.

### Lo que la medición corrigió de este mismo documento

Medido el **2026-09-10** en la documentación de GitHub. Tres hechos, y el tercero
**contradice lo que este documento afirmaba**:

1. *«Users with GitHub Free plans can only configure environments for public
   repositories»* — confirma el muro, y confirma que **es el mismo** que el de
   rulesets. Por eso la sonda no se duplica: se reusa el `estado` que ya se mide.
2. *«Running a workflow that references an environment that does not exist will create
   an environment with the referenced name»* — declararlo **no rompe nada** donde no
   hay compuerta, así que el andamio lo declara siempre y no hace falta partir el YAML
   en dos variantes.
3. **Este documento decía: «una corrida esperando aprobación más de 30 días FALLA, no
   se cancela… deja el despliegue en rojo —visible—. Es el comportamiento correcto».
   Es al revés.** La documentación dice *«A workflow may wait for up to 30 days on
   environment approvals»*, y el tope de una corrida entera son **35 días** contando la
   espera, tras los cuales *«the workflow run is cancelled»*. Queda **cancelada, no
   roja**. Prometer un rojo mandaba a alguien a esperar una señal que GitHub no da.

**Y eso cambió D5.** Con el environment como piso, un repositorio privado del plan
gratuito —que es exactamente la gente para la que existe este marco— se quedaba con la
compuerta más baja de las dos. Con el botón como piso, ese proyecto pierde el
**tercero**, no la compuerta. Es una pérdida mucho más chica, y se declara con ese
nombre.

### D6 — el hueco que el diseño original no veía

El job de DEV hace **dos** cosas: sube la versión y **después** comprueba que su
dirección conteste. La primera puede salir bien con la segunda mal —el sitio sube y
sirve un 404— y esa versión queda igual cargada en Cloudflare, **promovible**, sin
nada que la distinga de una buena. Un `needs: dev` no lo cubre: cubre que los dos jobs
corran juntos, no que el segundo haya aprobado al primero.

Por eso la promoción **pregunta** si esa versión pasó por DEV en verde. Y falla
cerrado: *«no se pudo preguntar»* no se lee como éxito. Los tres desenlaces —no se
pudo preguntar, nunca se subió, se subió y salió rojo— se dicen distinto, porque piden
tres cosas distintas de la persona.

## Qué se construye ahora y qué queda declarado

**El sitio llega a producción por la promoción completa.** Todo lo que necesita
está resuelto y medido: Cloudflare, versiones, preview URL, credencial existente.

**La mitad API se construye sobre Worker + Hyperdrive, y eso lo decidió una
medición, no una preferencia.** El detalle está en
[`donde-corre-la-api.md`](donde-corre-la-api.md); acá va lo que cambia el diseño.

La pregunta original —«¿puede un container abrir TCP saliente al 5432?»— **estaba
mal formulada en sus dos mitades**:

- **El 5432 no era el discriminante.** La conexión directa de Supabase es **IPv6**;
  sus poolers compartidos son **IPv4**, con session mode en 5432 y transaction mode
  en 6543. La pregunta no distinguía las dos cosas, que es la distinción que decide.
- **El container era la pieza equivocada.** Cloudflare documenta —con Supabase
  nombrado y guía propia— **Worker + Hyperdrive + `node-postgres`**, que sale **0
  USD/mes** (Hyperdrive está incluido en el plan gratuito, 100.000 consultas/día) y
  **no exige reescribir la aplicación**: implementaron `node:http` cliente y servidor
  en Workers, con `httpServerHandler` para migrar apps de Node existentes.

**Y el container tampoco era la opción barata.** Los «~5 USD» son el **mínimo de
cuenta** de Workers Paid, no el precio: encima se factura memoria y disco por segundo
mientras está despierto. Prendido todo el mes son ~12 USD — un **72% más que Render**,
que además son ~7 USD y no 13, porque el planteo le sumaba una base de Render que acá
no hace falta.

**Y es mal encaje, además de caro.** La documentación oficial dice que *«Cloudflare
does not guarantee that any container instance will run for any set period of time»*,
que *«all disk is ephemeral»*, que duerme a los 10 minutos por default y que arranca
en frío en 1–3 segundos. Para un no-coder mostrando su idea, eso no es un detalle de
infraestructura: es la primera impresión.

> Containers **salió de beta** el 2026-04-13 —eso cambió desde el análisis previo—
> pero GA no trae garantía de permanencia: la FAQ con esas frases está actualizada al
> 2026-08-28, cuatro meses **después** del GA.

**Lo que queda por medir es una sola cosa y cuesta cero:** si Hyperdrive alcanza la
cadena *Direct* de un Supabase gratuito, que es IPv6. Si falla **no se cambia de
proveedor: se cambia de cadena**, porque el pooler compartido es IPv4 en todo plan.

**El riesgo real de la ruta ganadora no es el TCP:** son los **10 ms de CPU** por
invocación del plan gratuito. Con una salvedad que lo vuelve manejable: la espera de
Postgres **no cuenta** como CPU. Si aun así se pasa, la ruta sigue siendo la más
barata — Workers Paid, 5 USD, 5 minutos de CPU.

## Lo que NO se relaja

**Nada llega a ningún ambiente sin CI en verde.** DEV no es un lugar donde se
afloja: es un lugar donde se mira antes. El `if` que ya tiene `desplegar.yml`
—`workflow_run.conclusion == 'success'`— se conserva tal cual para los dos tramos.

**La concurrencia sigue haciendo cola y no cancela.** Dos publicaciones sobre el
mismo destino es una carrera con ganador impredecible; una corrida de despliegue
interrumpida deja estado. Se mantiene por ambiente.

## Alternativas descartadas

- **Preguntar y no construir** (el estado de hoy): es el defecto que el change cierra.
- **Un solo ambiente con «cuidado al publicar»**: traslada al humano una garantía
  que la máquina puede dar, y es exactamente lo que `AGENTS.md` prohíbe.
- **Recortar la constitución** para que deje de prometer promoción: haría
  desaparecer el síntoma sin tocar el problema, y borraría del mapa la práctica que
  el marco sí quiere.
