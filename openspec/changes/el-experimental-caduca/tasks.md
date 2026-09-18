---
artefacto: tasks
dri: Builder 1
aprueba: PO
estado: en-ejecucion
---

# Tasks — el-experimental-caduca

Líneas medidas sobre el árbol de este change. Las anteriores se citan contra `f6a01ac`,
el commit sobre el que arranca. Toda verificación es por código de salida.

## 1. Los bancos primero, con el rojo a la vista

- [x] 1.1 Banco nuevo `pruebas/marco-ci/caducidad-experimental.test.mjs`, escrito
      **antes** del paso: 15 casos sintéticos (`:63-280`) y dos de dogfooding que
      derivan los sujetos del árbol en vez de nombrarlos (`:318`, `:323`). Corrido sin el
      paso: `node --test --test-reporter=tap pruebas/marco-ci/caducidad-experimental.test.mjs`
      → `# tests 17 · # pass 0 · # fail 17`, los 17 con «no existe ningun paso llamado
      "Estado experimental con fecha de veredicto"».
- [x] 1.2 El paso de Rigel **copiado literal** (commit `08f3b2e`) en el mismo lugar,
      contra el mismo banco: `# tests 17 · # pass 13 · # fail 4`. Los cuatro rojos son las
      adaptaciones: `:150` (el verde no nombra al sujeto), `:179` (acepta `2026-13-01`),
      `:214` (con `experimental: true  # comentario` y la fecha vencida sale 0 diciendo
      «ningun change activo se declara experimental: el paso es inerte») y `:238`
      (`experimental: si` pasa por falso). El paso literal se retiró antes de escribir
      el adaptado.
- [x] 1.3 Banco nuevo `pruebas/ci-del-marco/canonico-versionado.test.mjs`, escrito
      **antes** del job: 15 casos (dos más en 2.6), uno sobre datos reales (`:346`,
      el manifiesto y el CHANGELOG de hoy con la huella pegada sobre la última versión
      publicada) y uno sobre el cableado de `ci-ok` (`:371`). Corrido contra el `ci.yml` de `f6a01ac`:
      `# tests 1 · # fail 1`, «no existe ningun paso llamado "Una version publicada del
      canonico no se reescribe"».
- [x] 1.4 **El hueco era real**, medido sobre `git archive f6a01ac` en un clon aparte:
      una línea nueva en `actions/constitucion/canonico/40-fronteras.md` y la huella nueva
      (`4e0c8b457484…`) pegada sobre la de la 1.7.0 (`3180d942a463…`).
      `node --test actions/constitucion/pruebas/huella-del-canonico.test.mjs` →
      `# tests 4 · # pass 4`; `find actions -name '*.test.mjs' … | xargs node --test` →
      `# tests 418 · # pass 418 · # fail 0`. Sobre ese mismo par de commits, el job nuevo
      sale **1** con «la version 1.7.0 ya se publico con huella_canonico 3180d942… y este
      PR se la cambia a 4e0c8b45…».
- [x] 1.5 **La regla literal de Rigel no sirve acá**, medido: su script
      (`git show 08f3b2e:.github/workflows/ci.yml`, paso «El canonico que se mueve gana
      una version») sobre un repo de juguete con la entrada pendiente `1.10.0`
      reescrita en su lugar sale **1** con «el manifiesto sigue con 2 entradas de
      version». El banco de acá lo fija en verde (`:164`).

## 2. El arreglo

- [x] 2.1 Paso «Estado experimental con fecha de veredicto» en el job `openspec` de
      `.github/workflows/marco-ci.yml:979`, después de la validación estricta. Lector de
      frontmatter sin dependencias que descarta comentarios y comillas, `esFecha()` que
      exige un día real, reglas de Rigel conservadas (D2 del design). Banco:
      `# tests 17 · # pass 17 · # fail 0`.
- [x] 2.2 Permisos auditados acción por acción **antes** del estreno: tabla en
      `.github/workflows/marco-ci.yml:685-704`. Resultado: ninguno nuevo, el job sigue
      con `contents: read`. `pruebas/andamio/piso-del-reusable.test.mjs` y
      `pruebas/andamio/permisos-por-job.test.mjs` en verde dentro de la suite (4.1).
- [x] 2.3 Job `canonico` (`name: canonico-versionado`) en `.github/workflows/ci.yml:1036`,
      paso en `:1062`, con su auditoría de permisos en el comentario del job
      (`contents: read`, `persist-credentials: false`), `timeout-minutes: 5` y los mismos
      pines por SHA que el resto del archivo. `ci_ok` lo espera (`:1205`) y lo cobra con
      la asimetría del carril de push (`:1281-1298`). Banco:
      `# tests 15 · # pass 15 · # fail 0` (17 con los de 2.6).
- [x] 2.4 `actions/constitucion/pruebas/huella-del-canonico.test.mjs`: el encabezado dice
      qué mitad no puede ver y quién la cobra, con la medición de 1.4 (`:39-47`), y el
      mensaje de error distingue versión publicada de pendiente (`:92-97`).
      `# tests 4 · # pass 4`.
- [x] 2.5 `openspec/config.yaml:50-56`: los dos campos opcionales dejan de ser una
      convención y nombran el paso que los cobra, con la regla de la fecha más temprana.
      El CLI lo carga sin error: `validate --all --strict` en 4.2.
- [x] 2.6 **Una rama atrasada no es culpable de lo que avanzó `main`.** Revisando el job
      antes del commit: GitHub manda como base la punta de `main`, y con la rama salida
      antes de un release esa punta trae una versión que la rama no tiene. Dos casos
      nuevos en el banco, con una rama de verdad (`repoConRamas()`): la rama atrasada
      que no toca el manifiesto (`:272`) y la que reescribe una entrada que `main`
      publicó mientras tanto (`:295`). Con el job comparando contra la punta:
      `# tests 17 · # pass 16 · # fail 1`, el primero en rojo. Arreglo: el manifiesto
      «antes» sale de `git merge-base` y el CHANGELOG, de la punta; el segundo caso es
      rojo con «actualizala con main». `# tests 17 · # pass 17 · # fail 0`. Escenarios
      nuevos en el delta de `calidad-codigo`.

- [x] 2.7 **La clave del frontmatter se normaliza** (hallazgo FO-H4 de la revisión
      adversarial). `Experimental: true` o `"experimental": true` —YAML válido— dejaban el
      change leído como no experimental y el paso en verde diciendo «inerte». Rojo
      primero: cuatro casos nuevos en `pruebas/marco-ci/caducidad-experimental.test.mjs`
      (cuatro grafías de la clave, fecha y veredicto con otra grafía, la misma clave dos
      veces con valores distintos, claves ajenas sin ruido) contra el paso de `fcc9548`
      → `# tests 21 · # pass 18 · # fail 3`. Después, `frontmatter()` del paso le saca las
      comillas a la clave, la pasa a minúsculas y junta los dos valores si la misma
      clave aparece dos veces con valores distintos —el resultado no es booleano ni
      fecha, y eso es rojo— → `21/21`. `actionlint` → `rc=0`.
- [x] 2.8 **El comentario del job `canonico` decía «la punta de main»** (hallazgo FO-H5,
      que la revisión dejó como no confirmado). La base es la del payload del evento; el
      comentario del paso, el encabezado del job, el proposal y el design lo dicen así, y
      el design declara el límite: un verde calculado antes de que `main` publique una
      versión queda rancio. Lo que lo cierra es 5.6.

## 3. `capa-descubrimiento`: el requirement sale, la fecha se corre

- [x] 3.1 Su delta de `gobierno-contribucion` pierde «El estado experimental de un change
      caduca por fecha» (eran tres requirements, quedan dos:
      `grep -c '^### Requirement' openspec/changes/capa-descubrimiento/specs/gobierno-contribucion/spec.md`
      → `2`). El requirement vive en `specs/gobierno-contribucion/spec.md` de este change.
- [x] 3.2 Sus tareas 4.1 a 4.5 salen, con una tabla que dice dónde quedó cada una
      (`openspec/changes/capa-descubrimiento/tasks.md`, bloque 4); la 6.3 queda `[x]`
      («rescatado antes del veredicto»); el encabezado dice la fecha nueva. `proposal.md`
      (Capabilities, What Changes, Impact, «El estado experimental») y `design.md` (D7,
      la cita del requirement, D11 y la fila de la tabla de checks) dicen lo mismo.
- [x] 3.3 Decisión D3 del PO: `veredicto_antes_de` pasa de 2026-09-21 a **2026-10-15**
      en los seis artefactos que la declaran
      (`grep -rn '^veredicto_antes_de' openspec/changes/capa-descubrimiento` → seis líneas,
      todas `2026-10-15` con el comentario que apunta al motivo), y el motivo está en su
      `proposal.md`, sección «Por qué se corrió la fecha del veredicto». En
      `piloto/pre-registro.md` solo cambia esa línea.
- [x] 3.4 Dogfooding sobre el árbol real, con el script extraído del YAML:
      `HOY_ISO=2026-09-22` → exit 0, `HOY_ISO=2026-10-15` → exit 0,
      `HOY_ISO=2026-10-16` → exit 1 («capa-descubrimiento se declaro experimental con
      veredicto_antes_de: 2026-10-15, esa fecha ya paso»); sin `HOY_ISO` → exit 0 e
      imprime «capa-descubrimiento (vence 2026-10-15)». Y el control de D3: el mismo paso
      sobre los artefactos de `f6a01ac` (fecha vieja) con `HOY_ISO=2026-09-22` → exit 1.

## 4. Verificación

- [x] 4.1 Suite completa:
      `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap`
      → `# tests 1533 · # pass 1533 · # fail 0` (eran 1499 en `f6a01ac`; +17 y +17).
      Incluye `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs` (el paso nuevo queda
      citado), `acentos-en-los-yml`, `sintaxis-de-los-run`, `techo-de-tiempo`,
      `permisos-por-job` y `pinado`.
- [x] 4.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 36 passed, 0 failed (36 items)`, con `change/el-experimental-caduca` y
      `change/capa-descubrimiento` en la lista.
- [x] 4.3 Guardrail de deltas: `node actions/guardrail-deltas/check-openspec-deltas.mjs`
      → exit 0, «13 requirement(s) comparados en 28 delta(s) activo(s)».
- [x] 4.4 Títulos verificados a mano (el guardrail no avisa si un título no existe):
      los dos deltas son solo `ADDED`, y
      `grep -rn --include=spec.md -F '### Requirement: <título>' openspec` fuera de
      `archive/` devuelve una sola línea por título, la de este change. Ningún `MODIFIED`.
- [x] 4.5 Entrada del CHANGELOG escrita como fragmento del porte en
      `.porte/changelog/01-el-experimental-caduca.md`, con «Para consumidores». El
      `CHANGELOG.md` lo integra la pasada final del porte, no este commit.

## 5. Lo que queda abierto

- [ ] 5.1 Aprobación del PO del delta de `gobierno-contribucion` y revisión adversarial
      con lentes independientes, registrada en este change. Motivo: el marco tiene hoy
      un solo mantenedor (decisión D8) y la revisión corre en la pasada posterior.
- [ ] 5.2 Correr el CI en GitHub: `actionlint` y `shellcheck` sobre el job y el paso
      nuevos. Motivo: ninguno de los dos está instalado en esta máquina
      (`which actionlint shellcheck` → «not found»); el banco local cubre la sintaxis de
      bash pero no la de GitHub Actions.
- [ ] 5.3 Probar el paso contra un consumidor real antes de publicar la versión
      (skill `projects-validar-consumidor`). Motivo: desde esta sesión no se escribe en
      los repos consumidores.
- [ ] 5.4 Archivar. Motivo: va después de 5.1, en la pasada final.
- [ ] 5.5 El 2026-10-15, el PO decide entre adoptar el veredicto de Rigel o descartar
      `capa-descubrimiento` con un ADR (D3). No es tarea de este change: si no ocurre,
      el paso de este change pone rojo el CI de Projects el 2026-10-16, que es lo que
      tiene que pasar.
- [ ] 5.6 **Que el ruleset de `main` exija ramas al día antes de mergear** (hallazgo FO-H5
      de la revisión adversarial). Sin eso, el verde de `canonico-versionado` puede venir
      de una base anterior a la publicación de una versión, y el PR que reescribe esa
      entrada entra igual si no choca con el release en el texto. Es configuración de
      GitHub, no del árbol, y `main` todavía no tiene ruleset
      (`.github/proteccion-main.md`): acto del administrador del repo. Destino: la misma
      decisión que active el ruleset; hasta entonces, el límite queda escrito en el
      design y en el comentario del paso.
