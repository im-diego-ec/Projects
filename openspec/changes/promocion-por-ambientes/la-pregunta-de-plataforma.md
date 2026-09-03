# La pregunta de plataforma

El `proposal.md` deja abierta una decisión: **¿se rediseña la pregunta de
plataforma en este mismo trabajo?** Este archivo trae lo que hace falta para
contestarla. Se investigó en cinco frentes con un escéptico por frente que abrió
cada fuente; volvieron **68 correcciones**. Fecha de la foto: **2026-09-01**.

---

## La respuesta corta

**No hay nada que preguntar.** Hoy el andamio sabe generar **una sola rama que
funciona**, así que la pregunta ofrece tres caminos de los cuales dos no existen.
La regla del marco ya decide esto sin necesidad de investigación: *una opción que
se ofrece y no funciona es peor que no ofrecerla.*

Lo que la investigación agrega es **por qué las otras dos no vuelven** ni cuando
el andamio crezca.

---

## Lo que el andamio genera hoy, medido

Es el dato que decide, y no depende de ninguna opinión sobre proveedores.

| ¿Sabe generar…? | Medido en `plantilla/` |
| --- | --- |
| un proyecto que corre **sin cuenta en ninguna nube** | **sí** — Postgres en Docker Compose, local |
| **Worker + D1 + migraciones** | **no** — cero referencias a D1 en todo el árbol |
| **Supabase con auth cableado** | **sí** — `web/src/auth.ts`, `api/src/middleware/auth.ts`, con pruebas |

`api/prisma/schema.prisma` declara `provider = "postgresql"`, y el
`DATABASE_URL` de `api/.env.example` apunta al Postgres del compose. El proyecto
**arranca y corre con cero cuentas**. Eso ya es la respuesta «todavía no sé», solo
que no es una opción del menú: es el estado en el que nace todo proyecto.

**Conclusión:** la rama «todo en Cloudflare» **no se puede ofrecer** —el andamio
no la sabe producir— y la rama AWS se cae por lo de abajo. Queda una.

---

## Por qué AWS sale del menú, y no es por gusto

Tres hechos verificados, cualquiera de los tres alcanza:

- **La cuenta gratuita se cierra sola.** A los 6 meses o al agotarse los créditos,
  lo que pase primero. Después AWS retiene los datos 90 días y los borra.
  <https://aws.amazon.com/free/free-tier-faqs/>
- **Pide tarjeta desde el alta.** Es la barrera más dura para quien recién
  arranca, y el marco apunta exactamente a esa persona.
- **El argumento del «Terraform ya listo» no aplica a quien contesta.** Terraform
  es una herramienta de terminal, que es justo lo que esta persona no tiene. La
  única ventaja que la opción declaraba hoy está fuera de su alcance.

---

## Y por qué tampoco vuelve como «todo en Cloudflare»

Aunque mañana el andamio aprendiera a generar D1, hay un hueco que **no lo cierra
el proveedor**:

**Cloudflare no tiene producto de cuentas de usuario final.** Cloudflare Access es
acceso interno tipo zero-trust —para tu equipo—, no registro de clientes. Una rama
«todo en Cloudflare» que alguna vez necesite login exige sumar una biblioteca de
autenticación y escribir ese código a mano. Supabase lo trae hecho, y eso es
justamente lo que el andamio ya cableó.

Además, casi todo lo interesante de Cloudflare para datos exige plan pago o está
en beta: **R2** obliga a completar un checkout de suscripción; **Vectorize**
aparece como «only available on the Workers paid plan» en la página de precios más
reciente; **Secrets Store** sigue en beta abierta y su URL de límites da 404;
**Containers** exige Workers Paid a 5 USD/mes.

Lo que sí está en pie y gratis es **D1**: 500 MB por base, 10 bases, 5M filas
leídas y 100.000 escritas por día, y **no se pausa nunca**.
<https://developers.cloudflare.com/d1/platform/limits/>

Ése es el camino si algún día se quiere una rama sin proveedores nuevos — pero es
ingeniería que hoy no existe, y sin cuentas de usuario.

---

## Lo que hay que corregir del texto actual, sí o sí

Dos cosas que hoy el asistente afirma y **no se sostienen contra la fuente**:

**1 · «Empieza gratis y SIN TARJETA» no tiene respaldo vigente.** La cita de
Supabase rastrea a un post de marzo de 2021 sobre el pricing de la *beta*, un
esquema que ya no existe; la página de precios actual no lleva la frase. Y
**ninguna página de Cloudflare dice «sin tarjeta»** en ningún lado. Las dos cosas
probablemente sean ciertas en la práctica, pero la copia las afirma sin fuente.

*Qué hacer:* sacar la frase hasta que alguien dé de alta una cuenta real de cada
uno y lo compruebe. Es media hora de trabajo y desbloquea una línea que hoy no se
puede sostener.

**2 · «el proyecto se pausa solo… (se despausa con un clic)» omite que sí avisa.**
Supabase manda un mail una semana antes y otro al pausar. La copia actual hace
sonar la pausa como una trampa silenciosa, y no lo es.
<https://supabase.com/docs/guides/platform/free-project-pausing>

---

## Lo que la investigación NO puede sostener

Va acá porque el escéptico lo tumbó, y porque quien lea esto merece saber sobre
qué **no** se apoya la recomendación:

- **Ninguna métrica de popularidad mide gente no técnica.** La encuesta de Stack
  Overflow es autoselección de desarrolladores; npm mide máquinas y CI; las
  estrellas de GitHub no miden uso; y los «clientes» que reporta MongoDB excluyen
  por definición a los usuarios gratuitos. Sirven para estimar cuánta ayuda vas a
  encontrar cuando algo falle. **No pueden ordenar estas opciones.**
- **Cloudflare no es «2do detrás de AWS»** en Stack Overflow 2025: es 4to entre
  plataformas cloud, detrás de AWS, Azure y Google Cloud.
- **No hay ninguna cifra publicada por Cloudflare sobre D1.**
- **Toda la evidencia de diseño de decisiones viene de otros dominios** —
  mermeladas, aportes jubilatorios, donación de órganos. Ninguna de las ~20
  fuentes mide un flujo de configuración de software con usuarios no técnicos.
- **La propia regla del marco** —«una opción que se ofrece y no funciona es peor
  que no ofrecerla»— no tiene respaldo empírico. Es un principio de diseño, y se
  aplicó como tal.

**Por eso la recomendación no se apoya en popularidad en ningún punto.** Se apoya
en tres cosas verificables: qué genera el andamio, qué límites rompen el trato
después de que la persona ya se comprometió, y cuántas cuentas nuevas hay que
abrir.
