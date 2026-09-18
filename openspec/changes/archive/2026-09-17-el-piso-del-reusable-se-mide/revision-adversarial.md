---
artefacto: revision-adversarial
change: el-piso-del-reusable-se-mide
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: archivable-con-correcciones
---

# Revisión adversarial — el-piso-del-reusable-se-mide

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada mientras rija
el desvío `github-review-cruzado-automatizado` de `AGENTS.md`. La corrió un
agente (Claude) el 2026-09-17, con cuatro lentes separadas. Son independientes
en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `calidad-codigo`, con un título que no existe en el spec vivo.
  Sin MODIFIED ni REMOVED.
- El requirement dice «SHALL fallar cuando se quede corta» y el design elige
  «al menos», no «exactamente». Contrato y design coinciden.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 | `pruebas/andamio/piso-del-reusable.test.mjs` lee los tres archivos (`DECLARAN`, `:12-16`) → 4/4 |
| 1.2 | Caso «el reusable exige algo» (`:120`) |
| 1.3 | Caso «MUERDE: si el reusable gana un permiso» (`:141`) |

Las líneas que el proposal cita (`marco-ci.yml:56`, `plantilla/…/ci.yml:26`,
`.github/workflows/ci.yml:32`) se corrieron con el árbol: hoy el bloque del
andamio está en `plantilla/.github/workflows/ci.yml:32`. Es una cita con fecha,
no un defecto; la compuerta lee por forma, no por línea.

`CHANGELOG.md`, `[No publicado]`: `:380`.

## Lente 3 — Mordida

Sobre un clon descartable: quitar `pull-requests: read` del encabezado de
`plantilla/.github/workflows/ci.yml` → **2 rojos** en el banco.

## Lente 4 — Consumidores y coherencia

- La compuerta corre en el CI del marco y solo **lee** los tres archivos; nada
  viaja. Correcto para los tres consumidores reales.
- **El pendiente declarado ya tiene dueño:** que «cae al fail-open» es falso y
  lo que pasa es un `startup_failure` es el ítem `startup-failure-medido` del
  lote 5 del porte (`el-marco-deja-de-afirmar-lo-que-no-hace`).

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Baja | El caso central del banco se llamaba «los tres bloques declaran **EXACTAMENTE** el piso» y lo que comprueba es «**al menos**», que es lo que el design decide. Un nombre de caso que dice otra cosa que su aserción es la prosa y el mecanismo divergiendo, en el banco que existe para que no diverjan | **Corregido en esta revisión:** el caso se llama ahora «los tres bloques conceden AL MENOS el piso que el reusable exige (de mas no es el fallo que esto ataja)». Banco 4/4 |

## Veredicto

**Archivable, con la corrección hecha.** El contrato que se funde es verdad en
el árbol y la compuerta muerde.
