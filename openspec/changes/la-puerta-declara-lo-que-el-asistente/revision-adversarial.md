---
artefacto: revision-adversarial
change: la-puerta-declara-lo-que-el-asistente
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: revisado-espera-al-po
---

# Revisión adversarial — la-puerta-declara-lo-que-el-asistente

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada **entre
builders** mientras rija el desvío `github-review-cruzado-automatizado` de
`AGENTS.md`. **No reemplaza la aprobación del PO**: el change toca
`gobierno-contribucion`. La corrió un agente (Claude) el 2026-09-17, con cuatro
lentes separadas; son independientes en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `gobierno-contribucion`; título inexistente en el spec vivo y
  en los otros changes en vuelo. Sin MODIFIED ni REMOVED.
- Las tres cláusulas —mismas declaraciones por los dos caminos, derivar lo que el
  entorno ya trae, y por defecto el caso que **produce** la declaración— son
  propiedades y no nombran la visibilidad: sirven para la próxima declaración que
  un camino pierda.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 / 1.3 | `visibilidadDelRepo()` en `herramientas/projects-puerta.mjs:104`, usada en `:146` |
| 1.2 | `herramientas/plantilla-repos/personalizar.yml:128` pasa `github.event.repository.visibility` |
| 2.1–2.4 | `pruebas/init/puerta.test.mjs` → 28/28 |
| 3.1 | **Superada:** el campo `ambientes` ya no existe en la puerta; lo sacó `promocion-por-ambientes` (su tarea 3.1, tildada). El destino que este change le puso se cumplió |

`CHANGELOG.md`, `[No publicado]`: `:575-589`.

## Lente 3 — Mordida

Sobre un clon descartable: sacar la línea que pasa la visibilidad en
`personalizar.yml` → **1 rojo** (el cruce contra el YAML).

## Lente 4 — Consumidores y coherencia

- **La corrección todavía no llegó a la puerta web que usa la gente.** Medido hoy
  por la API, en modo lectura: el `personalizar.yml` publicado en
  `im-diego-ec/plantilla-sitio` y en `im-diego-ec/plantilla-aplicacion` **no pasa
  la visibilidad** (0 coincidencias). Esas dos plantillas son consumidores reales
  en `@v1.9.6` y se regeneran en el paso 5-bis del release
  (`las-plantillas-no-quedan-atras`). Hasta la próxima versión publicada, un
  proyecto privado que nazca por la puerta web sigue naciendo sin el desvío. Es
  el comportamiento esperado de una corrección en `[No publicado]`, pero hay que
  saberlo: el proposal dice «un proyecto nacido por la puerta web **ahora**
  recibe un desvío más» y eso vale desde el próximo release, no desde hoy.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Media | La corrección no está en las plantillas publicadas hasta el próximo release | Reportado; lo cierra el paso 5-bis del próximo release |
| 2 | Observación | La tarea 3.1 quedó superada por `promocion-por-ambientes` | Anotado |

## Veredicto

**Revisado; espera el OK del PO para archivarse.** Lo que se funde es verdad en
el árbol del marco y muerde.
