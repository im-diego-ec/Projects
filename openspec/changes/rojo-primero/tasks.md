---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tareas — rojo primero

El orden importa: los bloques 1 y 2 ponen al repo en condición de cumplir, y el bloque 3
recién entonces exige. Todas las mediciones son del 2026-09-17, en el worktree del porte,
con Node v24.19.0 y el bash 3.2 de macOS, salvo donde se dice otra cosa. El change lo
implementa el lote 17 del porte de Rigel (ver `proposal.md`).

## Bloque 1 — Caso rojo para las compuertas que ya existen

- [x] 1.1 Inventariar las compuertas vivas del marco y, para cada una, si tiene un caso que
      la ponga en rojo.
      **Evidencia**: el inventario ya no es a mano: lo DERIVA el censo de pasos
      (`pruebas/marco-ci/cobertura-de-los-pasos.test.mjs`), extendido a todas las
      superficies (bloque 2). Antes miraba **17** pasos (`run: |` de `marco-ci.yml`); ahora
      **112** en **15** superficies. Primera corrida con la deuda y los «sin rojo» ya
      declarados y antes de escribir ningún banco:
      `node --test pruebas/marco-ci/cobertura-de-los-pasos.test.mjs` → **exit 1**, caso
      «ningun paso queda sin estado» con **16** pasos: 5 de `marco-ci.yml` (los cinco de la
      deuda vieja de abajo), 5 pasos de actions con guard de node, 4 del andamio
      (`actualizar-marco.yml`, `ci.yml` ×2, `claude.yml`), el «Veredicto» del andamio y
      «Verificar que el bot esta configurado» del CI del marco.

- [x] 1.2 Escribir el caso rojo que falte, y verlo morder.
      **Evidencia**: bancos nuevos, cada uno corre el script REAL (`scriptDelPaso`):

      | Compuerta | Banco | Casos |
      |---|---|---|
      | Exigir OpenSpec en el repo · El andamio reparte el umbral del total del marco · Censo de fuentes cableado | `pruebas/marco-ci/compuertas-de-estructura.test.mjs` | 23 |
      | Definiciones de pipeline validas (sin red: `curl` y release de actionlint de mentira) | `pruebas/marco-ci/definiciones-pipeline.test.mjs` | 6 |
      | Validacion estricta de changes y specs (sin red: `npm` de mentira) | `pruebas/marco-ci/validacion-estricta.test.mjs` | 9 |
      | El arbol arranca limpio · Todo paquete declara los scripts de verificacion · Verificar cada paquete · Veredicto (andamio) · Verificar que el bot esta configurado (andamio y marco) | `pruebas/andamio/compuertas-del-andamio.test.mjs` | 21 |
      | Los 5 pasos de actions con guard de node (ya los corría; ahora los nombra) | `pruebas/ci-del-marco/node-en-las-actions.test.mjs:195` (`PASOS_CON_GUARD`) | +1 |

      **Todos muerden**: `python3 sabotajes.py` (en el scratchpad del porte) sabotea cada
      compuerta, corre su banco, y restaura (`git diff --stat` vacío al final):

      | Se rompió | Resultado del banco |
      |---|---|
      | OpenSpec deja de exigir `openspec/` | exit 1, 1 de 23 cae |
      | umbral: dos números distintos dejan de ser rojo | exit 1, 1 de 23 |
      | umbral: vuelve a leer los comentarios | exit 1, 1 de 23 («un comentario no declara nada») |
      | censo: sin cablear deja de ser rojo | exit 1, 4 de 23 |
      | definiciones: un hallazgo deja de ser rojo | exit 1, 1 de 6 |
      | definiciones: se saltea el sha256 | exit 1, 1 de 6 |
      | validación: el rojo del CLI se traga (`\|\| true`) | exit 1, 1 de 9 |
      | validación: una huella distinta deja de ser rojo | exit 1, 1 de 9 |
      | andamio: un árbol sucio deja de ser rojo | exit 1, 2 de 21 |
      | andamio: un script faltante deja de ser rojo | exit 1, 1 de 21 |
      | andamio: el fallo de un paquete se pierde | exit 1, 1 de 21 |
      | andamio: el veredicto deja de mirar a `marco` | exit 1, 2 de 21 |
      | andamio: el bot sin token sale 0 | exit 1, 1 de 21 |

      Con los bancos escritos, las cinco entradas de `SIN_BANCO_TODAVIA` de `marco-ci.yml`
      que ya no eran deuda se borraron (el censo lo exige: «la deuda declarada esta al
      dia»).

- [x] 1.3 Cazar las compuertas que hoy NO pueden fallar por el motivo correcto.
      **Evidencia**, tres, y ninguna venía de Rigel:
      - **La cláusula `all: true` del umbral se cumplía con un comentario.**
        `plantilla/vitest.config.base.mjs` ya no usa `all: true` (vitest lo retiró en su
        mayor 4) y su comentario lo nombra dos veces. Caso «umbral · ROJO: un comentario no
        declara nada» ANTES del arreglo: `node --test
        pruebas/marco-ci/compuertas-de-estructura.test.mjs` → **exit 1**, el caso sale con
        el paso en `exit 0` y «el andamio reparte el umbral del total (80%) y coincide».
        Arreglo en `.github/workflows/marco-ci.yml:2561-2587`: exige `include:` y lee solo
        las líneas que no son comentario (`sed`, :2577). DESPUÉS: 23/23. El caso que ata al
        árbol real («la configuracion REAL del andamio pasa») sigue verde.
      - **El paso de Terraform de `marco-ci.yml` salía «con banco» sin tenerlo**: su nombre
        es el del paso del andamio, que `terraform-en-ci.test.mjs` sí corre. Queda como
        deuda declarada con ese motivo (`cobertura-de-los-pasos.test.mjs`, entrada
        «Formato y validez de las raices de Terraform»).
      - **El Veredicto del andamio salía «con banco» por el banco del de `marco-ci.yml`**
        (`distribuidor.test.mjs` corre uno y nombra el archivo del otro para otra cosa).
        Ahora tiene banco propio (`compuertas-del-andamio.test.mjs`, 6 casos).

## Bloque 2 — El censo de pasos: todas las superficies, y deuda separada de «sin rojo»

- [x] 2.1 Definir dónde vive la declaración (D2, D3 del design).
      **Evidencia**: en el propio banco, `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs`:
      `SIN_BANCO_TODAVIA` (:116, deuda con motivo), `SIN_ROJO` (:195, con tipo `plomeria` /
      `rojo-ajeno` / `aviso` y motivo) y `TERCEROS` (:268, una vez por action ajena). No hay
      marcas en los YAML: lo que se puede derivar —qué banco corre qué paso— se deriva.

- [x] 2.2 Derivar el censo del árbol.
      **Evidencia**: `superficies()` y `pasosDe()` en `pruebas/marco-ci/extraer.mjs:341` y
      `:245`, con su banco en `pruebas/marco-ci/extraer.test.mjs` (4 casos nuevos, uno de
      ellos atado al árbol real: cada paso «extraíble» se extrae con `scriptDelPaso` y mide
      lo mismo). El primer borrador de `pasosDe` leía `continue-on-error: false` del JOB
      como si desactivara el rojo: lo cazó su propio caso (**exit 1** antes, 9/9 después).
      La cita de un banco se resuelve con `extraccionesDe()` (:345 del censo) antes de caer
      al texto. Corrida final:
      `node --test pruebas/marco-ci/cobertura-de-los-pasos.test.mjs` → **exit 0**, 17/17, y
      `== resumen == 112 pasos en 15 superficies: 0 sin estado, 32 con banco, 14 deuda
      declarada (690 lineas de script sin ejercitar), 14 sin rojo declarado, 9 uses: a
      actions del marco, 43 uses: a actions ajenas`.

- [x] 2.3 Publicar la deuda donde se lea sin abrir el banco.
      **Evidencia**: cada deuda sale como `::warning file=<ruta>,line=<linea>::` en cada
      corrida del job de pruebas, con el largo derivado del YAML y el motivo (caso «la
      deuda que queda sale por ::warning::»). La página de cobertura de requirements gana
      el banco de cada compuerta que lo tenía (`openspec/cobertura-de-requirements.md`,
      filas de lint, definiciones de pipeline, censo de fuentes, cobertura y CI por
      paquete).

## Bloque 3 — La compuerta que exige las propiedades

- [x] 3.1 El censo de pasos falla solo.
      **Evidencia**: diez refutaciones sobre `censar()` con árboles de juguete
      (`cobertura-de-los-pasos.test.mjs:680-804`): paso sin estado, comentario que no
      cita, homónimo, extracción resuelta que manda, ruta que termina igual, deuda pagada,
      declaración fantasma, paso en las dos listas / sin motivo / tipo inventado,
      `continue-on-error` en el paso y en el job, tercero sin declarar y action del marco
      inexistente. Y de punta a punta, sobre el árbol: un paso nuevo con `run:` en
      `plantilla/.github/workflows/claude.yml` → **exit 1**, cae «ningun paso queda sin
      estado»; una action ajena nueva → **exit 1**, cae «todo uses: a una action ajena esta
      declarado».

- [x] 3.2 Un requirement nuevo que no está en la página se pone rojo.
      **Evidencia**: ya existía — `pruebas/docs/cobertura-de-requirements.test.mjs`, caso
      «MUERDE: promover un requirement al contrato sin agregar su fila se caza». Al archivar
      este change, la página tiene que ganar las tres filas nuevas de `calidad-codigo` (ese
      caso lo exige).

- [ ] 3.3 Estreno contra un consumidor real.
      **No hecho, con motivo**: lo único referenciado que cambia es el paso del umbral, y en
      un consumidor toma el camino inerte antes de la línea tocada (caso «umbral · INERTE:
      un repo que no distribuye el comparador no se mide», verde). Correrlo en un consumidor
      exige una rama temporal en ese repo (skill `projects-validar-consumidor`), y desde
      esta sesión está prohibido escribir en repos consumidores. Va en la pasada de
      integración, antes de la versión que lo publique.

## Bloque 4 — La propiedad de las afirmaciones

- [x] 4.1 Llevar «comando y exit code» a las plantillas de pull request.
      **Evidencia**: `.github/PULL_REQUEST_TEMPLATE.md:66-90` (sección Evidencia: forma,
      ejemplo, «Comandos y su exit code», «No medido») y `:103` (checklist);
      `plantilla/.github/PULL_REQUEST_TEMPLATE.md:25-43` y `:51`, en lenguaje para quien no
      programa (qué es un código de salida, por qué pegar la salida no demuestra nada).
      `node --test pruebas/docs/lo-que-lee-el-consumidor.test.mjs` → **exit 0**, 6/6: la
      plantilla del andamio no usa vocabulario del marco sin explicar.
      **Plantilla de informe de auditoría: no existe y no se inventó.** El único informe es
      `docs/16-auditoria-cierre-v1.md`, histórico y cerrado. Crear una plantilla para un
      artefacto escrito una vez sería adivinar su forma.

- [x] 4.2 Decidir si la propiedad admite compuerta automática.
      **Evidencia**: decidido que NO, y escrito con sus alternativas descartadas en el
      design (D5). Queda declarada como regla sin compuerta: al archivar, su fila en la
      página dice `**ninguno**` con ese motivo.

## Bloque 5 — Un paso que no puede fallar no es compuerta (`el-numero-del-censo`)

- [x] 5.1 El censo de pasos exige declarar como «sin rojo» todo paso con
      `continue-on-error` distinto de `false`, en el paso o en su job.
      **Evidencia**: `cobertura-de-los-pasos.test.mjs:458` y su caso
      «un paso que no puede fallar no se cuenta como compuerta» (verde: hoy ningún
      workflow ni action del marco usa el modificador).
- [x] 5.2 La página de cobertura no puede citar como compuerta un paso así.
      **Evidencia**: `pruebas/docs/cobertura-de-requirements.test.mjs:330`
      (`pasosCitadosQueNoPuedenFallar`, con el lector `pasosDe` del extractor), el caso de
      :510 y su refutación de :694.
- [x] 5.3 Verlo morder de punta a punta.
      **Evidencia**: agregando `continue-on-error: true` a «Definiciones de pipeline
      validas» en `marco-ci.yml` (la página lo cita como la compuerta de «Las definiciones
      de pipeline se validan como código») → los dos bancos **exit 1**, 3 de 32 casos caen:
      «ningun paso que la pagina publica como compuerta lleva continue-on-error», su MUERDE
      y «un paso que no puede fallar no se cuenta como compuerta». Restaurado.

## Bloque 6 — Verificación del lote

- [x] 6.1 Banco completo y validación estricta.
      **Evidencia**: `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test
      --test-reporter=tap | grep -E '^# (tests|pass|fail)'` → **exit 0**, `# tests 1599`,
      `# pass 1599`, `# fail 0` (antes del lote: 1520/1520; +79 casos). `npx --yes --ignore-scripts
      @fission-ai/openspec@1.9.0 validate --all --strict` → 33 passed, 0 failed.
      `node actions/guardrail-deltas/check-openspec-deltas.mjs` → exit 0 (el delta es solo
      ADDED; los tres títulos no existen en ningún spec vivo, verificado con `grep`).
- [x] 6.2 Las compuertas del marco que barren el árbol, corridas sobre este árbol.
      **Evidencia**: «Ejecutores de paquetes pinados» → **exit 1** en el primer borrador:
      el ejecutor de mentira de `validacion-estricta.test.mjs` parecía una invocación sin
      versión. Se arma el nombre por partes (:83) → **exit 0**. «El marco no se
      auto-identifica por un literal de su cuenta» → exit 0. `node
      pruebas/aserciones-con-evidencia.mjs <los 8 bancos tocados>` → exit 0, «no tapan su
      evidencia».
- [ ] 6.3 actionlint y shellcheck locales sobre `marco-ci.yml`.
      **No hecho**: no están instalados en esta máquina y el lote no agrega herramientas.
      Los corre el CI («Definiciones de pipeline validas» y su gemelo del andamio).

## Pendiente fuera de este change

- **El archive** va en la pasada final, después de la revisión adversarial. Al archivar,
  `openspec/cobertura-de-requirements.md` gana tres filas en `calidad-codigo`.
- **La entrada del CHANGELOG** está en `.porte/changelog/17-rojo-primero.md`; se funde al
  integrar.
- **La deuda que queda declarada** (14 pasos) sale por `::warning::` en cada corrida con su
  motivo. Tres de ellas las reescriben otros lotes del porte (el aviso de versión, el
  despliegue del andamio, la ventana de Terraform), y conviene escribir el banco sobre el
  paso que quede.
- **Los tres estados de ausencia, la cobertura por mitades y el alcance de cada
  compuerta** van en el lote `el-censo-no-miente`, sobre la página de cobertura.

## Fuera de alcance, escrito para que nadie lo agregue después

- Auditar retroactivamente las afirmaciones de PRs ya cerrados y del archive.
- Exigir compuerta para toda regla del marco.
- Pruebas de mutación sobre las compuertas (D1).
