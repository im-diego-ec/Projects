---
artefacto: revision-adversarial
change: el-consumidor-se-anota
fecha: 2026-09-17
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
veredicto: revisado-espera-al-po
---

# Revisión adversarial — el-consumidor-se-anota

**Qué es y qué no es.** Es la revisión que reemplaza a la cruzada **entre
builders** mientras rija el desvío `github-review-cruzado-automatizado` de
`AGENTS.md`. **No reemplaza la aprobación del PO**: este change toca
`gobierno-contribucion`, y esa aprobación el desvío no la alcanza. La corrió un
agente (Claude) el 2026-09-17, con cuatro lentes separadas; son independientes en
el **método**, no en el agente.

## Lente 1 — Contrato

- Dos **ADDED** en `gobierno-contribucion`, con títulos que no existen en el spec
  vivo ni en los otros changes en vuelo sobre esa capability. Sin MODIFIED ni
  REMOVED.
- «La versión SHALL leerse del árbol que la herramienta acaba de escribir» es una
  propiedad, y el banco la ejerce contra un destino real.

## Lente 2 — Evidencia

| Tarea | Lo que se comprobó hoy |
|---|---|
| 1.1 | `pinDelMarcoEnDestino` en `herramientas/projects-init.mjs:1856` |
| 2.1 / 2.2 | La línea sale en `:4084-4085`; `pruebas/init/consumidor-se-anota.test.mjs` → 11/11 |
| 3.1 | `docs/14-consumidores.md` ya no declara pendiente la mitad automática |

`CHANGELOG.md`, `[No publicado]`: `:449`.

## Lente 3 — Mordida

Sobre un clon descartable: `pinDelMarcoEnDestino` devolviendo una constante
(`"v1.9.6"`, que hoy acierta) → **6 rojos**. El banco distingue «acierta hoy»
de «se lee del árbol», que es la propiedad del requirement.

## Lente 4 — Consumidores y coherencia

- **Hallazgo principal, para el PO.** Hay **tres consumidores reales** en
  `@v1.9.6` —`im-diego-ec/custodia-bingo`, `im-diego-ec/plantilla-sitio` e
  `im-diego-ec/plantilla-aplicacion`— y el registro sigue en `*(sin filas)*`. La
  página no miente —dice que una tabla vacía no significa cero consumidores—,
  pero su causa 1 («no se pueden reponer desde el árbol… necesita una credencial
  de organización») ya no describe el caso: la cuenta es **personal**, y la
  coordenada y el pin actual de los tres se leen con la sesión de `gh` que ya
  hay (`gh api repos/<cuenta>/<repo>/contents/.github/workflows/ci.yml`). Lo que
  sigue sin estar medido es la **fecha de adopción** y la **versión con la que
  nació** cada uno, que salen de la historia de su `ci.yml`. Y esto no es
  cosmético: el paso 6 del release (`la-evidencia-del-ensayo-viaja`) cuenta las
  filas de esta tabla para decidir si exime la terna, así que la tabla vacía hoy
  **habilita una excepción cuya premisa es falsa**.
- «Ninguno en su pipeline» es correcto: nada de este change viaja.

## Hallazgos

| # | Severidad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Alta | Tres consumidores reales fuera del registro; su ausencia habilita la excepción de «cero consumidores» del release | Reportado al PO. Completar las filas es medir la historia de tres repos ajenos, y eso no entra en un archive |

## Veredicto

**Revisado; espera el OK del PO para archivarse.** Lo que se funde es verdad en
el árbol y muerde. El hallazgo 1 no invalida el requirement —el registro declara
su límite, como pide—, pero el PO tendría que decidir si se completa antes o
después del archive. Con el OK, el archive es mecánico:

```bash
node .claude/skills/projects-archive-change/aplicar-deltas.mjs el-consumidor-se-anota
git mv openspec/changes/el-consumidor-se-anota openspec/changes/archive/<fecha>-el-consumidor-se-anota
```
