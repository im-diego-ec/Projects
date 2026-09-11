---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — promocion-por-ambientes

## 1. La promoción del sitio: Local → DEV → PROD

- [x] 1.1 `wrangler.jsonc` declara `preview_urls: true` explícitamente, con el porqué: su default se movió más de una vez, y un ambiente de prueba que existe o no según la versión de wrangler instalada no es un ambiente, es una casualidad.
- [x] 1.2 `desplegar.yml` partido en `dev` y `produccion`. **El segundo no compila**, y eso no es un ahorro: es la garantía. Recompilar haría que lo publicado no sea byte por byte lo que se verificó.
- [x] 1.3 Sonda en los dos tramos, con su propio mensaje: DEV dice «está en DEV, todavía no en producción», no «publicado».
- [x] 1.4 Concurrencia por ambiente (`${{ github.job }}` en el grupo), sin cancelar.
- [x] 1.5 Ningún bloque `env` de wrangler: se usan versiones, no ambientes de wrangler.

> **Verificado el 2026-09-10 contra la documentación de Cloudflare**, que era lo que
> faltaba antes de escribir una línea: `wrangler versions upload` y `versions deploy`
> existen, no son beta, exigen wrangler ≥ 3.40.0 (el andamio trae ^4.127.0), y
> `versions deploy` acepta `--version-tag` —que **resuelve la etiqueta al id**— más
> `--yes` para no quedarse esperando una confirmación que en un runner no llega.
>
> Eso decidió el diseño: el job de DEV sube con `--tag <sha>` y el de PROD promueve
> con `--version-tag <sha>`. **Cero parseo de ids.** Y `--preview-alias dev` da una
> dirección estable en vez de una distinta por versión.
>
> **Lo que NO está verificado y hay que decirlo: esto no se corrió nunca contra una
> cuenta de Cloudflare real.** La forma del workflow tiene banco; su efecto, no.

## 2. La compuerta de PROD, medida y no asumida

> **La tarea suponía un mecanismo y la medición encontró otro mejor.** Lo que
> decía: `puede` → el tramo de PROD pide aprobación de environment;
> `sin-compuertas` → queda detrás de `workflow_dispatch`. O sea, dos pisos
> distintos según el plan, y el plan gratuito privado se quedaba con el más bajo.
>
> **Medido el 2026-09-10 en la documentación de GitHub**, tres hechos:
>
> 1. *«Users with GitHub Free plans can only configure environments for public
>    repositories»* — **es el mismo muro** que la protección de rama. La premisa de
>    la tarea 2.1 era correcta y por eso no hace falta una sonda nueva.
> 2. *«Running a workflow that references an environment that does not exist will
>    create an environment with the referenced name»* — declararlo **no rompe nada**
>    donde no hay compuerta.
> 3. *«A workflow may wait for up to 30 days on environment approvals»*, y el tope
>    de una corrida entera es de **35 días** contando la espera, tras los cuales
>    *«the workflow run is cancelled»*.
>
> **Lo que eso cambió:** el piso no es el environment, es el botón. `workflow_dispatch`
> vale en **todos** los planes, así que la promoción es un acto humano siempre, y el
> environment pasa a ser un **segundo** candado donde el repositorio lo admite. Un
> proyecto en plan gratuito privado ya no se queda sin compuerta: se queda sin
> **tercero**, que es una pérdida mucho más chica y se declara con ese nombre.

- [x] 2.1 La herramienta **mide** si el repositorio admite compuertas de
      environment, y **reusa la medición que ya existía**: `sondarProteccion` pega a
      `repos/<org>/<repo>/rulesets` y clasifica el 403 del plan gratuito como
      `sin-compuertas`. Es el mismo muro, medido arriba. `bloqueDeLaCompuertaDeProd`
      deriva de ese `estado` lo que el proyecto lee en `.github/proteccion-main.md`.
- [x] 2.2 Si admite: el documento del proyecto dice dónde se encienden los
      **Required reviewers** del environment `produccion` —que el workflow ya
      declara— y qué agrega eso al rastro: **quién aprobó**, que no es
      necesariamente quien disparó.
- [x] 2.3 Si no admite: **se declara el desvío**, y se declara con precisión. No
      dice «no hay compuerta» —sería falso, la promoción sigue exigiendo el botón—
      sino «no hay aprobación de terceros»: quien escribe el código puede
      publicarlo sin que nadie más lo mire.
- [x] 2.4 **Escrito, y con la tarea corregida.** Decía «una corrida esperando más
      de 30 días **falla** — deja rojo visible». Medido: la aprobación caduca a los
      **30 días** y la corrida se **cancela** a los **35**. Queda **cancelada, no
      roja**. Prometer un rojo habría mandado a alguien a esperar una señal que
      GitHub no da, que es la clase de error que este change persigue.

### Lo que 2.x arrastró, y no estaba en la tarea

- [x] 2.5 **`produccion` ya no corre solo.** El `needs: dev` hacía que cada merge
      publicara, que es exactamente lo que el requirement «La promoción a producción
      es un acto deliberado con rastro» prohíbe. Hoy sólo corre por
      `workflow_dispatch` con la casilla marcada, y el resumen de DEV dice el commit
      que hay que pegar.
- [x] 2.6 **La promoción comprueba que esa versión pasó por DEV, y en verde.** El
      hueco era real y silencioso: el job de DEV **sube** la versión y **después**
      comprueba que conteste; si lo primero sale bien y lo segundo mal, la versión
      queda cargada en Cloudflare, promovible, indistinguible de una buena.
      Banco: `pruebas/andamio/la-compuerta-de-prod.test.mjs`, que **corre el script**
      contra un `gh` de mentira en vez de leer el YAML.
- [x] 2.7 **Falla cerrado, y los tres desenlaces se distinguen.** «No pude
      preguntar», «nunca se subió» y «se subió y salió rojo» piden tres cosas
      distintas de la persona. Un solo mensaje manda a mirar donde no está el
      problema — y tratar el primero como éxito sería el fail-open que el marco
      persigue con más insistencia.
- [x] 2.8 **El apartamiento tiene nombre** (`sin_pasar_por_dev`) y deja escrito
      quién lo pidió. Es el escenario «Apartarse de la compuerta» del spec delta,
      que hasta ahora no tenía implementación.

## 3. Las dos preguntas que se eliminan

- [x] 3.1 Sale `ambientes` del asistente y de la puerta web. DEV y PROD siempre.
      **Medido antes de sacarla:** con `plataforma=supabase` contestar «uno» o «dos»
      cambiaba **exactamente una clave** —`DOMINIO_DEV`, de `p.workers.dev` a
      `dev.p.workers.dev`— y **ningún archivo**. Con AWS cambiaba tres, pero sólo
      porque AWS hace dos preguntas más.
      El caso simple baja de **9 a 8 preguntas**; con AWS, de 16 a 15. Y las dos
      cuentas de AWS pasan a preguntarse **siempre**: con una sola topología, que
      sean distintas deja de ser opcional.
- [x] 3.2 Sale `plataforma` del menú **para un sitio**, y la medición decidió el
      alcance en vez de la intuición. Medido con `noViajanPorPlataforma` y `derivar`:
      con `forma=sitio` las **tres** opciones producen el **mismo árbol** y lo único
      que cambia es la clave `plataforma` misma. Un sitio publica en Cloudflare elija
      lo que elija.
      **Para una aplicación NO se saca**, y ahí el proposal decía de más: medido,
      `aws` **sí** cambia algo —viaja `infra/` e `infra-prod/`, el Terraform—. La
      pregunta es real; lo que promete de más es su **texto**, que pregunta dónde va a
      correr la aplicación cuando sólo decide si viaja la infraestructura. Eso se
      arregla cuando la promoción exista y la respuesta decida un destino.
      **Efecto medido:** el camino más corto baja de 8 a **7 preguntas**.
- [x] 3.3 Banco: ninguna pregunta del asistente puede tener una sola respuesta
      posible. Evidencia: `pruebas/init/ninguna-pregunta-miente.test.mjs`, que
      contesta el cuestionario entero variando una respuesta por vez y compara lo que
      sale de `derivar()` más los desvíos.
      **El límite, declarado:** caza la pregunta que no cambia **nada**. NO caza la
      que cambia sólo una cadena cosmética —que es el caso que motivó todo esto— y
      ése se encontró midiendo, no con la compuerta.

## 4. La aplicación llega a internet

> **La 4.1 original está contestada y era la pregunta equivocada.** Ver
> [`donde-corre-la-api.md`](donde-corre-la-api.md), medido el 2026-09-10. En
> resumen: el puerto 5432 no era el discriminante —Supabase directo es IPv6 y sus
> poolers son IPv4— y el container era la pieza equivocada. Cloudflare documenta
> **Worker + Hyperdrive + `node-postgres`**, con Supabase nombrado, **a 0 USD/mes** y
> sin reescribir la aplicación (`node:http` + `httpServerHandler`).
>
> Y el container, además de no ser el camino, **no es la opción barata**: los «~5
> USD» eran el mínimo de cuenta, no el precio. Prendido todo el mes son ~12 USD,
> ~72% más que Render.

- [x] 4.1 ~~¿Puede un container abrir TCP saliente al 5432?~~ **Contestada y
      reformulada.** La ruta es Worker + Hyperdrive. El container queda descartado
      por costo y por encaje: Cloudflare *no garantiza que una instancia siga
      corriendo*, el disco es efímero, duerme a los 10 minutos y arranca en frío en
      1–3 s.
- [ ] 4.1a **MEDICIÓN, y ahora cuesta cero.** ¿Hyperdrive conecta contra un Supabase
      del plan gratuito? Su cadena *Direct* es IPv6. Si falla, **no se cambia de
      proveedor: se cambia de cadena** —el pooler compartido es IPv4 en todo plan—.
      Es un formulario del navegador.
- [ ] 4.1b ¿El andamio pasa de **10 ms de CPU** por invocación (plan gratuito)? La
      espera de Postgres **no** cuenta; cuenta el trabajo de la app. Si se pasa, la
      ruta sigue siendo la más barata: Workers Paid, 5 USD.
- [ ] 4.1c ¿`httpServerHandler` levanta **esta** app de Express sin tocarla? Decide
      si «no hay que reescribir» es cierto para este andamio y no sólo en general.
- [ ] 4.2 Adaptador de la mitad API sobre **Worker + Hyperdrive**, con las dos
      cadenas de conexión que el andamio necesita: el **pooler** para el cliente y la
      **directa** para las migraciones —el pooler en modo transacción no soporta
      *prepared statements*—. En plan gratuito la directa es IPv6, así que las
      migraciones salen por **session mode (5432)** del pooler compartido.
- [ ] 4.3 `desplegar.yml` viaja también con `forma=aplicacion`.
- [ ] 4.4 Las migraciones corren **dentro** del despliegue, no como paso aparte.

## 4-bis. Lo que la medición destapó y no se buscaba

- [ ] 4bis.1 **Supabase Free permite 2 proyectos activos y los pausa a la semana de
      inactividad.** Dev + Prod consume el cupo entero, y **el que se va a pausar es
      DEV**, que es el de menos tráfico. El siguiente escalón son 25 USD/mes. Hay que
      decirlo en `docs/03-stack.md` antes de que alguien lo descubra con su idea
      adentro.
- [ ] 4bis.2 La promesa de costo del marco se reescribe con los números medidos:
      nunca «~5 USD» a secas.

## 5. Supabase deja de ser sólo auth

- [ ] 5.1 El adaptador de Supabase contesta las cuatro capacidades que el marco
      declara obligatorias, no dos. Hoy `plantilla/infra/adaptadores.md` §supabase
      tiene abierto *«quién cubre (a) y (d)»*.

## 6. Lo que la promoción desbloquea

- [ ] 6.1 El paquete `e2e/` deja de estar excluido «porque corre en la promoción»
      y **corre en la promoción**, contra la dirección de DEV.
      **BLOQUEADA POR 4.3, y la medición lo demuestra.** Las dos formas no se tocan:
      medido con `noViajanPorForma`, una **aplicación** no recibe
      `.github/workflows/desplegar.yml` —no tiene despliegue ni dirección de DEV— y
      un **sitio** no recibe `e2e`. Así que la forma que tiene la suite no tiene
      dónde correrla, y la que tiene dónde no tiene la suite.
      Escribir hoy el paso sería agregar una compuerta que **no puede dispararse
      nunca**, que es exactamente lo que el `guardrail-deltas` de este repo existe
      para impedir. Se desbloquea cuando `desplegar.yml` viaje también con
      `forma=aplicacion` (tarea 4.3).
- [x] 6.2 El desvío se **acota** donde la promoción existe, en vez de cerrarse o
      repetirse. Para un **sitio** ya no dice «no hay deploy a dev» —lo hay— sino qué
      queda fuera de la cadena de seis pasos que la regla describe, y distingue lo
      que **no aplica** (el smoke de API: un sitio no tiene API) de lo que **falta**
      (el E2E). Para una **aplicación** sigue entero, nombrando la mitad API.
      El banco del marco lo cazó: su barrido exige que **toda** combinación declare
      el desvío, y quitarlo para un sitio lo puso rojo. Tenía razón — la regla promete
      seis pasos y un sitio tiene cuatro.
- [x] 6.3 `docs/03-stack.md` describe la promoción en el idioma de quien la va a
      usar: sube a una copia de prueba que podés abrir y compartir, la mirás, y
      producción publica **esa misma versión** sin recompilar. Con las dos
      advertencias que se pagan caro si sorprenden: la dirección de prueba es
      **pública**, y es la primera que se duerme por inactividad en un plan gratuito.

## 7. Verificación

- [ ] 7.1 Probado contra un consumidor real antes de publicar, con su terna en el
      `CHANGELOG.md` (lo exige el paso 6 del release desde `la-evidencia-del-ensayo-viaja`).
- [ ] 7.2 Banco completo en verde.

## 8. Alcance declarado, que NO entra acá

- **El camino Supabase/Cloudflare → GCP/AWS** (la mudanza cuando la idea crece) no
  se escribe en este change. Es la segunda mitad de la razón de ser de Projects y
  merece el suyo. **Destino:** change propio, después de que la promoción exista.
