---
artefacto: tasks
dri: Builder 1
aprueba: PO (el delta de gobierno-contribucion) y revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-marco-declara-su-desvio-de-review

## 1. El guardrail, primero en rojo

- [x] 1.1 El banco se escribió **antes** de tocar `AGENTS.md`:
      `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs`. Corrido sobre el
      árbol sin tocar → `tests 10 / pass 9 / fail 1`: la regla 1 en rojo
      («.github/CODEOWNERS nombra 1 dueno(s) […] y AGENTS.md exige revision
      cruzada sin declarar el desvio»). Las reglas 3 y 4 pasan sin el recuadro, a
      propósito: sin desvío declarado, el builder par es el aprobador correcto.
- [x] 1.2 Con el recuadro puesto y **antes** del barrido → `fail 1`, la regla 3,
      listando **58 líneas en 58 artefactos de 22 changes activos** que nombraban
      al builder par.
- [x] 1.3 La regla 5 (el PO no queda alcanzado por el desvío) se agregó y salió
      **roja** sobre `openspec/changes/reglas-al-dia/proposal.md:4`, que nombraba
      al PO solo en un comentario. Corregido al valor; verde.
- [x] 1.4 Siete refutaciones `MUERDE` que corren las mismas funciones sobre texto
      mutado: recuadro ausente, dueño repetido con otra capitalización, segundo
      dueño con el recuadro puesto, cada una de las piezas del recuadro sacada por
      separado, frontmatter con el builder par (e `informado:` y el valor nuevo que
      NO deben cazarse), PO solo en un comentario, archive sin revisión o con una
      sola lente. Banco → `tests 12 / pass 12 / fail 0`.

## 2. El desvío

- [x] 2.1 Recuadro en `AGENTS.md:60-89`, pegado al flujo que anula: aprobador y
      fecha, reemplazo y dónde se registra, por qué no va en
      `.projects-desvios.json`, condición de retiro con su comando, y lo que no
      cambia.
- [x] 2.2 `.github/CODEOWNERS:54` dice que la condición de retiro se lee de ese
      archivo.
- [x] 2.3 `openspec/config.yaml:60` lo dice en las reglas del proposal (parsea:
      `yaml.safe_load` → 6 reglas de proposal).
- [x] 2.4 La medición que pedía el plan, corrida y no solo leída: el bloque `run`
      del paso «Este repo es el que distribuye el marco» de `marco-ci.yml`,
      extraído y ejecutado sobre un clon descartable, da `es_distribuidor=true`
      **sin** y **con** un `.projects-desvios.json` rastreado en la raíz. No la
      altera. Pero para rastrearlo hizo falta `git add -f`: la ruta está ignorada
      a propósito por `.gitignore:63`, porque es la que usa el asistente para el
      proyecto que arma con doble clic. Por eso el desvío vive solo en
      `AGENTS.md`, como en Rigel, y el design lo explica.
- [x] 2.5 Medido el permiso real: `gh api "repos/{owner}/{repo}/collaborators"`
      → un solo login, rol `admin`; `gh api repos/{owner}/{repo} --jq .visibility`
      → `public`.

## 3. El barrido

- [x] 3.1 Las 58 líneas pasan a `revision adversarial (desvio del marco: un solo
      mantenedor, ver AGENTS.md)`, conservando los comentarios que acotan el gate
      del PO. Las líneas `informado:` no se tocan. Evidencia: la regla 3 del banco,
      verde.
- [x] 3.2 `orden-de-lectura`: el `aprueba` de su proposal pasa a la convención, y
      su design y su tasks —que no traían `aprueba` ni `estado`— los ganan.

## 4. La revisión adversarial de los doce changes terminados

- [x] 4.1 Un `revision-adversarial.md` en cada uno de los doce, con cuatro lentes
      —contrato, evidencia, mordida, consumidores y coherencia— y un veredicto.
- [x] 4.2 La mordida se midió **mutando un clon descartable** del árbol, no
      leyendo el banco. Resultado, un rojo o más en cada una: promesa sin
      constancia en `desplegar.yml` (1), `accesos.md` borrado (2), `citarRuta`
      neutralizada (8), piso sin `pull-requests: read` (2), cita a un canónico
      inventado (1), `gcp` fuera de la constitución que viaja (1), enlace roto (1),
      ancla muerta (1), la versión del registro como constante (6), el desvío de
      `openspec-roles` sobre otra regla (6), el `grep` del paso 6 aceptando
      cualquier texto (1), sin la visibilidad en `personalizar.yml` (1), el release
      sin `plantilla-aplicacion` (1), el aviso del desvío incompleto apagado (5), y
      `.pathname` en un clon con espacio en la ruta (13 de 13).
- [x] 4.3 Correcciones hechas en la revisión: el nombre del caso central de
      `pruebas/andamio/piso-del-reusable.test.mjs` (decía «EXACTAMENTE» y comprueba
      «al menos»); el escenario del delta de `orden-de-lectura` que fijaba un hecho
      con fecha como propiedad; y `docs/01-introduccion.md`, que se contradecía
      sobre qué publica el marco. Banco de `pruebas/docs/` → 182/182.

## 5. El archive

- [x] 5.1 Seis changes archivados con `projects-archive-change`, en este orden:
      `el-andamio-dice-la-verdad`, `el-comando-que-se-pega-funciona`,
      `el-piso-del-reusable-se-mide`, `los-changes-citan-lo-que-existe`,
      `orden-de-lectura`, `una-sola-lista-de-plataformas`. Inventario a mano: 8
      ADDED, 0 MODIFIED; el script aplicó 8. Escenarios antes/después, sin bajas:
      `calidad-codigo` 47 → 56, `documentacion-del-marco` 0 → 8,
      `base-tecnologica` 0 → 3. `git ls-files` de cada ruta original: vacío.
- [x] 5.2 `Purpose` de `base-tecnologica` y `documentacion-del-marco` escrito;
      `git grep -n -E "Purpose: TBD|^TBD$" -- openspec/specs/` → sin salida.
- [x] 5.3 `openspec/cobertura-de-requirements.md`: 49 requirements vivos en 10
      capabilities, 32 con compuerta; cuatro filas nuevas en `calidad-codigo`;
      `base-tecnologica` y `documentacion-del-marco` pasan a contrato vivo.
      `pruebas/docs/cobertura-de-requirements.test.mjs` → 13/13.
- [ ] 5.4 Archive de los seis que tocan `gobierno-contribucion`
      (`el-consumidor-se-anota`, `el-gate-del-po-se-declara`,
      `la-evidencia-del-ensayo-viaja`, `la-puerta-declara-lo-que-el-asistente`,
      `las-plantillas-no-quedan-atras`, `un-solo-predicado-del-desvio`).
      **Motivo:** esa aprobación es del PO y el desvío no la alcanza. Quedan
      revisados, con su hallazgo escrito, y dos de ellos
      (`la-evidencia-del-ensayo-viaja`, `un-solo-predicado-del-desvio`) con
      hallazgos que el PO tiene que decidir antes de fundirlos.

## 6. Verificación

- [x] 6.1 Banco completo:
      `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test`
      → `tests 1463 / pass 1463 / fail 0` (eran 1451; los 12 nuevos son de este
      banco).
- [x] 6.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 29 passed, 0 failed (29 items)` (eran 33: seis changes menos, dos
      specs más).
- [x] 6.3 `node actions/guardrail-deltas/check-openspec-deltas.mjs` → «20
      requirement(s) comparados en 19 delta(s) activo(s) y 8 delta(s)
      archivado(s); ningún MODIFIED perdería escenarios y todo lo archivado está en
      el spec vigente».
- [x] 6.4 La entrada de CHANGELOG va como fragmento en
      `.porte/changelog/02-el-marco-declara-su-desvio-de-review.md`: durante el
      porte `CHANGELOG.md` no se edita por lote, se integra al final.

## 7. Lo que queda abierto, con dueño

- [ ] 7.1 La revisión adversarial de **este** change, antes de archivarlo. La
      regla 4 del banco lo exige: sin `revision-adversarial.md` no se puede
      archivar.
- [ ] 7.2 El OK del PO para los seis de `gobierno-contribucion` (tarea 5.4).
- [ ] 7.3 Tres consumidores reales en `@v1.9.6` fuera de `docs/14-consumidores.md`,
      y el paso 6 del release eximiendo la terna por ese conteo. **Motivo:** medir
      la fecha de adopción y la versión de nacimiento es leer la historia de tres
      repos ajenos; lo decide el PO junto con el hallazgo de
      `la-evidencia-del-ensayo-viaja`.
- [ ] 7.4 Tres documentos dicen que el repositorio del marco es privado y es
      público (`docs/01-introduccion.md:47`, `docs/04-arrancar-acompanado.md:136`,
      `README.md:138`). **Motivo:** `docs/04` lo reescribe otro lote del porte en
      paralelo; se corrigen juntos para no dejar la documentación contradiciéndose.
- [ ] 7.5 El guardrail de deltas sale verde y mudo ante un directorio inexistente
      (medido). **Motivo:** es una action publicada y ningún lote del porte lo toma;
      queda reportado sin dueño.
