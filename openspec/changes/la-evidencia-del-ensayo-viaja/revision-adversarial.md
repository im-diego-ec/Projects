---
artefacto: revision-adversarial
change: la-evidencia-del-ensayo-viaja
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: revisado-espera-al-po
---

# Revisión adversarial — la-evidencia-del-ensayo-viaja

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada **entre
builders** mientras rija el desvío `github-review-cruzado-automatizado` de
`AGENTS.md`. **No reemplaza la aprobación del PO**: el change toca
`gobierno-contribucion`. La corrió un agente (Claude) el 2026-09-17, con cuatro
lentes separadas; son independientes en el **método**, no en el agente.

## Lente 1 — Contrato

- Un **ADDED** en `gobierno-contribucion`; título inexistente en el spec vivo y
  en los otros changes en vuelo. Sin MODIFIED ni REMOVED.
- **El contrato y el procedimiento no dicen lo mismo.** El requirement dice, sin
  excepción: «Cuando la evidencia falte, el release NO SHALL darse por cerrado».
  El paso 6 de `.claude/skills/projects-release/SKILL.md` tiene una rama que **sí**
  lo da por cerrado sin terna —la de «NINGUN CONSUMIDOR», agregada en la tarea
  4bis—, y esa rama no aparece en el delta. Si se funde así, el contrato vivo
  prohíbe lo que el procedimiento manda hacer.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 | La skill de validación manda la terna al `CHANGELOG.md` |
| 2.1 / 2.2 | El paso 6 filtra por forma (`corrida [0-9]{6,}` o `[0-9a-f]{40}`) y dice que sin eso el release «NO esta cerrado» |
| 3.2 | El `--delete-branch` sigue en el paso 5 de `projects-validar-consumidor` |
| 4bis | La rama de cero consumidores cuenta las filas de `docs/14-consumidores.md` |
| Banco | `pruebas/docs/evidencia-del-ensayo.test.mjs` → 9/9 |

`CHANGELOG.md`, `[No publicado]`: `:298` (la circularidad de arranque) y `:694`
(la terna viaja al changelog).

## Lente 3 — Mordida

Sobre un clon descartable: el `grep` del paso 6 reemplazado por uno que acepta
cualquier texto → **1 rojo**. Reemplazar solo la PROSA («al menos un SHA de 40
caracteres») no pone nada rojo: el banco mira el comando, que es lo que acredita
algo, y eso está bien.

## Lente 4 — Consumidores y coherencia

- **Hallazgo principal, para el PO: la premisa de la excepción es falsa hoy.** La
  rama de cero consumidores se decide con
  `grep -c '^| .* | 20[0-9][0-9]-' docs/14-consumidores.md`, que devuelve **0**,
  y hay **tres consumidores reales** en `@v1.9.6`. El release siguiente se
  cerraría declarando «Probado contra: NINGUN CONSUMIDOR», que es falso, con la
  frontera 🛑 de `AGENTS.md` («publicar un cambio del marco que no se probó contra
  un consumidor real») pasando en silencio. La excepción «caduca sola el día que
  el registro tenga una fila», pero el registro no se llena solo.
- **Editorial:** en el paso 6, el `grep` de la evidencia aparece **antes** de
  «PRIMERO: cuántos consumidores hay», y la frase «Si devuelve 1 o más, la
  evidencia es obligatoria y se comprueba así:» queda seguida directamente por
  «Tiene que devolver…», sin el comando al que se refiere. Se lee, pero el orden
  del procedimiento está invertido.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Alta | La excepción de cero consumidores se apoya en un registro vacío mientras hay tres consumidores reales | Reportado al PO: o se completa el registro (ver la revisión de `el-consumidor-se-anota`), o la excepción deja de leer ese conteo |
| 2 | Alta | El delta prohíbe sin excepción lo que el procedimiento permite | Reportado al PO: decidir si la excepción entra al requirement —con su condición y su caducidad— o se retira del procedimiento. No se corrige acá: es qué acredita un release, y eso lo aprueba el PO |
| 3 | Baja | El orden del paso 6 está invertido | Reportado; se arregla junto con el 2 |

## Veredicto

**Revisado; NO archivable tal como está, y espera al PO.** Los hallazgos 1 y 2
son de gobierno (qué acredita que una versión se puede publicar) y los decide
el PO. Con la decisión tomada y el delta ajustado, el archive es mecánico.
