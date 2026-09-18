---
artefacto: revision-adversarial
change: un-solo-predicado-del-desvio
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: revisado-espera-al-po
---

# Revisión adversarial — un-solo-predicado-del-desvio

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada **entre
builders** mientras rija el desvío `github-review-cruzado-automatizado` de
`AGENTS.md`. **No reemplaza la aprobación del PO**: el change toca
`gobierno-contribucion`. La corrió un agente (Claude) el 2026-09-17, con cuatro
lentes separadas; son independientes en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `gobierno-contribucion`; título inexistente en el spec vivo y
  en los otros changes en vuelo. Sin MODIFIED ni REMOVED.
- **Choca con una decisión del PO posterior al change.** El requirement dice que
  la excepción incompleta «SHALL seguir surtiendo efecto» y que el cambio de
  veredicto «SHALL viajar en una línea mayor». El 2026-09-17 el PO decidió que una
  compuerta nueva o endurecida se exige **en rojo el día que sale** y que se
  termina el modo aviso como regla general, **salvo** cuando el arreglo queda
  fuera del árbol del consumidor. Completar un desvío es editar
  `.projects-desvios.json`, que **está** en el árbol del consumidor. Hay una
  lectura compatible —la misma decisión abre la línea v2 una sola vez con todos
  los breaking juntos, y endurecer este aviso rompe a un repo que hoy pasa—, pero
  el requirement, fundido así, fija como contrato el modo aviso que la decisión
  quiere terminar.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 / 1.2 | El paso «Permisos del agente sin escritura» de `.github/workflows/marco-ci.yml` lee `fecha` y `aprobado_por` y avisa sin cambiar el veredicto |
| 2.1 / 2.2 | Casos «uno COMPLETO no avisa» y «MUTACION» en `pruebas/marco-ci/permisos-compuerta.test.mjs`; el banco → 13/13 |

`CHANGELOG.md`, `[No publicado]`: `:428` (y `:519`, el aviso que nombra las dos
faltas a la vez).

## Lente 3 — Mordida

Sobre un clon descartable: el predicado del aviso cambiado por `if (false)` en
el workflow → **5 rojos**.

## Lente 4 — Consumidores y coherencia

- Un aviso nuevo en repos con desvíos incompletos, sin cambio de veredicto: para
  los tres consumidores reales en `@v1.9.6`, compatible.
- El pendiente declarado («un solo predicado de verdad», que exige mover la
  lectura de desvíos a la composite action) sigue sin dueño en el plan del porte.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Alta | El requirement fija el modo aviso como contrato, y la decisión del PO del 2026-09-17 lo termina como regla general | Reportado al PO: decidir si el requirement dice «hasta la línea v2» (y el endurecimiento entra en la lista de breaking de la v2) o se reescribe |
| 2 | Media | El predicado único sigue sin dueño | Reportado como pendiente del porte |

## Veredicto

**Revisado; espera al PO, y con el hallazgo 1 resuelto antes de fundir.** Lo que
el árbol hace es verdad y muerde; lo que hay que decidir es si el contrato lo
congela así.
