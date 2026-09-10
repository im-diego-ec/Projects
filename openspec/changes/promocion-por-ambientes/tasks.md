---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — promocion-por-ambientes

## 1. La promoción del sitio: Local → DEV → PROD

- [ ] 1.1 `wrangler.jsonc` del andamio declara `preview_urls` **explícitamente**,
      con el comentario que dice por qué no se deja al default.
- [ ] 1.2 `desplegar.yml` se parte en dos tramos: **subir versión** (DEV) y
      **promover esa misma versión** (PROD). El segundo no vuelve a compilar.
- [ ] 1.3 La sonda post-despliegue corre en los **dos** tramos, contra la
      dirección de cada uno. La de DEV es la que decide si se promueve.
- [ ] 1.4 La concurrencia se serializa **por ambiente**, y sigue sin cancelar.
- [ ] 1.5 No se declara ningún bloque `env` de wrangler (obliga a `--env` en todo
      comando y ensucia cada corrida con un warning).

## 2. La compuerta de PROD, medida y no asumida

- [ ] 2.1 La herramienta **mide** si el repositorio admite compuertas de
      environment, con el mismo patrón que `proteccion-main.md`.
- [ ] 2.2 Si admite: el tramo de PROD pide aprobación del environment.
- [ ] 2.3 Si no admite: PROD queda detrás de `workflow_dispatch` y **se declara el
      desvío**. No se finge una compuerta que no existe.
- [ ] 2.4 Queda escrito que una corrida esperando aprobación más de 30 días
      **falla** — deja rojo visible, no silencio.

## 3. Las dos preguntas que se eliminan

- [ ] 3.1 Sale `ambientes` del asistente (`projects-asistente.mjs`) y de la puerta
      web. DEV y PROD siempre.
- [ ] 3.2 Sale `plataforma` del menú: el andamio sabe generar una sola rama que
      funciona. `PLATAFORMAS` queda para el archivo de valores, no para el menú.
- [ ] 3.3 Banco: ninguna pregunta del asistente puede tener una sola respuesta
      posible. Es la compuerta que impide que esto vuelva a pasar.

## 4. La aplicación llega a internet

- [ ] 4.1 **BLOQUEANTE — la medición de una tarde.** ¿Puede un container de
      Cloudflare abrir una conexión TCP saliente al puerto 5432 de Postgres? La
      documentación de Cloudflare no lo afirma. **Sin esta medición no se escribe
      el adaptador**, porque elegir proveedor a ciegas compromete a cada proyecto
      nuevo con esa elección.
- [ ] 4.2 Según 4.1: adaptador de la mitad API sobre Cloudflare Containers
      (~5 USD, cero proveedores nuevos) **o** sobre Render (13 USD, con
      `pre-deploy command` para `prisma migrate deploy`).
- [ ] 4.3 `desplegar.yml` viaja también con `forma=aplicacion`.
- [ ] 4.4 Las migraciones corren **dentro** del despliegue, no como paso aparte.

## 5. Supabase deja de ser sólo auth

- [ ] 5.1 El adaptador de Supabase contesta las cuatro capacidades que el marco
      declara obligatorias, no dos. Hoy `plantilla/infra/adaptadores.md` §supabase
      tiene abierto *«quién cubre (a) y (d)»*.

## 6. Lo que la promoción desbloquea

- [ ] 6.1 El paquete `e2e/` deja de estar excluido «porque corre en la promoción»
      y **corre en la promoción**, contra la dirección de DEV.
- [ ] 6.2 El desvío sobre `promocion-por-ambientes` se cierra donde la promoción
      exista de verdad, y se sigue declarando donde no.
- [ ] 6.3 `docs/03-stack.md` dice qué publica cada camino, con su columna de estado.

## 7. Verificación

- [ ] 7.1 Probado contra un consumidor real antes de publicar, con su terna en el
      `CHANGELOG.md` (lo exige el paso 6 del release desde `la-evidencia-del-ensayo-viaja`).
- [ ] 7.2 Banco completo en verde.

## 8. Alcance declarado, que NO entra acá

- **El camino Supabase/Cloudflare → GCP/AWS** (la mudanza cuando la idea crece) no
  se escribe en este change. Es la segunda mitad de la razón de ser de Projects y
  merece el suyo. **Destino:** change propio, después de que la promoción exista.
