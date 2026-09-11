# ¿La API del andamio entra en un Worker? — la medición de la tarea 4.1c

**Medido el 2026-09-10**, corriendo el andamio de verdad dentro de **workerd** —el
mismo runtime que usa Cloudflare en producción— con `wrangler dev` 4.131.0, wrangler
local, **sin cuenta de Cloudflare y sin desplegar nada**.

## La respuesta corta

**Sí, y sin tocar una sola línea de la aplicación.** Lo único que hubo que escribir
son **cuatro líneas** de un archivo nuevo:

```ts
import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./src/app.js";

createApp().listen(8080);
export default httpServerHandler({ port: 8080 });
```

Y con la configuración que la documentación pide: `compatibility_date` ≥ `2025-09-01`
y los flags `nodejs_compat` + `enable_nodejs_http_server_modules`.

> **Por qué esta pregunta importaba.** La ruta Worker + Hyperdrive es la que hace que
> la mitad API cueste **0 USD/mes**, y toda su ventaja se apoyaba en una frase de
> Cloudflare —*«migrate existing Node.js applications with minimal code changes»*—
> dicha **en general**. «Mínimos cambios» sobre *esta* aplicación podía significar
> desde cuatro líneas hasta reescribir el acceso a datos. Eran cuatro líneas.

## Qué se ejercitó, y qué contestó cada cosa

| Se pidió | Contestó | Qué prueba |
|---|---|---|
| `GET /api/health` | **200** con el JSON del andamio | Express 5 corre, rutea y serializa |
| `GET /api/hello` sin token | **401** `{"error":"No autenticado"}` | el middleware de auth corre y **falla cerrado**, que es su razón de ser |
| `GET /api/db/health` | **503**, y en el log `PrismaClientKnownRequestError · 3D000 · database "medicion" does not exist` | **el hallazgo más importante**: ver abajo |
| `GET /api/nada` | **404** | la cadena llega hasta el `errorHandler` |
| cabeceras de `/api/health` | `X-Request-Id: local-…` y `Access-Control-Allow-Origin` | `requestId` y `cors` corren, en orden |

### El 503 es la mejor noticia de toda la medición

`3D000` es **el código de error de PostgreSQL para «esa base no existe»**. O sea que
no falló el driver: **falló el servidor de base de datos, contestando**. Para llegar a
ese error, desde adentro del Worker, tuvo que pasar todo esto:

1. `@prisma/client` cargó,
2. `@prisma/adapter-pg` cargó,
3. `pg` **abrió un socket TCP** y completó el saludo del protocolo,
4. Postgres procesó la consulta y devolvió su código de error.

Que es exactamente la pieza que daba miedo: *«no es Node completo: hay que verificar
cada dependencia nativa antes de prometer nada»*, dice el propio documento de
adaptadores. Verificada.

## Y el arranque completo también entra, que no se esperaba

La primera hipótesis era que `src/app.ts` entraría y `src/server.ts` no —tiene
`dotenv/config`, `process.on("SIGTERM")`, `process.on("SIGINT")` y `process.exit`—.
Se midió, importando `iniciar()` en vez de `createApp()`: **contestó 200 igual**.

> **Y la primera corrida de esa prueba dio un falso negativo que casi se anota como
> hallazgo.** Salió 500 con *«Http server with port 8080 not found»*, que parece el
> síntoma exacto de «`listen()` no funciona en Workers». No era eso: el guard
> fail-closed del andamio había abortado el arranque porque `ALLOW_DEV_AUTH` **no
> llega al Worker desde el shell** —en Workers `process.env` se llena desde la
> configuración y el `.env`, no del proceso padre—, así que nunca se llamó a
> `listen()`. Puesta la variable donde el Worker la lee, arrancó.
>
> Queda anotado porque es la clase de error que contamina una medición entera:
> atribuirle a la plataforma lo que era del arnés.

## Dos hallazgos que no se buscaban

**1. El reloj arranca en cero.** La línea de log del arranque salió con
`"ts":"1970-01-01T00:00:00.000Z"`. En Workers el tiempo está congelado hasta la
primera E/S, así que **todo lo que el andamio loguee al arrancar va a llevar epoch
cero**. No rompe nada y desorienta a cualquiera que investigue un incidente leyendo
marcas de tiempo.

**2. El bundle entra, y ya usa la mitad del presupuesto.** Medido con
`wrangler deploy --dry-run`:

```
Total Upload: 5233.33 KiB / gzip: 1583.54 KiB
```

El plan gratuito de Workers admite **3 MB comprimidos**. Entra —con Express, Prisma,
`pg`, `jose`, `zod` y `cors` adentro— pero **arranca gastando ~52% del techo**. No es
un problema hoy; es un número que hay que volver a mirar antes de agregar una
dependencia grande, y por eso queda escrito con su fecha.

## Lo que esta medición NO afirma

- **No se desplegó nada.** Corrió en `wrangler dev` local, que usa workerd —el mismo
  runtime— pero no es lo mismo que un Worker publicado. Lo que queda sin medir es el
  borde de red de producción, no el de lenguaje.
- **No se midió el consumo de CPU** (tarea 4.1b). El log mostró `1 ms` de reloj para
  `/api/health` en repeticiones, y **el reloj no es la CPU**: el presupuesto del plan
  gratuito son 10 ms de **CPU**, y la espera de la base no cuenta. Que la petición más
  barata tarde 1 ms de reloj es una señal buena, no una medición.
- **No se conectó por Hyperdrive**, sino directo a un Postgres local. Que Hyperdrive
  alcance un Supabase del plan gratuito sigue siendo la medición A de
  [`la-medicion-en-vivo.md`](la-medicion-en-vivo.md).

## Qué habilita

La tarea **4.2** —el adaptador de la mitad API sobre Worker + Hyperdrive— deja de
tener riesgo de lenguaje: lo que falta decidir es **cuál de las dos cadenas de
conexión** va en el andamio, que es lo que contesta la medición A. Y la frase «no hay
que reescribir la aplicación» pasa de ser una cita de Cloudflare a ser un hecho
medido sobre *este* andamio.
