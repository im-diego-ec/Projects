---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tareas — el censo no miente

Todas las mediciones son del 2026-09-17, en el worktree del porte, con Node v24 y el bash
3.2 de macOS. El change lo implementa el lote 18 del porte de Rigel (ver `proposal.md`).
El orden importa: los lectores únicos (bloque 1) van antes que las dos compuertas que los
usan, y la relectura de las filas (4.3) antes que la regla que la exige quede en verde.

## Bloque 1 — Los lectores únicos

- [x] 1.1 Un solo lector de la versión publicada y un solo predicado de vencimiento.
      **Evidencia**: `pruebas/vigencia.mjs:48` (`versionPublicada`: el primer `## [X.Y.Z]`
      del CHANGELOG; sin ninguno lanza, no devuelve «nada vencido») y `:64` (`vencida`: una
      vigencia ausente o mal escrita cuenta como vencida). `pruebas/andamio/pinado.test.mjs`
      tenía su propia copia del regex del CHANGELOG y ahora importa este
      (`pinado.test.mjs:6`). Lo importan los tres bancos que tienen listas con ventana.
- [x] 1.2 Un solo lector de «qué actions alcanza algún `uses:`».
      **Evidencia**: `pruebas/alcance-de-las-actions.mjs:117` (`alcanzadas`), con las tres
      formas de invocar (`:96`: la publicada `im-diego-ec/Projects/actions/<x>@`, la del
      andamio `{{ORG_MARCO}}/Projects/actions/<x>@` y la local `./actions/<x>`), solo la
      clave `uses:` de verdad (ni comentada ni impresa por un `echo`), y los workflows
      DERIVADOS del árbol en cualquier profundidad (`:65`), sin recorrer repositorios
      anidados (`:52`). Sobre el árbol: alcanza `aviso-version`, `constitucion`,
      `guardrail-deltas`, `censo-fuentes` y `cobertura-diff`; **`carril-docs` no**.
      Vive en `pruebas/` y no en `herramientas/` (design D2: `herramientas/` viaja).

## Bloque 2 — Toda action publicada está alcanzada o declarada

- [x] 2.1 Banco `pruebas/andamio/actions-alcanzables.test.mjs`, seis casos.
      **Evidencia (rojo primero, sobre el árbol real)**: con la excepción de
      `carril-docs` renombrada a una que no existe, `node --test
      pruebas/andamio/actions-alcanzables.test.mjs` → **exit 1**, 2 casos caen, y el
      primero dice «'actions/carril-docs' no la invoca ningun workflow del marco ni del
      andamio (...) Tres salidas validas: cablearla (...); borrarla (...); o declararla en
      EXCEPCIONES». Restaurado → **exit 0**, 6/6.
- [x] 2.2 El lector no cuenta un worktree anidado.
      **Evidencia**: el caso MUERDE (`actions-alcanzables.test.mjs:83`) arma un árbol de
      juguete con seis actions y cinco trampas. Con el salto de repositorios anidados
      neutralizado (`recorrer(hija)` sin la guarda de `alcance-de-las-actions.mjs:52`) →
      **exit 1**: «actual: [ 'Mayuscula', 'anidada', 'invocada' ]». Con la guarda →
      exit 0.
- [x] 2.3 Decidir qué pasa con `carril-docs`: **se declara, no se cablea** (design D4).
      **Evidencia**: `actions-alcanzables.test.mjs:40` (`EXCEPCIONES`), con su motivo y
      `vigenteEn: "1.9.6"`. Medido que el marco tiene la misma detección inline en el job
      `cambios` de `marco-ci.yml`, con los mismos patrones por defecto
      (`rutas_carril_docs`): queda como pendiente de la línea v2.
- [x] 2.4 Las excepciones vencen al cortar versión.
      **Evidencia**: con `vigenteEn: "1.9.5"` → **exit 1**, «estas EXCEPCIONES quedaron
      VENCIDAS: carril-docs (vigente en 1.9.5, el CHANGELOG publica 1.9.6). Dos salidas
      (...)». Restaurado → exit 0.

## Bloque 3 — La excepción de `@v1` también vence

- [x] 3.1 `vigenteEn` en la única excepción de `pinado.test.mjs`, y un caso que la vence.
      **Evidencia**: `pinado.test.mjs:99` y el caso de `:355`, con sus controles positivos
      contra el predicado real. Con `vigenteEn: "1.9.5"` → **exit 1** (el caso cae); sin
      la clave → **exit 1** («no declaran `vigenteEn` como X.Y.Z»). Restaurado → exit 0,
      8/8.

## Bloque 4 — La página de cobertura

- [x] 4.1 Las reglas nuevas en el banco de la página, antes de tocar la página.
      **Evidencia**: `pruebas/docs/cobertura-de-requirements.test.mjs` —
      `ausenciasMalDeclaradas` (`:482`, con `EXCUSAS` en `:428` y los changes vivos en
      `:444`), `compuertasQueNoCorren` (`:555`, con el lector de 1.2),
      `compuertasSinCita` (`:588`), las parciales de cada encabezado (`:686`) y el
      desglose del resumen por estado (`:626`, `:739`). **Rojo primero**: con el banco
      nuevo y la página de antes del change, `node --test
      pruebas/docs/cobertura-de-requirements.test.mjs` → **exit 1**, 7 de 25 casos caen.
      Medido función por función sobre esa página: **25** ausencias sin declarar y **13**
      desajustes (12 encabezados sin sus parciales y el desglose ausente); cero
      compuertas que no corren y cero sin cita (esas dos son guardas hacia adelante: su
      rojo se ve en las refutaciones de 4.2).
- [x] 4.2 Las refutaciones corren la misma función que la regla.
      **Evidencia**: ocho casos MUERDE nuevos o reescritos (`:950` a `:1094`): el
      encabezado que se queda viejo (reescrito: ya no hay filas `ninguno` que mutar), la
      fila que pasa a parcial y el encabezado sin parciales, la fila `**ninguno**` pelada,
      el pendiente a un change que no existe o que no nombra al requirement (con un árbol
      de changes de juguete y su control positivo), el no verificable sin propiedad y con
      tres motivos de esfuerzo (con su control positivo), el sin destino vencido o mal
      escrito, la compuerta citada en una action que nadie invoca —por ruta, por paso, y
      con `carril-docs` del árbol real— y la fila con compuerta sin cita. Los `assert.match`
      nuevos llevan `porque()`.
- [x] 4.3 Releer las 25 filas `**ninguno**` una por una, contra el árbol.
      **Evidencia**: el resultado está en el design (D5): **9** ya tenían compuerta parcial
      y pasan a `**parcial**` con lo que cubren y lo que no; **5** quedan pendientes en el
      change vivo que las nombra (`stack-estandar` ×3, `promocion-por-ambientes`,
      `menu-que-no-miente`); **11** quedan sin destino, vigentes en 1.9.6; **0** no
      verificables. Para las 11: `grep -rlF '<título>' openspec/changes`, fuera de
      `archive/`, da cero en las once. Y dos filas parciales se corrigieron porque el
      árbol las contradecía: «Definición de propietarios de código» decía que nadie
      verificaba que el archivo existiera, y `pruebas/docs/codeowners.test.mjs` lo hace; «El
      deploy está gateado por el éxito de CI» decía que ningún caso cruzaba la etiqueta de
      DEV con la promoción, y `pruebas/andamio/desplegar.test.mjs:413` lo hace. De paso,
      sus anclas `:223` y `:238` —que habían ido a parar a una aserción de otro caso y a
      un cierre de paréntesis, que el banco no distingue de código sano— pasaron a los
      casos que nombran (`:253` y `:268`).
- [x] 4.4 Encabezados con sus parciales, el resumen con su desglose, y la prosa que las filas
      nuevas dejaban falsa.
      **Evidencia**: contrato **30 de 41** con compuerta (antes 24), **15** de ellas solo
      parciales; **11** sin compuerta: 0 pendientes, 0 no verificables, 11 sin destino, 0
      sin declarar. Se reescribieron los párrafos que la relectura desmentía: el resumen
      («publica un solo destino»), los de `despliegue-ci`, `pipeline-entrega`,
      `verificacion-desplegada`, `promocion-por-ambientes` («el change está en proposal»)
      y `capa-descubrimiento`, y «Qué NO dice esta tabla». Sección nueva «Cómo se declara
      una fila sin compuerta». `node --test
      pruebas/docs/cobertura-de-requirements.test.mjs` → **exit 0**, 25/25.
- [x] 4.5 Lo que describe la página, al día con su forma nueva.
      **Evidencia**: `openspec/config.yaml` (el contexto decía «o «ninguno»») y la fila de la
      página en `docs/README.md`. Y el change `rojo-primero`, que al archivar iba a escribir
      una fila `**ninguno**` con motivo —que desde este change es rojo—: su `design.md` (D5)
      y su `tasks.md` (4.2) dicen ahora `**no verificable** —`. `node --test
      pruebas/docs/*.test.mjs` → exit 0, 194/194.

## Bloque 5 — El contrato

- [x] 5.1 Cuatro requirements ADDED en `calidad-codigo`: la ausencia declara su estado; lo
      cubierto a medias se publica como tal; una compuerta que no corre no se publica; una
      excepción vence al publicarse otra versión.
      **Evidencia**: `specs/calidad-codigo/spec.md` de este change, 14 escenarios. Los
      cuatro títulos verificados a mano: `grep -rlF '### Requirement: <título>' openspec`
      → 0 para los cuatro antes de escribirlos (no existen vivos ni en otro change). Es
      solo ADDED: no hay escenario vigente que reproducir.
- [x] 5.2 Validación.
      **Evidencia**: `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all
      --strict` → **exit 0**, 34 passed, 0 failed. `node
      actions/guardrail-deltas/check-openspec-deltas.mjs` → **exit 0**.

## Bloque 6 — Verificación del lote

- [x] 6.1 Banco completo.
      **Evidencia**: `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test
      --test-reporter=tap | grep -E '^# (tests|pass|fail)'` → `# tests 1616`, `# pass
      1616`, `# fail 0`. Antes del lote (el árbol de `HEAD` exportado con `git archive`):
      1599/1599.
- [x] 6.2 Los bancos tocados no tapan su evidencia.
      **Evidencia**: `node pruebas/aserciones-con-evidencia.mjs
      pruebas/docs/cobertura-de-requirements.test.mjs
      pruebas/andamio/actions-alcanzables.test.mjs pruebas/andamio/pinado.test.mjs` →
      **exit 0** («los 3 banco(s) que toca este pull request no tapan su evidencia»). La
      primera corrida dio **exit 1** con 9 `assert.match` sin `porque()`; corregidos.
- [ ] 6.3 Archivar el change.
      **No hecho, a propósito**: el archive va en la pasada final del porte, después de la
      revisión adversarial. Al archivar, `calidad-codigo` gana cuatro requirements, y la
      página cuatro filas —con compuerta: los tres bancos de este change—.
- [ ] 6.4 Entrada en `CHANGELOG.md`.
      **No hecho en este lote**: la entrada está en
      `.porte/changelog/18-el-censo-no-miente.md` y se funde al integrar.

## Bloque 7 — Lo que encontró la revisión adversarial (2026-09-18)

- [x] 7.1 **Una ausencia escrita en otra forma contaba como compuerta** (FO-S20). `estadoDe`
      clasificaba como completa toda celda que no abriera exactamente con una de las formas en
      negrita. **Rojo, sobre la página real mutada como lo hizo la revisión** (la fila «El
      formato acordado se verifica en cada integración» con «**Ninguno**: hoy nada lo pone en
      rojo ...» y su ancla): antes, `25/25`; con el arreglo, `fail 7`. **Rojo primero en el
      banco:** dos casos nuevos contra la versión anterior → `tests 28, pass 26, fail 2`: siete
      formas de escribir la ausencia (con mayúscula, sin negrita, «nada», «sin compuerta», «no
      hay», una forma en negrita mal escrita) y una fila que solo cita documentación.
      **Arreglo:** en `pruebas/docs/cobertura-de-requirements.test.mjs`, `estadoDe` manda a
      «sin declarar» toda celda que abre en negrita sin ser una de las formas, o con una
      palabra de ausencia en cualquier caja; `ausenciasMalDeclaradas` la pone en rojo con su
      propio mensaje; `compuertasSinCita` no cuenta una ruta `.md`. El contrapeso tiene caso:
      las filas completas que abren con texto normal y las parciales siguen con compuerta, y la
      página real queda igual (30 de 41, 15 parciales). Resultado: `28/28`. En el delta de
      `calidad-codigo`: la cláusula y el escenario «Una ausencia escrita en otra forma», y la
      cita que no sea documentación en «Una compuerta que no se puede ir a mirar».
- [x] 7.2 **El lector del alcance contaba `uses:` que no invocan nada** (FO-S13). **Rojo
      primero:** el caso MUERDE nuevo de `pruebas/andamio/actions-alcanzables.test.mjs` contra el
      lector anterior → `fail 1`, y alcanzaba `input-desc` (un `description: |`), `heredoc` (un
      heredoc en un `run:`) y `docs-ejemplo` (un workflow que GitHub no corre). **Arreglo:**
      `alcanzadas()` lee solo la clave `uses:` de un paso con `pasosDe()`, y `workflowsDelArbol()`
      toma de `superficies()` solo los de `.github/workflows/` y `plantilla/.github/workflows/`
      (design D2). El recorrido propio del lector, con su guarda de repositorios anidados
      (`alcance-de-las-actions.mjs:52` de 2.2), se fue: la guarda vive ahora en `superficies()` de
      `pruebas/marco-ci/extraer.mjs`, compartida con el censo de pasos (bloque 7 de
      `rojo-primero`). Sobre el árbol siguen alcanzadas las cinco de siempre y `carril-docs`
      sigue declarada. Resultado: `7/7`. En el delta: el escenario «Una invocación que no invoca
      nada» suma la descripción de un parámetro y la definición que el proveedor no ejecuta.
- [ ] 7.3 **La hermana de 7.2 en el reusable**: el paso «Censo de fuentes cableado» de
      `marco-ci.yml` busca el cableado con un `grep` de línea, y un `- uses:
      .../actions/censo-fuentes@...` dentro de un heredoc lo da por cableado (confirmado por la
      revisión). No se arregla acá: corre en el árbol del consumidor, sin el código del marco,
      así que cerrarlo exige un lector de pasos dentro del YAML, atado por comportamiento a
      `pasosDe()` como el par de lectores de `permiso`. **Destino:** el lote 15 del porte
      (`las-actions-publicadas-resuelven-y-se-documentan`), cuyo item
      `la-compuerta-llega-o-se-declara` es esta pregunta.
- [ ] 7.4 **Tres choques seguros con el carril L2 al integrar** (RV-L3-04). No se arreglan
      desde acá porque el arreglo depende de lo que traiga L2. **Destino:** la integración de
      los carriles; quien junte L2 con este carril tiene que hacer las tres cosas:
      (a) el lote 6 de L2 (`guardrail-deltas-por-version-exacta`) borra la excepción de `@v1`
      de `pruebas/andamio/pinado.test.mjs` —«cero excepciones»— y este lote le agregó
      `vigenteEn` y un caso que la vence: al juntar, borrar ese caso (o reescribirlo para lo que
      quede) y corregir lo que afirma que la excepción existe: el fragmento
      `.porte/changelog/18-el-censo-no-miente.md` («Cambiado»), el encabezado de
      `pruebas/vigencia.mjs` y el proposal de este change. El lote 14 le sumó un `porque()` a la
      aserción de `@v1` de ese banco, que L2 también borra;
      (b) L2 agrega a la página la fila «El Environment de producción...» con «`**ninguno**`
      que se ponga rojo»: con la regla de este change es una ausencia sin declarar, y hay que
      reclasificarla con uno de los tres estados;
      (c) L2 le pone nombre al paso `id: detectar` de `marco-ci.yml` («Detectar el carril de
      docs»): la entrada `(sin name, id: detectar)` de `SIN_BANCO_TODAVIA` en
      `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs` pasa a ser una declaración fantasma
      y hay que renombrarla al nombre nuevo (o borrarla, si L2 le escribió banco).
- [ ] 7.5 **El próximo release sale rojo en 13 puntos, a propósito, y la skill del release no
      lo dice** (RV-L3-09). Medido el 2026-09-18 sobre una copia con `## [1.10.0]` agregado al
      CHANGELOG: `pruebas/docs/cobertura-de-requirements.test.mjs`,
      `pruebas/andamio/actions-alcanzables.test.mjs` y `pruebas/andamio/pinado.test.mjs` →
      `fail 5`, con 11 filas «sin destino» vencidas, la excepción de `carril-docs` y la de
      `@v1`. Cada rojo trae su arreglo, pero la skill `projects-release` no los nombra. No se
      edita desde acá: la skill la tocan tres carriles de esta misma ola (L1, L2 y L4), y un
      cuarto es un conflicto seguro. **Destino:** el lote 9 del porte
      (`el-ensayo-ejercita-lo-que-publica`), que ya reescribe el runbook de
      `.claude/skills/projects-release/SKILL.md`. Lo que tiene que agregar, en el paso que
      prepara el PR del release: releer cada fila «sin destino» vencida y decidirla de nuevo
      (compuerta, change que la tenga, propiedad que la hace no verificable, o mover
      `vigente en` a la versión nueva como decisión firmada), y lo mismo con cada excepción
      vencida de `actions-alcanzables.test.mjs` y `pinado.test.mjs`. Ningún lote publica
      versiones antes del lote 38 (D1), así que nadie corta un release antes de que eso esté.

## Pendiente fuera de este change

- **Las dos detecciones del carril de docs** —`actions/carril-docs` y la inline del job
  `cambios` de `marco-ci.yml`, con los mismos patrones— son el mismo predicado en dos
  lugares. Unificarlas toca el contrato del reusable: línea v2.
- **El alcance por consumidor** (nacidos contra adoptados): item
  `la-compuerta-llega-o-se-declara`, en otro lote del porte.
- **El release que corte la versión siguiente** va a encontrar en rojo, a propósito, las
  11 filas sin destino, la excepción de `carril-docs` y la de `@v1`. Cada rojo trae su
  arreglo. Que la skill `projects-release` lo diga es la tarea 7.5, con destino en el lote 9.
