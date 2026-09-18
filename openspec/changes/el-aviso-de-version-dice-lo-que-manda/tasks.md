---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-aviso-de-version-dice-lo-que-manda

Lote 8 del porte de Rigel. Las mediciones son del 2026-09-17 sobre la rama
`porte/w1-L4-aviso` (base `fde8f4e`), con Node 24.19.0.

## 0. Medir antes de tocar

- [x] 0.1 El defecto del largo y de la sección ausente, medido con las funciones de la
      action sobre el `CHANGELOG.md` real. Evidencia (`node --input-type=module` con
      `extraerSeccionVersion` + `construirMensaje`):
      `No publicado cuerpo 40488 armado 41091 llega 3451 sinPC true recortado true` ·
      `1.9.0 cuerpo 10096 armado 10547 llega 3472 sinPC true recortado true` ·
      `1.9.1` a `1.9.6`: `sinPC true` en las seis.
- [x] 0.2 El BREAKING truncado: `lineasBreaking()` sobre `[No publicado]` devolvía
      `["- **BREAKING para quien ya tuviera un sitio generado** —hoy, nadie—: \`produccion\`"]`
      y perdía las tres líneas siguientes de la viñeta (`CHANGELOG.md:74-77`).
- [x] 0.3 El consejo al revés del emisor. Evidencia:
      `AVISO_VERSION=1.9.0 node actions/aviso-version/aviso-version.mjs` emitía a la vez
      «El aviso sale igual con el cuerpo completo» y «se recorto… Arreglo: acortar la
      seccion "Para consumidores"».
- [x] 0.4 El plan citaba `aviso-version.mjs:147-152`, `:176-178`, `:305-316` y
      `action.yml:61-67`: coincidían con el árbol al empezar. El plan decía «cero
      consumidores»; el árbol de decisiones del porte (`contexto.md`) mide tres, y el
      proposal los nombra.

## 1. Rojo primero — los bancos antes que el arreglo

- [x] 1.1 14 casos nuevos en `actions/aviso-version/pruebas/aviso-version.test.mjs`
      (BREAKING envuelto ×3, canal atado al andamio ×2, puntero derivado ×3, sin conteos,
      consejo del emisor ×5). Contra el `aviso-version.mjs` anterior:
      `ℹ tests 41 · ℹ pass 33 · ℹ fail 8` — los 8 rojos son los tres de BREAKING, los
      punteros `2.0.0 -> v2` y `3.4.1 -> v3`, y tres del consejo del emisor (ESCRIBIRLA,
      «dice a cuánto», «cuerpo completo» cuando recorta). Los 6 nuevos que pasaban fijan
      propiedades que ya se cumplían (canal, conteo, `1.10.0 -> v1`, controles positivos).
- [x] 1.2 `pruebas/ci-del-marco/el-simulacro-avisa.test.mjs` (5 casos). Contra el
      workflow anterior: `ℹ tests 5 · ℹ pass 2 · ℹ fail 3` (warning, arreglo escrito y
      `run-name`); los dos verdes son el ancla y el default que se conserva.
- [x] 1.3 `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs` (23 casos) y
      `pruebas/ci-del-marco/placeholder-del-release.test.mjs` (3 casos). Sin la
      herramienta: `ERR_MODULE_NOT_FOUND`, los dos archivos rojos. Con la herramienta y
      antes de tocar `action.yml` y la skill: `ℹ tests 26 · ℹ pass 23 · ℹ fail 3` —
      «el límite vive en UN lugar» y los dos del placeholder.

## 2. La compuerta

- [x] 2.1 `herramientas/aviso-entra-en-el-mensaje.mjs`, portada de Rigel en su forma
      corregida (1.17.3 + 2.4.0) y adaptada: un solo dialecto, enlaces por
      `enlacesDelRelease()` de la action, guarda de «programa principal» por `realpath`,
      changelog ilegible en rojo con el arreglo. `medir` en `:199`, centinela en `:163`,
      `PLACEHOLDER_SIN_CAMBIOS` en `:139`, el «cuánto llega» en `:314`.
- [x] 2.2 Cableada en el job `changelog-en-el-pr`: `.github/workflows/ci.yml:1031`
      (`actions/setup-node` al mismo SHA que ya usa el archivo) y `:1034` (el paso). El
      mensaje de `ci-ok` nombra los dos pasos del job (`:1104`). Permisos: ninguno nuevo.
- [x] 2.3 Mutaciones sobre la herramienta, cada una contra los dos bancos:
      `queLlega = false` → `# fail 1`; centinela apagado → `# fail 3`;
      `versionMasAlta` anulada → `# fail 6`; armado sin techo reemplazado por el límite →
      `# fail 2`. Restaurada después (`git diff --quiet` sobre el archivo).
- [x] 2.4 Sobre el `CHANGELOG.md` real, hoy: `node herramientas/aviso-entra-en-el-mensaje.mjs CHANGELOG.md`
      → exit 1 con dos `::error::` (`[No publicado]`: 41091 armados, «se recorta a 3451»;
      `[1.9.6]`: 1652, «llega entero»). Es el defecto del lote visto por la compuerta.

## 3. El emisor

- [x] 3.1 BREAKING entero: `lineasBreaking` en `actions/aviso-version/aviso-version.mjs:167`.
- [x] 3.2 Puntero derivado y canal sin conteos: `:236`.
- [x] 3.3 Enlaces en una sola función exportada: `:283`; `main()` la usa.
- [x] 3.4 Consejo según la rama y «a cuánto se recortó»: `:390`, `:403-406`.
- [x] 3.5 Contra el código nuevo: `ℹ tests 41 · ℹ pass 41 · ℹ fail 0`.

## 4. El límite en un solo lugar

- [x] 4.1 `actions/aviso-version/action.yml:69-78`: `limite` sin `default`, con el motivo
      en la descripción. `LIMITE_POR_DEFECTO` sigue en 3500 (`aviso-version.mjs:70`).
- [x] 4.2 Valor efectivo igual: el caso de exactitud arma el aviso con el límite que sale
      de `action.yml` (vacío) y lo compara con la compuerta — verde.
- [ ] 4.3 Subir el límite. **No se hace**: el destino de Projects no está medido ni
      configurado (`AVISO_VERSION_DESTINO` no existe). Queda para cuando se configure.

## 5. El release y el simulacro

- [x] 5.1 `.claude/skills/projects-release/SKILL.md`: el bloque del paso 1 trae
      `### Para consumidores` con `PLACEHOLDER_SIN_CAMBIOS` (`:229-231`), la precondición
      2 deja de citar «Nada todavia» (`:87`), la verificación corre la compuerta (`:270`)
      y el checklist lo pide (`:659`). Banco del placeholder: `ℹ pass 3 · ℹ fail 0`.
- [x] 5.2 `.github/workflows/aviso-version.yml`: `run-name` (`:7`) y `::warning::` en
      la rama del simulacro (`:179`); `default: true` intacto (`:83`). Banco: 5/5.
- [x] 5.3 `actions/README.md`: el `default` de `limite`, la tabla de casos y el límite
      declarado de «Para consumidores», al día.

## 6. El CHANGELOG

- [x] 6.1 Fragmento del lote: `.porte/changelog/08-el-aviso-de-version-dice-lo-que-manda.md`.
- [x] 6.2 Normalización preparada como parche: `.porte/08-normalizar-changelog.patch`
      (`### Para consumidores` en `[No publicado]` y en 1.9.0–1.9.6). Evidencia:
      `git apply --check` → ok; con el parche aplicado sobre una copia,
      `node herramientas/aviso-entra-en-el-mensaje.mjs` → exit 0
      (`[No publicado]` 1457 caracteres, `[1.9.6]` 552, las 1.9.x entre 495 y 658, ninguna
      recortada).
- [ ] 6.3 **Aplicar la normalización al `CHANGELOG.md`.** No se hace en este lote: el
      porte prohíbe editar `CHANGELOG.md` en los carriles (lo funde la integración). La
      integración tiene que aplicar el parche y **completar** el borrador de
      `[No publicado] › Para consumidores` con lo que declaren los fragmentos de los demás
      lotes. **Hasta entonces el paso nuevo del CI es rojo en esta rama** (tarea 2.4).

## 7. Verificación

- [x] 7.1 Banco completo:
      `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap`
      → `# tests 1496 · # pass 1496 · # fail 0` (antes del lote: 1451/1451).
- [x] 7.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 33 passed, 0 failed (33 items)`.
- [x] 7.3 Deltas verificados a mano: sólo ADDED en `pipeline-entrega`, y ninguno de los
      cuatro títulos existe en `openspec/specs/` ni en otro change (`grep -rlF` → 0).
- [x] 7.4 YAML de `action.yml`, `ci.yml` y `aviso-version.yml` parseado sin error
      (`python3 -c "import yaml; yaml.safe_load(...)"`). `actionlint` no está en esta
      máquina: lo corre el CI.
- [ ] 7.5 Revisión adversarial con lentes independientes, registrada en este change
      (desvío D8 del PO). Va en la pasada final del porte, antes del archive.
- [ ] 7.6 Validación contra un consumidor real. Ningún consumidor usa `aviso-version`,
      así que no hay dónde ensayar el cambio del `default`; el aviso se ejercita recién
      con el release. Queda para la skill `projects-validar-consumidor` en el release.

## 9. Hallazgos de la revisión adversarial (2026-09-17)

Rojo primero en los dos bancos, contra el árbol de `0ab2b85`:
`aviso-entra-en-el-mensaje.test.mjs` → `ℹ tests 55 · ℹ pass 40 · ℹ fail 15`;
`aviso-version.test.mjs` → `ℹ tests 45 · ℹ pass 42 · ℹ fail 3`.

- [x] 9.1 **FO-H1 / RV-L4-01 — sección vacía.** `construirMensaje` devuelve
      `paraConsumidoresVacia`; `main` emite `::warning::` y el resumen la declara
      «presente pero vacía»; la compuerta la pone roja (`para-consumidores-vacia`, arreglo
      «ESCRIBIRLA»). Contrapeso verde: «Nada que hacer.» y el texto de fábrica solo.
- [x] 9.2 **FO-H2 — la versión cortada por debajo de la más alta.** `medir(…, base)` y
      `versionesQueCambian`: con la base del PR se mide toda versión cuyo aviso cambia.
      El paso del `ci.yml` saca la base con `git show` y la pasa. Contrapesos verdes:
      historia no tocada, y errata en el detalle que no cambia el aviso. Sin base,
      `::notice::` y el verde deja de afirmar «las secciones que todavía se pueden
      mandar».
- [x] 9.3 **FO-H4 — texto de fábrica retocado.** Se reconoce por sus palabras (sin
      acentos, puntuación, énfasis ni caja). Contrapeso verde: «Nada que hacer hoy.».
- [x] 9.4 **RV-L4-03 — cambios sueltos.** La compañía del centinela es cualquier línea
      que declare algo fuera de «Para consumidores», no sólo un `###`.
- [x] 9.5 **RV-L4-02 — el paso y la guarda con banco.** El paso pasa a `run: |` y el
      banco lo extrae por su nombre y lo corre sobre un repositorio de prueba (rojo y
      control); la herramienta se lanza como proceso por una ruta con `..`.
- [x] 9.6 Mutaciones, cada una roja en su banco y restaurada: paso cambiado por
      `echo omitido` → `fail 1`; paso sin la base → `fail 1`; guarda `if (false && …)` →
      `fail 2`; rama `vacia` apagada → `fail 3`; versiones que cambian apagadas →
      `fail 5`; medir toda la historia → `fail 3`; puntuación sin normalizar → `fail 2`;
      texto suelto ignorado → `fail 2`; `::notice::` sin base apagado → `fail 1`; el verde
      con la afirmación vieja → `fail 1`.
- [x] 9.7 **RV-L4-04 — el borrador del parche.** `.porte/08-normalizar-changelog.patch`
      regenerado: `[No publicado] › Para consumidores` suma las notas de los lotes 36
      (`formato`, el encuadre y el preámbulo para quien invoca la action) y 10 (la
      política D1), y su encabezado dice que la integración suma las de los demás
      carriles. La medición nueva encontró jerga en el resumen de la 1.9.4 («Nada que
      hacer en el pipeline»), corregida. Evidencia: los dos parches aplican en los dos
      órdenes (`git apply`), y la compuerta con la base sale 0 midiendo `[No publicado]`
      (1960), la 1.9.6 y las 1.9.0–1.9.5 por cambiar.
- [x] 9.8 La skill de release corre la compuerta con el `CHANGELOG.md` de `main` como
      base, suma la fila de la sección vacía y describe el centinela nuevo.
- [ ] 9.9 **OK humano: que una sección vacía caiga a la rama sin resumen** en
      `actions/aviso-version` (manda el cuerpo entero, como la ausencia). Cambia el
      mensaje que llega al canal y la salida `sin_para_consumidores` de una pieza
      referenciada: «Pregunta primero» de AGENTS.md. Hoy la action lo advierte y la
      compuerta lo pone rojo en el marco.
- [ ] 9.10 **Integrar después de `el-marco-declara-su-desvio-de-review` (carril L1)**, o
      junto con él (RV-L4-09). El `aprueba:` de este change cita un desvío que esta rama
      no declara; la guarda que lo pone rojo en un PR a `main` llega con el arreglo del
      change `que-es-breaking`.
