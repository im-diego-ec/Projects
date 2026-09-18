---
artefacto: revision-adversarial
change: el-andamio-dice-la-verdad
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: archivable
---

# Revisión adversarial — el-andamio-dice-la-verdad

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada mientras rija
el desvío `github-review-cruzado-automatizado` de `AGENTS.md`. La corrió un
agente (Claude) el 2026-09-17, con cuatro lentes separadas —cada una con su
pregunta, su evidencia y su propia corrida—. Son independientes en el
**método**, no en el agente: no son cuatro personas ni cuatro agentes, y no se
presentan como tales.

## Lente 1 — Contrato: ¿el archive borra, duplica o inventa contrato?

- El delta es **un solo ADDED** en `documentacion-del-marco`, que no existe en
  `openspec/specs/`: el archive **crea** la capability. Sin MODIFIED ni REMOVED,
  así que no hay escenarios vigentes que se puedan perder.
- El título no colisiona con el otro change que funde en la misma capability
  (`orden-de-lectura`, dos ADDED de títulos distintos). Orden de archive: este
  primero, que es también el orden en que la página de cobertura ya los listaba.
- Escenarios en `WHEN`/`THEN`, enunciados como propiedades.
- **Observación, no bloqueante:** el escenario «Un documento del andamio describe
  una herramienta» dice que la afirmación falsa «corresponde al comportamiento
  vigente, **o el pipeline la trata como defecto**». Ningún caso del banco lo
  hace hoy; la página de cobertura ya lo declara **parcial** con ese alcance
  escrito. Es un requirement sin compuerta completa, no una afirmación falsa.

## Lente 2 — Evidencia: ¿cada casilla tildada se sostiene hoy en el árbol?

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 | `plantilla/docs/accesos.md` existe, con la columna de bus factor (`:14`, `:17`); el canónico lo cita en `actions/constitucion/canonico/60-infra-plataforma-secretos.md:87` |
| 1.2 / 1.3 | `plantilla/infra/adaptadores.md:72` registra la frase vieja como vieja, y `:91` abre «La mudanza» |
| 1.4 | `plantilla/.github/workflows/desplegar.yml:8-9` dice plan gratuito y que lo de la tarjeta «NO esta comprobado por el marco» |
| 1.5 | `plantilla/.github/workflows/ci.yml:383-388` nombra `promocion-por-ambientes` y su tarea 6.1, que sigue abierta (`openspec/changes/promocion-por-ambientes/tasks.md:216`) |
| 2.1 / 2.2 | `node --test pruebas/docs/lo-que-lee-el-consumidor.test.mjs` → 6/6; `pruebas/docs/promesas-sin-fuente.test.mjs` → 3/3 |

`CHANGELOG.md`, sección `[No publicado]`: `:315` (la mudanza), `:617` (la promesa
sin fuente), `:649` (`accesos.md`).

## Lente 3 — Mordida: ¿la compuerta se pone roja sola?

Sobre un clon descartable del árbol:

- Agregar un comentario con la promesa de gratuidad sin constancia a
  `plantilla/.github/workflows/desplegar.yml` → `promesas-sin-fuente` **1 rojo**.
- Borrar `plantilla/docs/accesos.md` → **2 rojos** en
  `lo-que-lee-el-consumidor`. Ojo con lo que eso mide: el rojo sale porque el
  banco lista la página como una que viaja, no porque verifique que lo que el
  canónico cita exista. La cláusula «un artefacto que el canónico cite existe en
  el andamio» no tiene compuerta propia; la página de cobertura la declara
  parcial.

## Lente 4 — Consumidores y coherencia

- Los cuatro archivos son **scaffold**: un proyecto ya nacido se quedó con su
  copia, y el change lo dice. Con tres consumidores reales en `@v1.9.6`, eso
  significa que ninguno de los tres recibe estas correcciones solo; la
  proposición «ninguno en su pipeline» es correcta.
- Proposal, design y tasks cuentan lo mismo. El design reconoce de frente que la
  implementación fue antes que el change.
- **Pendiente declarado sin dueño en el plan del porte:** «ninguna compuerta
  exige que un cambio en `plantilla/` traiga change de OpenSpec». Sigue siendo
  cierto; queda reportado.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Observación | Un escenario promete que el pipeline trate la prosa falsa como defecto y no hay caso que lo haga | Nada que corregir en el delta: la cobertura lo declara parcial |
| 2 | Observación | El pendiente «cambio en `plantilla/` sin change» no tiene dueño | Reportado como pendiente del porte |

## Veredicto

**Archivable.** Ningún escenario vigente se pierde, las cinco tareas tienen
evidencia que se sostiene hoy, y la compuerta de la cláusula principal muerde.
