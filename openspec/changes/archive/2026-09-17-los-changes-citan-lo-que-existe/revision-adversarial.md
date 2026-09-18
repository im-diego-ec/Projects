---
artefacto: revision-adversarial
change: los-changes-citan-lo-que-existe
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: archivable
---

# Revisión adversarial — los-changes-citan-lo-que-existe

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada mientras rija
el desvío `github-review-cruzado-automatizado` de `AGENTS.md`. La corrió un
agente (Claude) el 2026-09-17, con cuatro lentes separadas. Son independientes
en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `calidad-codigo`, título inexistente en el spec vivo. Sin
  MODIFIED ni REMOVED.
- El tercer escenario («la ruta se corrige y el texto ya no dice lo mismo») no
  tiene compuerta: el change lo declara en su sección 6 y la página de cobertura
  tiene que decirlo al fundirse.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 | La evidencia escrita (`grep -rn "60-infra-aws-secretos" … → 0`) **ya no da 0**: da 2, y las dos son los propios avisos del fork (`stack-estandar/proposal.md:29`, `infra-exigible/proposal.md:17`), que nombran el archivo viejo **como historia**. Lo que la tarea afirma —ninguna **cita** al archivo viejo— sigue siendo verdad: `grep -rn "60-infra-aws-secretos\.md"` fuera de este change y del archive → **0** |
| 2.1 / 2.2 | Los dos avisos existen: `stack-estandar/proposal.md:14`, `infra-exigible/proposal.md:14` |
| 3.1–3.3 | `pruebas/ci-del-marco/changes-citan-lo-que-existe.test.mjs` → 3/3 |

`CHANGELOG.md`, `[No publicado]`: `:595`.

## Lente 3 — Mordida

Sobre un clon descartable: agregar a `stack-estandar/proposal.md` una cita al
canónico que apunta a un archivo inventado (`99-no-existe.md` dentro de la
carpeta del canónico; se escribe partido acá para que esta misma página no
dispare la compuerta que describe) → **1 rojo**.

## Lente 4 — Consumidores y coherencia

- Nada viaja. Correcto.
- **La decisión que el change dejaba para el PO ya está tomada**: el 2026-09-17
  el PO decidió que manda el modelo de **capacidades** y que no se adopta la base
  única de Rigel. El aviso del fork de `stack-estandar` queda como lo que ahora
  es: el recordatorio de que ese change hay que reescribirlo (lote 27 del porte).
- Archivar este change no deja a la compuerta sin qué mirar: siguen activos
  `stack-estandar` e `infra-exigible`, que citan el canónico, así que su guarda
  anti-vacuidad sigue midiendo algo.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Baja | El comando de evidencia de la tarea 1.1 ya no devuelve lo que la tarea dice, porque los avisos nombran el archivo viejo como historia | La tarea queda como estaba (es su registro); acá se deja el comando que mide lo que la tarea afirma |
| 2 | Observación | La decisión «base única o capacidades» ya se tomó | Anotado; el destino es la reescritura de `stack-estandar` |

## Veredicto

**Archivable.** La propiedad que se funde es verdad en el árbol y muerde.
