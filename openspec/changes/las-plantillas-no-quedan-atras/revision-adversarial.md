---
artefacto: revision-adversarial
change: las-plantillas-no-quedan-atras
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: revisado-espera-al-po
---

# Revisión adversarial — las-plantillas-no-quedan-atras

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada **entre
builders** mientras rija el desvío `github-review-cruzado-automatizado` de
`AGENTS.md`. **No reemplaza la aprobación del PO**: el change toca
`gobierno-contribucion`. La corrió un agente (Claude) el 2026-09-17, con cuatro
lentes separadas; son independientes en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `gobierno-contribucion`; título inexistente en el spec vivo y
  en los otros changes en vuelo. Sin MODIFIED ni REMOVED.
- El segundo escenario («aparece un consumidor nuevo de esa clase → el pipeline
  falla hasta que el procedimiento lo nombre») tiene compuerta: la lista sale de
  `PLANTILLAS` (`herramientas/projects-plantilla-repos.mjs:46`) y el banco exige
  que el release las nombre a todas.
- El primero y el tercero son actos del release (consultar GitHub), no del
  pipeline, y el change lo declara: el banco garantiza que el paso **siga
  escrito**, no que se corra.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1–1.3 | Paso 5-bis en `.claude/skills/projects-release/SKILL.md:372`, con el bucle sobre las dos plantillas y la comprobación de `is_template` |
| 2.1–2.4 | `pruebas/docs/plantillas-al-dia.test.mjs` → 4/4 |
| 3.3 | **Re-medido hoy** por la API, en modo lectura: las dos pinan `marco-ci.yml@v1.9.6` y las dos tienen `is_template: true` |

`CHANGELOG.md`, `[No publicado]`: `:340-349`.

## Lente 3 — Mordida

Sobre un clon descartable: el release deja de nombrar `plantilla-aplicacion` →
**1 rojo**.

## Lente 4 — Consumidores y coherencia

- Las dos plantillas **son** dos de los tres consumidores reales en `@v1.9.6`, y
  este change es el único mecanismo que las alcanza, porque el canal habitual
  (el PR de Dependabot) no les llega a moldes que nadie mantiene. Coherente con
  la decisión del PO de seguir con Dependabot como canal: el 5-bis es el
  complemento para lo que Dependabot no cubre.
- El 5-bis compara el **pin**; no compara el contenido del `personalizar.yml`
  publicado. Medido hoy (ver la revisión de `la-puerta-declara-lo-que-el-asistente`):
  las plantillas publicadas llevan un `personalizar.yml` anterior a una corrección
  que ya está en el marco. Mientras la corrección viaje junto con un cambio de
  versión, el pin la arrastra; una corrección de `personalizar.yml` que no mueva
  el pin no la vería nadie.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Media | El 5-bis mira el pin de las plantillas, no si su `personalizar.yml` es el vigente | Reportado al PO como posible ampliación del paso; no se corrige en un archive |

## Veredicto

**Revisado; espera el OK del PO para archivarse.** Lo que se funde es verdad y
muerde; el hallazgo 1 es una ampliación, no una contradicción.
