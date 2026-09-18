---
artefacto: revision-adversarial
change: una-sola-lista-de-plataformas
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: archivable
---

# Revisión adversarial — una-sola-lista-de-plataformas

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada mientras rija
el desvío `github-review-cruzado-automatizado` de `AGENTS.md`. La corrió un
agente (Claude) el 2026-09-17, con cuatro lentes separadas. Son independientes
en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `base-tecnologica`, que **no existe** en `openspec/specs/`: el
  archive crea la capability con este único requirement.
- **El orden importa y se respeta.** `stack-estandar` también escribe en
  `base-tecnologica`, con tres ADDED de títulos distintos. Archivar este primero
  deja la capability viva, y los tres de `stack-estandar` pasan a ser deltas en
  vuelo sobre una capability existente, que es lo que ese change va a necesitar
  cuando se reescriba (lote 27 del porte). Ningún título choca.
- El requirement es una propiedad («no divergen en silencio») y no fija cuáles
  son las plataformas: sobrevive a que `cloudflare` o `gcp` se implementen.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 / 1.2 | `herramientas/projects-init.mjs:738` (`PLATAFORMAS`), `:760` (`PLATAFORMAS_PENDIENTES`), `:765` (derivada) |
| 2.1 | `:796`: la pendiente recibe su propio mensaje |
| 3.1–3.3 | `pruebas/andamio/una-sola-lista-de-plataformas.test.mjs` → 8/8 (el change decía 5/5: el banco creció después, con el caso del mensaje sin carpeta de change y el del numeral) |
| 4bis.1 | La fila existe en `openspec/cobertura-de-requirements.md`, sección de `base-tecnologica` |

Las cuatro copias siguen diciendo cinco: `plantilla/AGENTS.md:125`,
`actions/constitucion/canonico/60-infra-plataforma-secretos.md:14`, el banco
vecino, y la suma de las dos listas de la herramienta.

`CHANGELOG.md`, `[No publicado]`: `:669-675`.

## Lente 3 — Mordida

Sobre un clon descartable: sacar `gcp` de la lista de `plantilla/AGENTS.md` →
**1 rojo**.

## Lente 4 — Consumidores y coherencia

- La constitución y el canónico no se tocaron; cambió la herramienta de arranque.
  Nada llega a los tres consumidores reales por su pipeline.
- Coherente con la decisión del PO del 2026-09-17 (manda el modelo de
  capacidades, con la plataforma elegida por el proyecto).
- El pendiente («implementar `cloudflare` y `gcp`») tiene dueño:
  `promocion-por-ambientes`.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Observación | La tarea 4.1 dice 5/5 y hoy el banco tiene 8 casos | Nada: la tarea registró su momento; la corrida de hoy es 8/8 |

## Veredicto

**Archivable, y antes que `stack-estandar`.**
