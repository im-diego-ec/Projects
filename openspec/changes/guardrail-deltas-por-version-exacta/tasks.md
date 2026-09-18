---
artefacto: tasks
dri: Builder 1
aprueba: "revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)"
estado: en-ejecucion
---

# Tasks — guardrail-deltas-por-version-exacta

Líneas medidas sobre el árbol de este change. Las anteriores se citan contra
`965a1da`, el commit sobre el que arranca.

## 1. Los bancos primero, con el rojo a la vista

- [x] 1.1 `pruebas/andamio/pinado.test.mjs` reescrito **antes** de tocar `marco-ci.yml`:
      sin `EXCEPCIONES` (comentario de reemplazo en `:75`), «ningún `uses:` del marco
      apunta a un tag mayor móvil, sin excepciones» (`:194`), «marco-ci.yml no invoca
      ninguna pieza propia por un tag mayor móvil» (`:282`, con control de no
      vacuidad) en lugar de «EXACTAMENTE una invocación interna», y la lista
      `FALSAS_DEL_ROL_INTERNO` (`:364`) con normalización de líneas partidas y su
      control (`:379`).
      Corrido contra el árbol sin arreglar:
      `node --test --test-reporter=tap pruebas/andamio/pinado.test.mjs` →
      `# tests 8 · # pass 4 · # fail 4`. Los cuatro rojos: `marco-ci.yml:990 → @v1`
      (dos casos), `marco-ci.yml:990 → uses: im-diego-ec/Projects/actions/guardrail-deltas@v1`,
      y las ocho frases en `claude.yml`, `marco-ci.yml`, `projects-release/SKILL.md` (tres),
      `docs/15-forkear-el-marco.md`, `AGENTS.md` y `README.md`.
- [x] 1.2 `pruebas/andamio/expresiones.mjs`: funciones de estado **opt-in** por el símbolo
      `FUNCIONES` (`:50`, `llamada()` en `:250`). Sin declararlas, cualquier función
      sigue lanzando: `pruebas/andamio/la-llave-del-despliegue.test.mjs:261` sigue verde,
      y `refs-propias.test.mjs:321` lo fija con su propio caso.
- [x] 1.3 Banco nuevo `pruebas/andamio/refs-propias.test.mjs`: la partición de cada job
      con una referencia remota propia se **evalúa** con `es_distribuidor` en `'true'` y
      en `'false'` (`:97-146`); cada pieza salteada corre por ruta local (`:194`);
      fixtures con siete formas y dos no-referencias (`:213`). Verde sobre el árbol real
      (4/4): hoy hay dos referencias, las dos particionadas.
- [x] 1.4 Rojo demostrado mutando el árbol real (copia de respaldo y restaurado):
      (a) sin el `if:` del job `deltas` → rojo, «job 'deltas' -> uses: ...guardrail-deltas@v1»;
      (b) un tercer job `tercero` con `uses: im-diego-ec/Projects/actions/censo-fuentes@v1.9.6`
      sin partición → rojos los casos 1 y 2; (c) `if: ${{ always() || needs.cambios.outputs.es_distribuidor != 'true' }}`
      en `deltas` → rojo; (d) `ci.yml` sin `uses: ./actions/guardrail-deltas` → rojo el
      caso 2. En los cuatro, `# tests 4 · # fail 1` o `2`.
- [x] 1.5 El hueco era real: con (b) y con (c), el resto del banco —
      `find actions pruebas -name '*.test.mjs' ! -name 'refs-propias.test.mjs' ! -path '*/pruebas/init/*'`
      — da `# tests 1470 · # pass 1466 · # fail 4`, y los cuatro rojos son los del pin
      de 1.1, que ya estaban rojos sin la mutación. Ningún banco existente vio el job
      nuevo ni el `always() ||`.

## 2. El arreglo

- [x] 2.1 `.github/workflows/marco-ci.yml:992`: `uses: im-diego-ec/Projects/actions/guardrail-deltas@v1.9.6`
      (era `@v1` en `:990` de `965a1da`). Sin cambios en el job `deltas` (`:962`), su
      `name: deltas-openspec`, su `if` por `es_distribuidor` ni su cobro en `marco-ok`.
      `actions/guardrail-deltas` de la 1.9.6 acepta `instalar-node`
      (`git show v1.9.6:actions/guardrail-deltas/action.yml`, `:32`), y su código es el
      mismo que el de `965a1da`: `git diff --stat v1.9.6 HEAD -- actions/guardrail-deltas ':!actions/guardrail-deltas/pruebas'`
      no imprime nada.
- [x] 2.2 El comentario del job (`marco-ci.yml:922-960`): qué cerró, qué no (las versiones
      publicadas hasta la 1.9.6), y qué bancos lo sostienen. El de
      `constitucion_cableada` apunta al job `deltas` (`:3901`).
- [x] 2.3 `node --test pruebas/andamio/pinado.test.mjs pruebas/andamio/refs-propias.test.mjs`
      → 12/12 después del arreglo y de la prosa (sección 3).

## 3. La prosa que afirmaba el rol interno de `v1`

- [x] 3.1 `AGENTS.md:120-148` (sección Versionado): el tag ya no se invoca en ninguna línea,
      por qué el pin exacto dejó de ser circular, qué bancos lo cobran, y que el tag no se
      borra y no se mueve sin OK humano.
- [x] 3.2 `README.md:248-250`: el tag existe porque las versiones publicadas hasta la 1.9.6
      lo llevan adentro.
- [x] 3.3 `docs/15-forkear-el-marco.md:57-77` y su checklist: las dos líneas van por
      versión exacta; `v1` solo si algún consumidor del fork pina una versión hasta la
      1.9.6. El nombre de los jobs va entre comillas invertidas para no usar la palabra
      del glosario sin enlace (`pruebas/docs/estandar-de-lectura.test.mjs`, que se puso
      rojo con la primera redacción).
- [x] 3.4 `.github/workflows/claude.yml:257`: el prompt del asistente deja de afirmar el
      rol interno y dice que moverlo pide OK humano.
- [x] 3.5 `.claude/skills/projects-release/SKILL.md`: descripción (`:3`), preámbulo
      (`:40-70`), nota de las precondiciones (`:80`), paso 5 (`:343`) reescrito como parada
      con OK humano, trampa 1 (`:556`) y checklist (`:646`). El `grep` del paso 5 se
      probó: **cero líneas** sobre este árbol y la línea `:990` sobre
      `git show HEAD:.github/workflows/marco-ci.yml`; se escribió
      con `Projects[^@[:space:]]*` porque la primera forma (`Projects/[^@]*@v...`) la
      tomaba `pinado.test.mjs` como un pin inválido (rojo medido sobre la primera
      redacción: `SKILL.md:351 → @v[0-9`).
      El `git diff --stat "$(git rev-parse 'v1^{commit}')" <SHA> -- actions/guardrail-deltas ...`
      del paso se probó con `<SHA>` = `v1.9.6` y `HEAD`: vacío en los dos.
- [x] 3.6 `actions/constitucion/cableado.mjs:1482-1483`: el comentario deja de llamar al
      tag «interno del marco». Solo comentario; ningún cambio de comportamiento.

## 4. Contrato

- [x] 4.1 Delta de `calidad-codigo`: `ADDED` «Ninguna pieza del marco viaja a un
      consumidor por una referencia que se mueve», siete escenarios.
- [x] 4.2 Verificado **a mano**: el título no existe en ningún spec vivo ni en otro
      change (`grep -rn 'Ninguna pieza del marco viaja a un consumidor' openspec/specs openspec/changes`
      → solo este delta). No hay `MODIFIED` ni `REMOVED`.
- [x] 4.3 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 34 passed, 0 failed (34 items)`.
- [ ] 4.4 Fila de `openspec/cobertura-de-requirements.md` para el requirement nuevo.
      **Motivo:** la página se construye desde los specs **vivos** y sus conteos se
      verifican contra ellos (`pruebas/docs/cobertura-de-requirements.test.mjs`, caso
      «promover un requirement al contrato sin agregar su fila se caza»); agregarla antes
      del archive descuadra `calidad-codigo — 12 requirements`. Va en el archive, con
      `refs-propias.test.mjs` y `pinado.test.mjs` como compuerta y el escenario del
      release como «ninguno que se ponga rojo».

## 5. CHANGELOG

- [x] 5.1 Fragmento en `.porte/changelog/06-guardrail-deltas-por-version-exacta.md`
      (`### Corregido` y `### Cambiado`). `CHANGELOG.md` no se edita en este lote.

## 6. Verificación

- [x] 6.1 `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap`
      → `# tests 1474 · # pass 1474 · # fail 0`. Cuadra con los 1469 que registra la
      tarea 7.1 del change `el-despliegue-no-le-da-la-llave-al-fork` sobre `965a1da`:
      +4 de `refs-propias.test.mjs` y +1 de `pinado.test.mjs` (de 7 casos a 8: uno
      reemplazado y uno nuevo).
- [x] 6.2 `openspec validate --all --strict` → 34 passed, 0 failed.

## 7. Lo que no se pudo hacer acá, con su motivo

- [ ] 7.1 **Decidir el destino de `v1`: congelarlo formalmente o volver a moverlo en cada
      release con OK.** Pide OK humano (`AGENTS.md`, ⚠️ «Mover el tag `v1`»), y la
      decisión D1 del PO prohíbe mover tags en este porte. Lo implementado es la opción
      que no toca el tag (design, D5), con la recomendación de congelarlo. Va con la
      apertura de la línea `v2` (lote 38 del porte), que ya lista «congelar v1».
- [ ] 7.2 **Probar contra un consumidor real** que el job `deltas-openspec` resuelve
      `guardrail-deltas@vX.Y.Z` y sale igual que con `@v1`. Esta sesión no escribe en
      repositorios consumidores. Va antes de publicar la versión que lleve este change,
      con la skill `projects-validar-consumidor`.
- [ ] 7.3 **Revisión adversarial con lentes independientes**, que reemplaza el review
      cruzado por el desvío del mantenedor único. Va en la pasada final del porte; se
      registra acá.
- [ ] 7.4 **Archivar**, con la fila de 4.4. Después de 7.3, en la pasada final.
- [ ] 7.5 **Hallazgos fuera de alcance, anotados para no perderlos:** (a) el ensayo de
      `projects-validar-consumidor` corre las piezas internas de `marco-ci.yml` en la
      versión publicada y no en el SHA que prueba (antes por `@v1`, ahora por versión
      exacta); (b) `v1.9.6` es un tag **anotado** (`git cat-file -t v1.9.6` → `tag`),
      contra la convención de tags ligeros de la trampa 2 del release; (c) el mensaje de
      `actions/constitucion/pruebas/regresiones-auditoria.test.mjs:825` sigue diciendo que
      el guardrail «viaja por @v1»: es de la corrección de prosa del lote 5 del porte.
