# Dónde corre la API — la medición de la tarea 4.1

> **Consultado el 2026-09-10.** Todo lo de acá sale de documentación oficial salvo
> lo marcado como *inferencia* o *sin verificar*. Los precios cambian: cada número
> cita su página.

## La respuesta corta

**La pregunta estaba mal formulada, y la respuesta correcta es más barata que las
dos opciones que la tarea contemplaba.**

La tarea 4.1 pregunta si un **container** de Cloudflare puede abrir TCP saliente al
**5432**. Dos problemas:

1. **El puerto 5432 no es el discriminante.** Supabase documenta que *«Direct
   connections are on IPv6, or on IPv4 if the project has the IPv4 add-on»*, y sus
   poolers compartidos (Supavisor) son *IPv4-only*, con **session mode en el 5432** y
   **transaction mode en el 6543**. Preguntar «¿sale TCP al 5432?» no distingue la
   conexión directa del pooler, que es la distinción que decide todo.
2. **El container es la pieza equivocada.** Cloudflare ya documenta —oficialmente, y
   con Supabase nombrado— la combinación que resuelve esto **sin container y sin
   costo**.

## La ruta que Cloudflare sí documenta

**Worker + Hyperdrive + `node-postgres`.**

| Pieza | Qué aporta | Fuente |
|---|---|---|
| **Workers** | el cómputo. `connect()` de `cloudflare:sockets` abre TCP saliente, y la doc usa **5432 como ejemplo literal** | *TCP sockets*, Workers runtime API (act. 19-jun-2026) |
| **Hyperdrive** | pooler y acelerador hacia un Postgres externo, como *binding* del Worker | *Supported databases and features* (act. 21-abr-2026) |
| **Supabase** | soportado **por nombre**, con guía dedicada y el SQL del rol | *Connect Hyperdrive to a Supabase Postgres database* |

**Y no exige reescribir la aplicación**, que era el costo escondido que hacía temer
esta ruta: Cloudflare implementó las APIs de `node:http` —cliente y servidor— en
Workers y publicó `httpServerHandler`, anunciándolo como *«allowing developers to
migrate existing Node.js applications with minimal code changes»*.

## El costo, que es la parte que da vuelta la decisión

| Opción | Un ambiente | Dev + Prod | Nota |
|---|---|---|---|
| **Worker + Hyperdrive** | **0 USD** | **0 USD** | Hyperdrive *«is included in both the Free and Paid Workers plans»*: 100.000 consultas/día |
| Container que duerme | ~5 USD | ~5,13 USD | los 5 USD son **mínimo de cuenta**, no precio del container |
| Container 24/7 | ~12 USD | ~19,41 USD | *inferencia* sobre la tabla de precios |
| Render | ~7 USD | ~14 USD | **no 13**: el planteo sumaba una base de Render que acá no hace falta, porque la base es Supabase |

**Los «~5 USD/mes» del planteo original eran falsos como estaban escritos.** Son el
piso de la cuenta de Workers Paid; encima se factura memoria y disco **por segundo
mientras el container está despierto**. Un container `basic` prendido todo el mes no
son 5 USD: son ~12.

Y con eso, **Cloudflare Containers deja de ser «la opción barata»**: para un servicio
siempre prendido sale ~72% más que Render.

## Por qué el container es mal encaje, además de caro

Cuatro frases de la documentación oficial, y cualquiera alcanza:

- *«Cloudflare does not guarantee that any container instance will run for any set
  period of time.»*
- *«All disk is ephemeral. When a Container instance goes to sleep, the next time it
  is started, it will have a fresh disk.»*
- El default de `sleepAfter` es **10 minutos**: la API se duerme sola, y el próximo
  visitante paga un arranque en frío de **1 a 3 segundos** más el arranque de la app.
- *«Is built-in autoscaling for stateless applications available? Not today, though
  Cloudflare plans to add built-in autoscaling in a future release.»*

Para un no-coder que le muestra su idea a alguien, «se reinicia sola cada tanto y a
veces tarda tres segundos en despertar» no es un detalle de infraestructura: es la
primera impresión.

**Containers salió de beta el 2026-04-13** —eso sí cambió desde el análisis
anterior— pero GA no trae ninguna garantía de permanencia: la FAQ con esas frases
está *«Last updated: Aug 28, 2026»*, cuatro meses **después** del GA.

## Lo que sigue sin verificarse, y es una sola cosa

**No se pudo confirmar que Hyperdrive alcance la cadena *Direct* de un proyecto
Supabase del plan gratuito.** Chocan tres hechos: Cloudflare dice usar la cadena
*Direct connection*; esa cadena es **IPv6** en el plan gratuito; y el add-on de IPv4
es de organizaciones Pro (~4 USD/mes).

**Pero esta incógnita es mucho más barata que la original.** Si falla, no se cambia
de proveedor: se cambia de **cadena de conexión** — se usa el pooler compartido, que
es IPv4 en todos los planes.

## Dos hallazgos que no se buscaban y cambian el andamio

**1. La plantilla necesita DOS cadenas de conexión, no una.** El pooler en modo
transacción no soporta *prepared statements*, así que el cliente va por el pooler y
**las migraciones por la conexión directa**. Y como en el plan gratuito la directa es
IPv6, las migraciones tienen que salir por **session mode (5432)** del pooler
compartido.

**2. Supabase Free permite 2 proyectos activos, y los pausa a la semana de
inactividad.** Dev + Prod consume el cupo entero. Y **el que se va a pausar es
justamente DEV**, que es el que menos tráfico tiene. El siguiente escalón son **25
USD/mes**.

## El riesgo real de la ruta ganadora

No es el TCP ni el driver: son **10 ms de CPU por invocación** en el plan gratuito de
Workers. Con una salvedad importante: *«Waiting on network requests … does NOT count
toward CPU time»*, o sea que **la espera de Postgres no cuenta**. Lo que cuenta es el
trabajo real de la app.

Si se pasa, la ruta sigue siendo la más barata: Workers Paid son 5 USD/mes con 5
minutos de CPU por invocación.

## Lo que hay que medir ahora, y cuesta cero

Reemplaza a la tarea 4.1. **No exige escribir una línea de código antes de saber la
respuesta**, y ninguna cuesta dinero:

1. **¿Hyperdrive conecta contra un Supabase Free?** Crear un binding de Hyperdrive
   con la cadena *Direct* del proyecto. Si falla por IPv6, reintentar con la del
   pooler compartido en session mode. **Es un formulario del navegador.**
2. **¿El andamio pasa de 10 ms de CPU?** Desplegar la API tal cual y leer el
   `startup_time_ms` que reporta wrangler más el CPU time del log de invocación.
3. **¿`httpServerHandler` levanta esta app de Express sin tocarla?** Es la que decide
   si «no hay que reescribir» es cierto **para esta aplicación** y no en general.

Las tres se hacen en una tarde, sin tarjeta, y la primera decide las otras dos.
