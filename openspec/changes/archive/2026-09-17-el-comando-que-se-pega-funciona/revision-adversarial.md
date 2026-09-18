---
artefacto: revision-adversarial
change: el-comando-que-se-pega-funciona
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: archivable
---

# Revisión adversarial — el-comando-que-se-pega-funciona

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada mientras rija
el desvío `github-review-cruzado-automatizado` de `AGENTS.md`. La corrió un
agente (Claude) el 2026-09-17, con cuatro lentes separadas. Son independientes
en el **método**, no en el agente.

## Lente 1 — Contrato

- Dos **ADDED** en `calidad-codigo`. Ninguno de los dos títulos existe en
  `openspec/specs/calidad-codigo/spec.md` (comprobado título por título). Sin
  MODIFIED ni REMOVED.
- «Una ruta del sistema de archivos no se deriva de la parte de una URL» es una
  propiedad del código del marco. Medido con `git grep -n "\.pathname"` sobre
  `*.mjs`, `*.js` y `*.ts`: los usos que quedan leen el componente de una URL de
  red (`herramientas/registro-npm.mjs:184`, `pruebas/init/registro-npm.test.mjs`,
  `Astro.url.pathname` en el sitio), que es la excepción que el propio
  requirement escribe. No queda ninguna ruta de archivo armada así.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 | `citarRuta` exportada en `herramientas/projects-init.mjs:1823`; `pruebas/init/comando-pegable.test.mjs` → 9/9 |
| 1.2 | Los cinco sitios la usan: `:474`, `:484`, `:485`, `:3534`, `:4110` |
| 2.1 | `pruebas/init/el-doble-clic-llega.test.mjs` → 8/8 |
| 2.2 | `actions/guardrail-deltas/pruebas/ayuda.mjs:12` deriva `AQUI` con `fileURLToPath`; el banco → 13/13 |
| 3bis.6 | Corrido además desde un clon en una ruta **con** espacio: 13/13 |

`CHANGELOG.md`, `[No publicado]`: `:721`.

## Lente 3 — Mordida

Sobre clones descartables del árbol:

- `citarRuta` neutralizada (devuelve la ruta tal cual) → **8 rojos** entre
  `comando-pegable` y `el-doble-clic-llega`.
- `AQUI` vuelto a `new URL(".", import.meta.url).pathname`, en un clon cuya ruta
  tiene un espacio → **13 de 13 rojos** en el banco del guardrail. En un clon sin
  espacio no muerde, y eso es exactamente el límite que el change declara: la
  mordida depende de la ruta de quien corre el banco.

## Lente 4 — Consumidores y coherencia

- Nada viaja: la herramienta corre desde el clon del marco y los otros dos
  archivos son bancos. «Ninguno en su pipeline» es correcto para los tres
  consumidores reales.
- **El pendiente que el change declara sigue vivo, medido hoy:**

  ```
  OPENSPEC_CHANGES=/no/existe OPENSPEC_SPECS=/no/existe/tampoco \
    node actions/guardrail-deltas/check-openspec-deltas.mjs
  ✓ Deltas de OpenSpec: no hay ningún delta que comparar (0 activo(s), 0 archivado(s) con specs)
  exit=0
  ```

  Un directorio que no existe sale **verde y mudo**, sin un `::warning::`. El
  change le puso destino «change propio» y ningún lote del plan del porte lo
  toma. Queda reportado como pendiente sin dueño.
- Observación de clasificación: el design llama **canónico** a
  `herramientas/projects-init.mjs`. Es una herramienta del marco que no viaja; el
  resultado práctico (no llega al consumidor) es el mismo.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Alta, fuera de este change | El guardrail de deltas sale verde y mudo ante un directorio inexistente: un fail-open que `AGENTS.md` prohíbe | Medido y reportado como pendiente sin dueño; no se toca una action publicada desde un archive |
| 2 | Observación | La mordida del `.pathname` solo se ve con una ruta con espacio | Se corrió en un clon con espacio y muerde |

## Veredicto

**Archivable.** El contrato que se funde es verdad en el árbol y muerde. El
fail-open del guardrail es un defecto aparte que el change ya declaraba.
