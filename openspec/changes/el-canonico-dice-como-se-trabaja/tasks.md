---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)  # el delta de gobierno-contribucion lo gatea
                              # ademas el PO por CODEOWNERS
estado: en-ejecucion
---

# el-canonico-dice-como-se-trabaja — Tasks

Tres bloques y el cierre. El orden importa: los bancos van **antes** que el texto
(bloque 1), y cada uno se vio rojo sobre el árbol anterior. Toda la evidencia es del
árbol de Projects del 2026-09-17, no del de Rigel.

**Cómo se reprodujo el rojo sin tocar el árbol**: `git archive HEAD` (el commit
`a585d85`, anterior a este change) extraído a un directorio del scratchpad, con los
tres bancos nuevos copiados encima, y `node --test` sobre esa copia.

## 1. Los bancos, en rojo primero

- [x] 1.1 **Las reglas, por id y por lo que dicen**:
      `actions/constitucion/pruebas/inventario-canonico.test.mjs:313` («las reglas de
      cómo se trabaja llegan a cada repo…»), `:317` (ids distintos) y `:324` (cada
      mutación da su rojo: borrar una regla, escribir el rol a mano, cambiar el id de
      `terminado-en-local`, volver a «cierra el issue macro»).
      **Rojo sobre el árbol anterior**: `not ok` con cuatro problemas —los cuatro ids de
      revisión con meta faltan, falta `terminado-en-local-y-no-cerrado`, y
      `openspec-flujo` y `github-closes-apunta-al-sub-issue` «vuelven a decir que el PR
      final CIERRA el issue macro»—.
- [x] 1.2 **El presupuesto y su nota**:
      `actions/constitucion/pruebas/presupuesto-del-canonico.test.mjs:101`, `:105` y `:121`.
      Tres reglas: la nota existe, nombra `leerCanonico()` y advierte `wc -l`; nombra el
      tope vigente; y la aritmética (suma de secciones + secciones − 1) es la que cobra
      el check. **Rojo sobre el árbol anterior**: «el manifiesto declara
      `presupuesto_lineas: 700` y no trae `presupuesto_nota`». La mutación «subir el
      número sin reescribir la nota» da «no lo nombra».
- [x] 1.3 **Los residuos del renombrado en lo que viaja**:
      `pruebas/andamio/residuos-del-renombrado.test.mjs:92`, `:105` y `:130`. Tres formas
      sobre el canónico y el andamio (nombre pegado a un guion, el símbolo de otra marca,
      los nombres de origen) y dos sólo sobre el canónico (artículo pegado y «el
      consumidor»), porque en `plantilla/` ya las cobra
      `lo-que-viaja-al-proyecto.test.mjs` y repetirlas duplicaría cada hallazgo.
      **Rojo sobre el árbol anterior**: cinco líneas —`90-marca.md:5`, `:20`, `:32`, `:34`
      y `plantilla/eslint.config.mjs:187`—.

## 2. El texto del canónico, en una sola versión

- [x] 2.1 **Las cuatro reglas de revisión con meta**, en ✅ Siempre:
      `actions/constitucion/canonico/40-fronteras.md:43` (`revision-declara-su-meta`),
      `:48` (`hallazgo-se-clasifica-contra-la-meta`), `:54`
      (`pregunta-al-po-declara-que-desbloquea`, con «Una pregunta a {{PO}} (PO)») y `:60`
      (`change-congelado-contra-su-insumo`). Renderizado con `PO: "@po"`: «Una pregunta a
      @po (PO) dice **qué desbloquea**…».
- [x] 2.2 **La remisión** a congelar el insumo, dentro de `openspec-flujo`:
      `actions/constitucion/canonico/10-openspec.md:29-31` (D2 del design explica por qué
      ahí y no en `openspec-ciclo-de-vida`).
- [x] 2.3 **`terminado-en-local-y-no-cerrado`**, inmediatamente después de
      `definicion-de-done`: `actions/constitucion/canonico/30-git-despliegue.md:40` y
      `:45`. Dice BLOQUE y no tareas, `[~]` si el bloque lleva casilla, legítimo y sin
      vencimiento con `ninguna` (D6 del PO), y que tener ambiente no cierra lo de atrás.
- [x] 2.4 **El PR final LLEVA el enlace**: `10-openspec.md:26-27` y `80-github.md:37-38`.
      Ningún `projects:regla id=` cambió: `git diff HEAD -- actions/constitucion/canonico/
      | grep '^[-+]<!-- projects:regla'` sólo muestra las cinco marcas **nuevas**.
- [x] 2.5 **Los residuos**: `90-marca.md:5` («el sistema de diseño de la
      organización»), `:20` («cinco casos en un consumidor»), `:32` («El logo y los
      símbolos de la marca»), `:34` («en un consumidor, con un símbolo…»), y
      `plantilla/eslint.config.mjs:187`. Ninguna de las tres reglas cambió lo que exige.
- [x] 2.6 **El presupuesto sube a 738 con su decisión escrita**:
      `actions/constitucion/canonico/manifiesto.json:3-4`. Medido antes: `cat
      canonico/[0-9]*.md | wc -l` → 687; `leerCanonico().lineas` → 696. Después: 724 y
      **733** (+37 = 23 + 10 + 4). La nota verificada contra el árbol: `10-openspec`
      96 líneas y 7 reglas, `40-fronteras` 176 y 29, y las cuatro reglas más largas de
      `10-openspec` suman 52 líneas con texto (15 + 14 + 13 + 10).
- [x] 2.7 **La 1.10.0 lleva la huella nueva**: `manifiesto.json:61-64`, huella
      `c58a8cd9…98f2`, la que calcula `huella-del-canonico.test.mjs`. Es la misma
      versión que abrió `ventana-vencida` y todavía no se publicó; su `tasks.md` 2.2
      quedó con la nota.

## 3. Las superficies que repiten el texto

- [x] 3.1 **Las dos copias de la skill de archive**:
      `.claude/skills/projects-archive-change/SKILL.md:383-401` y `:462-463`;
      `plantilla/.claude/skills/projects-archive-change/SKILL.md:426-445` y `:507-508`.
      Los dos `Closes` en el ejemplo del `gh pr create`, la verificación con
      `gh pr view <n> --json closingIssuesReferences` y las dos líneas nuevas del
      checklist.
- [x] 3.2 **La copia del andamio pasa el formateador del andamio**:
      `node <prettier 3.9.6>/bin/prettier.cjs --check
      .claude/skills/projects-archive-change/SKILL.md eslint.config.mjs` desde
      `plantilla/` → «All matched files use Prettier code style!». **Hallazgo al
      medirlo**: la copia ya fallaba ANTES de este change (el mismo `--check` sobre
      `git show HEAD:…` → `[warn]`), por un bloque de cita pegado a una lista en el Paso
      4 (`:379-380`). No rompía el arranque —`herramientas/projects-init.mjs:1914-1916`
      corre `pnpm format` antes de `verificar` y la reescribe—, pero por eso mismo todo
      proyecto nacía con una copia **distinta** de la del marco, y esa diferencia
      espuria es ruido en la revisión trimestral de divergencia. Se agregó la línea en
      blanco que faltaba.
- [x] 3.3 **La guía muestra las formas del estado**:
      `docs/09-construir-con-openspec.md:345` («Si tu proyecto todavía no tiene dónde
      desplegar»): bloque escrito como encabezado con su declaración, bloque con casilla
      en `[~]`, o una sola declaración al principio.
- [x] 3.4 **La regla 9 deja de listar al PR final como excepción**:
      `docs/11-reglas-no-escritas.md:401-408` (la regla) y `:427-432` (cómo volverla
      automática).

## 4. Verificación y cierre

- [x] 4.1 **Suite entera**: `find actions pruebas -name '*.test.mjs' -print0 | xargs -0
      node --test --test-reporter=tap | grep -E '^# (tests|pass|fail)'` → `# tests 1480`,
      `# pass 1480`, `# fail 0`.
- [x] 4.2 **Specs**: `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate
      --all --strict` → «Totals: 30 passed, 0 failed (30 items)».
- [x] 4.3 **Guardrail de deltas**: `node actions/guardrail-deltas/check-openspec-deltas.mjs`
      → «20 requirement(s) comparados en 20 delta(s) activo(s) y 8 delta(s)
      archivado(s); ningún MODIFIED perdería escenarios». Los cinco títulos ADDED
      verificados a mano: ninguno existe en `openspec/specs/` ni en otro change activo
      (`grep -rn '^### Requirement: <título>'`, cero resultados cada uno).
- [x] 4.4 **Fragmento de CHANGELOG**: `.porte/changelog/11-el-canonico-dice-como-se-trabaja.md`.
- [ ] 4.5 **OK del PO sobre el delta de `gobierno-contribucion`** (cuatro requirements).
      Lo gatea el PO por `AGENTS.md`, y el desvío de la revisión cruzada no lo alcanza.
      No se puede dar desde esta sesión.
- [ ] 4.6 **Revisión adversarial registrada** en `revision-adversarial.md`, con al menos
      dos lentes y un veredicto. Va en la pasada final del porte, después de integrar
      los carriles.
- [ ] 4.7 **Probar contra un consumidor real** antes de publicar (skill
      `projects-validar-consumidor`): el PR de bump de uno de los tres consumidores, con
      el artefacto regenerado, en verde. No se escribe en un consumidor desde esta sesión.
- [ ] 4.8 **Archive**, con la skill `projects-archive-change`, y las filas de los cinco
      requirements nuevos en `openspec/cobertura-de-requirements.md`. Después de 4.5 y 4.6.

## 5. La revisión adversarial del carril (2026-09-18)

- [x] 5.1 **El presupuesto se nombra como presupuesto** (FO-S5). La regla 2 de
      `presupuesto-del-canonico.test.mjs` buscaba el número como token en toda la
      nota, y la nota trae fechas: subir `presupuesto_lineas` a 2026 sin tocarla
      quedaba verde por «Medido el 2026-09-17», y con 2026 el check dejaba de
      contener nada. Refutación escrita primero, contra la regla vieja → `tests 4 /
      pass 3 / fail 1`; prueba con cada número de la nota mayor que el presupuesto.
      Ahora la nota tiene que decir «el presupuesto sube/baja de X a N» o «es N»
      (`nombraElPresupuesto`) → `tests 4 / pass 4`. Contrapeso en la misma
      refutación: la nota real («sube de 700 a 738»), bajarlo escrito igual, y «las
      733 usadas» que NO cuentan como presupuesto. `manifiesto.json` no se tocó.
- [x] 5.2 **El rojo del primer día de un proyecto nuevo** (RV-L3L11-01): la 1.10.0
      que este change comparte con `ventana-vencida` vive en el árbol antes de su
      release. Lo arregló `ventana-vencida` (D13, tarea 3.2): `projects-init`
      renderiza con la action del tag que pina el proyecto. El fragmento de este
      change lo remite.
- [ ] 5.3 **El camino ZIP de `main` antes del release**: el resto de RV-L3L11-01.
      **Motivo:** es la tarea 3.3 de `ventana-vencida`, que espera la decisión del PO
      sobre cómo se integra el porte a `main`; no se duplica acá.
