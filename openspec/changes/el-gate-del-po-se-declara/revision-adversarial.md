---
artefacto: revision-adversarial
change: el-gate-del-po-se-declara
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: revisado-espera-al-po
---

# Revisión adversarial — el-gate-del-po-se-declara

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada **entre
builders** mientras rija el desvío `github-review-cruzado-automatizado` de
`AGENTS.md`. **No reemplaza la aprobación del PO**: el change toca
`gobierno-contribucion`. La corrió un agente (Claude) el 2026-09-17, con cuatro
lentes separadas; son independientes en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `gobierno-contribucion`; título inexistente en el spec vivo y
  en los otros changes en vuelo. Sin MODIFIED ni REMOVED.
- El tercer escenario («el desvío no se confunde con el de la revisión cruzada»)
  es exactamente la distinción que el marco acaba de hacer para sí mismo en
  `AGENTS.md`: el desvío de la revisión entre builders **no** toca la
  aprobación del PO. El requirement y el desvío del marco dicen lo mismo.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 | El desvío sobre `openspec-roles` se emite en `herramientas/projects-asistente.mjs:615` |
| 1.2 / 1.3 | Casos «el gate del PO queda declarado, trabajando solo» (`pruebas/init/asistente.test.mjs:918`) y «CON companero el motivo es OTRO» (`:926`) |
| 2.1 | Caso del alcance (`:949`); banco → 39/39 |
| Proposal | «Los otros seis desvíos existen; éste faltaba»: el asistente emite hoy siete reglas (`:586`, `:615`, `:648`, `:663`, `:673`, `:709`, `:735`) |

`CHANGELOG.md`, `[No publicado]`: `:360` y el ajuste de alcance en `:515`.

## Lente 3 — Mordida

Sobre un clon descartable: el desvío emitido sobre otra regla en vez de
`openspec-roles` → **6 rojos**.

## Lente 4 — Consumidores y coherencia

- Un proyecto ya creado no cambia; los que nazcan traen el desvío. Correcto para
  los tres consumidores reales en `@v1.9.6`.
- Coherente con la decisión del PO del 2026-09-17 sobre roles: los roles se
  mantienen como roles y no se agregan nuevos; este change no agrega ninguno.
- Sin pendientes abiertos: la sección 4 es una no-decisión deliberada y escrita.

## Hallazgos

Ninguno que cambie el contrato. Ningún defecto encontrado en el árbol.

## Veredicto

**Revisado; espera el OK del PO para archivarse.** Con el OK, el archive es
mecánico (`aplicar-deltas.mjs el-gate-del-po-se-declara` y `git mv` a
`changes/archive/`).
