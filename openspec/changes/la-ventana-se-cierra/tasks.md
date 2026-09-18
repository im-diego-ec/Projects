---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — la-ventana-se-cierra

Líneas medidas sobre el árbol de este change; las anteriores se citan contra `fcc9548`,
el commit sobre el que arranca. Toda verificación es por código de salida.

<!-- EL MARCADOR DE DUENO DEL 2026-09-30 SE FUE CON LA FECHA (tarea 3.2). No se
     reproduce aca ni siquiera citado: la compuerta lo busca en todo el texto de los
     changes activos, y citarlo lo volveria a declarar.
     pruebas/ci-del-marco/ventanas-con-dueno.test.mjs lo exigia mientras la fecha
     estuvo viva en el codigo; con las dos ventanas borradas no queda fecha de la que
     ser dueno. Si una ventana nueva aparece, el change que la adopte escribe su propio
     marcador. -->

## 1. Los pendientes heredados quedan con destino

- [x] 1.1 4.5c declarado **no bloqueante** con su razón: su sujeto —una rama de un
      consumidor de Rigel con un paquete `web` bajo el mínimo— no existe en Projects. Sus
      tres consumidores reales no son ese repositorio (design, «Por qué el 4.5c se
      declara y no se resuelve»).
- [x] 1.2 4.5d apuntado a este change, y hecho en 3.1.

## 2. La compuerta de las fechas con dueño

- [x] 2.1 Banco que exige que toda fecha de gracia viva tenga un change activo que se
      declare su dueño. Evidencia: `pruebas/ci-del-marco/ventanas-con-dueno.test.mjs:207`.
- [x] 2.2 MUERDE: mencionar la fecha no alcanza; una fecha sin dueño no pasa
      (`pruebas/ci-del-marco/ventanas-con-dueno.test.mjs:220`).
- [x] 2.3 **La compuerta no veía ni el andamio ni la asignación de una línea.** Se suman
      `plantilla` a las raíces y el patrón YAML `CLAVE: "AAAA-MM-DD"` (también comentado)
      (`pruebas/ci-del-marco/ventanas-con-dueno.test.mjs:36-51`). Medido con la constante
      de cobertura ya borrada y el resto como en `fcc9548`: la versión anterior
      (`git show fcc9548:pruebas/ci-del-marco/ventanas-con-dueno.test.mjs`) devolvía
      `[{"fecha":"2026-09-30","archivo":".github/workflows/marco-ci.yml"}]`; la nueva, tres
      (el default del input, el `with:` de ejemplo comentado de `marco-ci.yml:86` y
      `plantilla/.github/workflows/ci.yml:281`). Con el marcador quitado a mano:
      `node --test --test-reporter=tap pruebas/ci-del-marco/ventanas-con-dueno.test.mjs`
      → `# tests 5 · # pass 4 · # fail 1`, los tres archivos listados. Marcador repuesto.
- [x] 2.4 **La anti-vacuidad pasa a un sujeto sintético**
      (`pruebas/ci-del-marco/ventanas-con-dueno.test.mjs:186`): un árbol con la constante
      JS, el default de un input y el env de un workflow del andamio, más un fixture de
      banco que no tiene que contar. El caso viejo «el escaneo encuentra algo» sobre el
      árbol real habría quedado rojo para siempre.
- [x] 2.5 MUERDE de la forma nueva: la asignación con y sin comillas, comentada, y los dos
      falsos positivos que no puede producir (una clave que lee un input, una fecha con
      otra clave) (`pruebas/ci-del-marco/ventanas-con-dueno.test.mjs:235`).

## 3. La ventana de cobertura se borra

- [x] 3.1 **Tests primero.** El banco de `cobertura-diff` portado de Rigel (`771ba2c`,
      adaptado: «la 2.0.0» → este change) y el fixture `lcov-cubierto-windows.info` con
      `FNF:0`/`BRF:0`. Corrido contra el comparador de `fcc9548`:
      `node --test --test-reporter=tap actions/cobertura-diff/pruebas/cobertura-total.test.mjs actions/cobertura-diff/pruebas/cobertura-diff.test.mjs`
      → `# tests 96 · # pass 77 · # fail 19`. Después, el borrado de
      `VENTANA_DE_GRACIA_HASTA` y de todo lo que la propagaba en
      `actions/cobertura-diff/medir-cobertura-diff.mjs` → `# tests 96 · # pass 96 · # fail 0`.
      Casos nuevos: `cobertura-total.test.mjs:142` (rojo los tres días que la ventana
      distinguía), `:532`, `:743` (ninguna amnistía con fecha vuelve), `:906`, `:1077`.
- [x] 3.2 Verificación del borrado:
      `grep -c "VENTANA_DE_GRACIA\|ventanaHasta\|enVentana\|enGracia\|en-gracia\|porLaVentana\|diasDeVentana" actions/cobertura-diff/medir-cobertura-diff.mjs`
      → `0`. Y quitado de este `tasks.md` el marcador de dueño de esa fecha:
      `node --test pruebas/ci-del-marco/ventanas-con-dueno.test.mjs` sigue en verde porque
      `ventanasVivas()` devuelve `[]`.
- [x] 3.3 Banco nuevo `pruebas/ci-del-marco/sin-exigibilidad-futura.test.mjs` (de Rigel,
      `771ba2c`): ninguna versión del manifiesto del canónico se declara exigible después
      de publicada. Verde: `# tests 2 · # pass 2`. Rojo demostrado sobre el archivo real:
      con `exigible_desde` de la 1.7.0 puesto a mano en `2026-09-28` →
      `# pass 1 · # fail 1`, «estas versiones del marco se conceden una ventana de gracia:
      1.7.0 (publicada 2026-08-31, exigible 2026-09-28)». Manifiesto restaurado
      (`git status actions/constitucion` limpio).
- [x] 3.4 Documentación que prometía la ventana: `actions/README.md:436-445` y el
      comentario del plano del total en `plantilla/.github/workflows/ci.yml:481-485`.

## 4. La decisión, para el PO

- [x] 4.1 Confirmado que la ventana **se cierra** y no se extiende: decisión D9 del PO,
      sesión del 2026-09-17 del porte de Rigel a Projects, textual: «La ventana de gracia
      se cierra. El endurecimiento de Terraform queda anunciado para v2, y
      `ventana_terraform` queda como no-op hasta v2.»

## 5. La segunda ventana: `ventana_terraform` y el job `terraform`

- [x] 5.1 **Tests primero.** `pruebas/andamio/terraform-en-ci.test.mjs` pasa a extraer el
      paso del **reusable** y gana las ramas que ningún caso ejercitaba (`:357` raíces
      vacías, `:366` `pull_request_target`, `:381` input sin efecto, `:397` gravedad
      inválida, `:406` el día de la corrida, `:419` la gravedad declarada muerde) y el
      bloque de la línea mayor (`:482`, `:489`). Corrido contra el paso de `fcc9548`:
      `# tests 27 · # pass 8 · # fail 19`.
- [x] 5.2 El paso de `.github/workflows/marco-ci.yml`: `GRAVEDAD_TERRAFORM: warning` en su
      env (`:4314`), validado antes de usarse (`:4331`), el `::notice::` del input sin
      efecto antes de mirar raíces (`:4324-4326`) y el del modo aviso (`:4373`). El input
      `ventana_terraform` queda declarado, sin efecto y con `default: ""` (`:261-275`); el
      ejemplo comentado del encabezado ya no lo pasa. Banco:
      `# tests 27 · # pass 26 · # fail 1` (el que faltaba era 5.3).
- [x] 5.3 La copia inline del andamio se retira
      (`plantilla/.github/workflows/ci.yml:223-242`, un comentario que dice dónde vive la
      verificación). Banco: `# tests 27 · # pass 27 · # fail 0`. El caso
      «el andamio NO trae una segunda copia» (`terraform-en-ci.test.mjs:214`) estaba rojo
      mientras la copia existía (medido en 5.2).
- [x] 5.4 El veredicto `marco-ok` y los encabezados del job dicen lo que pasa ahora
      (`.github/workflows/marco-ci.yml:4212-4231`, `:4259-4277`, y el comentario y el
      mensaje del veredicto).
- [x] 5.5 Permisos auditados acción por acción: el job `terraform` sigue con
      `contents: read` y el paso no agrega ninguna llamada a la API, ninguna action ni
      ningún binario: lee env y corre `terraform` local. Ningún permiso nuevo.
- [x] 5.6 Lo que nombraba la copia: `plantilla/AGENTS.md` (tres pasos para sacar
      Terraform, no cuatro), `plantilla/infra/adaptadores.md`, `plantilla/infra/README.md`
      y `plantilla/infra-prod/README.md` (el job del marco, modo aviso por versión y no por
      fecha), `herramientas/projects-init.mjs` (comentario del `[ -d ]`),
      `pruebas/init/plataforma.test.mjs:87` (lee el `[ -d ]` del reusable),
      `pruebas/docs/lo-que-lee-el-consumidor.test.mjs:114` (el motivo de «modo aviso») y
      tres anclas de `openspec/cobertura-de-requirements.md` (`:115`, `:218`, `:240`).
- [x] 5.7 `actionlint .github/workflows/marco-ci.yml` → sin salida, `rc=0` (igual que antes
      del cambio).

## 6. Spec, validación y CHANGELOG

- [x] 6.1 Delta de `calidad-codigo`: `MODIFIED` del requirement de cobertura con sus **19**
      escenarios (comparados a mano por título contra el spec vivo: ninguno falta ni
      sobra), y dos `ADDED` cuyos títulos no existen en el spec vivo ni en otro change.
      `node actions/guardrail-deltas/check-openspec-deltas.mjs` → «ningún MODIFIED
      perdería escenarios», `rc=0`.
- [x] 6.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 36 passed, 0 failed (36 items)`.
- [x] 6.3 Fragmento de CHANGELOG con «Para consumidores»:
      `.porte/changelog/07-la-ventana-se-cierra.md`. No se edita `CHANGELOG.md` en este
      lote: se integra en la pasada final del porte.
- [x] 6.4 Suite completa:
      `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap`
      → `# tests 1542 · # pass 1542 · # fail 0` (sobre `fcc9548`, antes del change: 1533).

## 7. Pendiente — lo que este lote no puede cerrar

- [ ] 7.1 **Cuándo se publica.** Si la versión que trae este change se publica antes del
      2026-10-01, el rojo de cobertura se adelanta al PR de bump de cada consumidor; la D1
      lo admite, pero el fragmento del CHANGELOG lo tiene que decir con la fecha real de
      publicación. Destino: el PR de release. No se puede cerrar desde acá porque ningún
      lote publica versiones.
- [ ] 7.2 **Validación contra un consumidor real** (skill `projects-validar-consumidor`):
      un consumidor con raíces de Terraform y el `with:` pasando `ventana_terraform`, para
      ver el `::notice::` y el aviso en una corrida de verdad. Destino: la pasada final
      del porte, antes del release. Desde esta sesión no se escribe en repos consumidores.
- [ ] 7.3 **Revisión adversarial con lentes independientes**, registrada en este change
      (desvío D8: un solo mantenedor). Destino: la pasada final del porte.
- [ ] 7.4 **Al archivar**: el caso «el comparador no tiene ninguna amnistía con fecha»
      (`actions/cobertura-diff/pruebas/cobertura-total.test.mjs:743`) suma la mitad del
      spec —que `openspec/specs/calidad-codigo/spec.md` no prometa ninguna fecha de
      cierre—, que hoy sería rojo por el orden del flujo y no por un defecto.
- [ ] 7.5 **En v2** (lo cobra solo `terraform-en-ci.test.mjs:482` en el PR de la 2.0.0):
      `GRAVEDAD_TERRAFORM: error`, quitar el input `ventana_terraform`, y el
      `hashicorp/setup-terraform` pinado por SHA que el encabezado del job describe
      (action de terceros: requiere OK humano).
