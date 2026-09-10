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

| Compuerta | Repo público, gratis | Repo privado, gratis |
|---|---|---|
| Revisores obligatorios | **sí** | **no** |
| Temporizador de espera | sí | no |
| `workflow_dispatch` manual | sí | sí |

**Se resuelve con el patrón que este marco ya tiene y que funciona:** el mismo de
`proteccion-main.md`. La herramienta **mide** si el repositorio admite compuertas
de environment y escribe lo que encontró:

- **admite** → el pase a PROD pide aprobación del environment. Con una sola
  persona funciona: alcanza con que uno de los revisores obligatorios apruebe, y
  puede ser quien disparó la corrida.
- **no admite** → PROD queda detrás de `workflow_dispatch` manual, y **se declara
  el desvío**, igual que hoy se declara el de protección de rama. No se finge una
  compuerta que no existe.

Un detalle que cambia el diseño: **una corrida esperando aprobación más de 30 días
FALLA**, no se cancela. Una compuerta que nadie atiende deja el despliegue en rojo
—visible— y no en silencio. Es el comportamiento correcto y se documenta.

## Qué se construye ahora y qué queda declarado

**El sitio llega a producción por la promoción completa.** Todo lo que necesita
está resuelto y medido: Cloudflare, versiones, preview URL, credencial existente.

**La mitad API de una aplicación NO se construye en este change, y la razón es una
medición que falta**, no una decisión pendiente: ¿puede un container de Cloudflare
abrir una conexión TCP saliente al 5432 de Postgres? La documentación de Cloudflare
no lo afirma en ninguna parte, y la respuesta cambia todo:

- **si pasa** → la aplicación corre por ~5 USD al mes **sin agregar un proveedor**;
- **si no pasa** → Render a 13 USD es lo más barato que cumple sin terminal, y su
  `pre-deploy command` es el único lugar donde `prisma migrate deploy` corre
  **dentro** del despliegue.

Escribir el adaptador antes de esa medición sería elegir proveedor a ciegas y
comprometer a cada proyecto nuevo con esa elección. **Es una tarde de trabajo y
está escrita como tarea bloqueante.**

**El escalón gratuito de Render no es una salida**, y conviene decirlo con números:
el servicio se duerme a los 15 minutos sin tráfico y tarda **un minuto** en
despertar —lo paga el primer visitante y también la verificación post-despliegue— y
su base **expira a los 30 días**.

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
