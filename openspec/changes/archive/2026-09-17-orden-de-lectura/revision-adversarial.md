---
artefacto: revision-adversarial
change: orden-de-lectura
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: archivable-con-correcciones
---

# Revisión adversarial — orden-de-lectura

**Qué es y qué no es.** Es la «revisión escéptica adversarial» que este change
pedía desde su proposal, ahora bajo el desvío `github-review-cruzado-automatizado`
que `AGENTS.md` declara para todo el repositorio. La corrió un agente (Claude) el
2026-09-17, con cuatro lentes separadas. Son independientes en el **método**, no
en el agente.

## Lente 1 — Contrato

- Dos **ADDED** en `documentacion-del-marco`, que se funden sobre la capability
  que crea `el-andamio-dice-la-verdad` (se archiva antes). Títulos distintos a los
  de ese change. Sin MODIFIED ni REMOVED.
- **Defecto encontrado y corregido:** el escenario «Alguien necesita saber qué NO
  va a conseguir» decía que la introducción declara «que el marco **todavía no
  publica la aplicación** en internet». Eso es un **hecho con fecha** escrito como
  propiedad: el día que el marco publique la aplicación, el contrato vivo exigiría
  declarar algo falso. `openspec/config.yaml` es explícito («se enuncian como
  PROPIEDADES, nunca como implementaciones»). El escenario pasa a exigir que la
  introducción declare **cada tramo que el marco todavía no cubre para la forma
  que se va a elegir**, con el de hoy como ejemplo.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| Enlaces | `pruebas/docs/enlaces.test.mjs` → 9/9; el `CHANGELOG.md` queda fuera con su motivo (`:34-41`) |
| Renombrado | `docs/` tiene sus páginas de raíz con prefijo `NN-` y `docs/README.md` sin número |
| Índice | `docs/README.md:64` (el camino), `:83` (lo que se abre cuando hace falta), `:95` (las carpetas, y por qué no llevan número) |
| Introducción | `docs/01-introduccion.md`: qué se logra, qué no, cuánto lleva, qué hay que tener antes |
| Banco | `pruebas/docs/estandar-de-lectura.test.mjs` → 28/28 |
| **Entrada de CHANGELOG** (estaba sin tildar) | Existe desde la 1.8.0: `CHANGELOG.md:1464` (el verificador de enlaces) y `:1476-1488` (la numeración y la introducción) |

## Lente 3 — Mordida

Sobre un clon descartable:

- Un enlace del índice apuntando a `01-introduccionX.md` → **1 rojo**.
- Un enlace a un ancla inexistente de `01-introduccion.md` → **1 rojo**.

## Lente 4 — Consumidores y coherencia

- Nada de `docs/` viaja al andamio. El proposal decía «`docs/14-consumidores.md`
  tiene la tabla vacía» para concluir que no hay a quién romperle nada; hoy se
  sabe que hay **tres consumidores reales** en `@v1.9.6`. La conclusión sobrevive
  igual —ningún repositorio nacido del andamio referencia rutas de `docs/`—, pero
  la premisa estaba mal medida.
- **La página de entrada se contradecía a sí misma:** arriba decía «el marco
  **no lo publica en internet**» y la sección 6 dice que un **sitio para leer** sí
  se publica. Justo lo que el requirement pide declarar —qué no se logra— estaba
  dicho de más y en contra de la misma página. **Corregido** en
  `docs/01-introduccion.md`: la aplicación todavía no, el sitio sí, y las dos
  cosas remiten a la sección 6. Banco de `pruebas/docs/` → 182/182 después.
- **No corregido, y reportado:** la misma página dice que el repositorio del marco
  «**es privado**». Medido hoy con `gh api repos/{owner}/{repo} --jq .visibility`:
  **public**. La misma afirmación está en `docs/04-arrancar-acompanado.md:136-137`
  y en un comentario de `README.md:138`. `docs/04` lo reescribe otro lote del
  porte en paralelo (el del arranque), así que corregir una sola de las tres
  dejaría la documentación contradiciéndose; va como pendiente para corregirlas
  juntas.
- Frontmatter: `aprueba` pasa a la convención del desvío, y el design y el tasks
  —que no traían ni `aprueba` ni `estado`— los ganan.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Media | Un escenario del delta fijaba un hecho con fecha como propiedad | **Corregido** en el delta antes de fundirlo |
| 2 | Media | La introducción se contradecía sobre qué publica el marco | **Corregido** en `docs/01-introduccion.md` |
| 3 | Media | Tres documentos dicen que el repositorio del marco es privado y es público | Reportado como pendiente (uno de los tres es de otro lote en curso) |
| 4 | Baja | La premisa «tabla vacía = sin consumidores» del proposal | Anotado: la conclusión de impacto se sostiene por otra vía |

## Veredicto

**Archivable, con las correcciones 1 y 2 hechas.** Las dos casillas que quedaban
abiertas —esta revisión y la entrada de CHANGELOG— quedan tildadas con su
evidencia.
