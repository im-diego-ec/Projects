---
artefacto: tasks
dri: Builder 1
aprueba: PO  # el change toca `gobierno-contribucion`
estado: en-ejecucion
---

# Tasks — el-arranque-no-supone-el-shell-ni-la-cuenta

Mediciones del 2026-09-18 en el worktree del carril (main + lotes 0b, 22 y 23), macOS arm64,
Node 24.19.0, git 2.54.0, gh autenticado en una cuenta **personal**, actionlint 1.7.12 y
shellcheck 0.11.0 de Homebrew en el `PATH`. Cada banco nuevo se escribió **antes** que su
arreglo y se vio en rojo.

## 1. Rojo primero

- [x] 1.1 Los cinco bancos nuevos corridos contra el árbol sin arreglo:
      `node --test` sobre `pruebas/init/valores-con-bom.test.mjs`,
      `pruebas/init/equipos-del-po.test.mjs`, `pruebas/herramientas/actionlint-local.test.mjs`,
      `pruebas/andamio/comandos-del-andamio-en-cualquier-shell.test.mjs` y
      `pruebas/docs/grep-y-tildes.test.mjs` → `# tests 8 # pass 1 # fail 7`. Los tres primeros
      por import (`does not provide an export named 'leerValores'` / `'clasificarEquiposDelPO'`,
      `Cannot find module .../actionlint-local.mjs`); el del andamio con
      `esperaba UN comando de verificacion ...; hay 0`, `la tabla de diferidas no tiene la
      columna «Condición que la reactiva»` y `sigue pidiendo copiar un <id> a mano`; el de docs
      con `docs/11 no tiene la regla del cero falso`. El único verde fue la medición de
      `LC_ALL=C`, que no depende del arreglo.
- [x] 1.2 El rojo de la herramienta de punta a punta, antes de tocarla: el `--ejemplo` en tres
      codificaciones con `--vista-previa` → pelado `rc=0`; con BOM UTF-8 `rc=1`
      (`::error::no pude leer ...: Unexpected token '﻿', "﻿{`); UTF-16 LE `rc=1`.
- [x] 1.3 El rojo del hook, con la herramienta ya escrita y el hook viejo: un `actionlint`
      falso que sale 0 en el `PATH` y la herramienta pineada diciendo «hallazgos» →
      `pre-push: OK`, `0 !== 1` (el hook confiaba en el binario del `PATH`).

## 2. El archivo de valores con BOM

- [x] 2.1 `leerValores` en `herramientas/projects-init.mjs:1554`, usado en `:3767`
      (respuestas), `:3777` (compatibilidad) y `:3992` (valores).
      **Evidencia**: `pruebas/init/valores-con-bom.test.mjs` → `# pass 7 # fail 0`.
- [x] 2.2 Doble rojo del banco (mutantes aplicados y revertidos): sin tolerancia →
      `# pass 2 # fail 5`; con la BOM UTF-8 decodificada en vez de sacada →
      `not ok 2`, `not ok 6`, `not ok 7` (`# fail 3`).
- [x] 2.3 El comando que la guía ahora recomienda, sobre un archivo con BOM:
      `node herramientas/projects-init.mjs --valores <con-bom>.json --destino . --vista-previa`
      → `rc=0`, `ESTO ES LO QUE VA A PASAR. Todavía no pasó nada.`, `git status` sin cambios.

## 3. El PO contra los equipos de la organización

- [x] 3.1 `EQUIPOS_CON_PROBLEMA`, `clasificarEquiposDelPO`, `clasificarSondaDeEquipo`,
      `correrGhEquipo`, `comprobarEquiposDelPO` y `lineasDeEquiposDelPO` en
      `herramientas/projects-init.mjs:3227-3426`; llamada en `main()` en `:4220`, después de la
      sonda de protección, solo aviso.
- [x] 3.2 La forma real de la respuesta, medida contra la API:
      `gh api orgs/<org-inexistente>/teams/po/members --paginate --jq '.[].login'` →
      stdout `{"message":"Not Found",...,"status":"404"}`, stderr `gh: Not Found (HTTP 404)`,
      rc 1; `gh api users/im-diego-ec --jq .type` → `User` (la cuenta del marco no tiene
      equipos).
- [x] 3.3 `projects-doctor --valores <archivo>`: `revisarEquipos` en
      `herramientas/projects-doctor.mjs:273`, `main(argv)` en `:293`.
      **Evidencia**: `pruebas/init/equipos-del-po.test.mjs` → `# pass 14 # fail 0`
      (clasificación, sonda, inyección que no llega a `gh`, cuenta personal sin consultas,
      mensajes con el arreglo y el comando, y el doctor con BOM y con archivo roto).
- [x] 3.4 La auditoría de `execFileSync`: residuo `orgs/${org}/teams/${equipo}/members`
      declarado con su motivo, y el lector de vectores arreglado para saltar literales
      (`pruebas/init/projects-init.test.mjs:1191`); antes cortaba en el `]` de `".[].login"`
      y reportaba `\`orgs/...\`".[`. **Evidencia**: `pruebas/init/projects-init.test.mjs` →
      `# pass 90 # fail 0`.
- [x] 3.5 De punta a punta: `projects init --sin-herramientas --sin-arranque` con el ejemplo
      (organización) → `rc=0` y
      `::warning::PO DE CODEOWNERS: no se pudo comprobar (sin-equipo: GitHub contesto 404)...`
      con el comando `gh api orgs/una-org/teams/po/members --jq '.[].login'`.
- [ ] 3.6 Verlo contra una organización real con equipos. **Motivo**: la cuenta del marco es
      personal (medido: `User`) y esta sesión no tiene una organización; los cuatro estados
      medidos están cubiertos con un `gh` simulado que devuelve la forma real (3.2).

## 4. actionlint local

- [x] 4.1 `herramientas/actionlint-local.mjs`: versión leída del input (`:79`), shellcheck
      explícito o apagado explícito (`:158`), veredicto con tres códigos (`:188`), techo de
      180 s (`:72`) y de 60 s por descarga (`:213`).
      **Evidencia**: `pruebas/herramientas/actionlint-local.test.mjs` → `# pass 15 # fail 0`.
- [x] 4.2 Medido de verdad: sobre el repo del marco → `definiciones de pipeline validas
      (actionlint 1.7.12 —el pin del CI— con shellcheck)`, rc 0 (1,6 s con la descarga y el
      checksum); sobre un workflow con `run: echo '$HOME no se expande'` → SC2016, rc 1; con
      un `PATH` sin shellcheck → `::warning::SIN SHELLCHECK...` y «NO es el veredicto del
      CI», rc 0; sin red (proxy inexistente, cache borrada) →
      `::error::no pude preparar actionlint: fetch failed`, rc 2.
- [x] 4.3 El motivo, medido con el actionlint de Homebrew sobre el mismo workflow: con
      shellcheck → SC2016; `-shellcheck=` → rc 0 sin salida; `PATH=/usr/bin:/bin` → rc 0 sin
      salida.
- [x] 4.4 `herramientas/hooks/pre-push:45-69` usa la herramienta: 1 bloquea, cualquier otro
      no-cero avisa y deja empujar. `sh -n` y `shellcheck` sobre el hook → sin hallazgos.
- [x] 4.5 El `::error::` del paso de actionlint en `.github/workflows/marco-ci.yml:1287`
      nombra la herramienta. `actionlint .github/workflows/marco-ci.yml` → rc 0. El banco lee
      la línea del mensaje y no cita el paso por su nombre: citarlo lo habría dado por
      cubierto en `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs` sin ejercitarlo (la
      primera versión lo hizo y ese banco lo cazó: `la deuda declarada esta al dia` en rojo).
- [x] 4.6 `gh api repos/koalaman/shellcheck/releases/tags/v0.11.0 --jq '.assets[].name'` →
      13 assets, ninguno de checksums: el motivo de no bajarlo.
- [ ] 4.7 Bajar shellcheck con su suma pinada. **Motivo**: sería una dependencia nueva del
      marco sin checksum publicado por su release; AGENTS.md la pone en «pregunta primero» y
      este lote no tiene OK humano. Mientras tanto, sin shellcheck el comando lo dice.
- [ ] 4.8 Ver la guarda de Windows en una máquina Windows. **Motivo**: no hay Windows en esta
      sesión ni en el banco de `pruebas/herramientas/` (corre en ubuntu); la decisión está
      cubierta por `argumentosDeShellcheck` con `plataforma: "win32"`.

## 5. El andamio

- [x] 5.1 `plantilla/AGENTS.md:59-72`: `git grep --untracked -nE "\{\{[A-Z0-9_]+\}\}"` con el
      porqué de cada parte. **Evidencia**: el banco corre el comando leído del documento en
      un repo de juguete y lo encuentra en un archivo sin commit, ignora `node_modules` y
      `${{ github.sha }}`. Mutante con la forma de Rigel (`git grep -nE`, sin `--untracked`) →
      `no encontro el marcador sin commitear (salio 1)`.
- [x] 5.2 `plantilla/.github/proteccion-main.md:31-56`: columna «Condición que la reactiva»,
      la aprobación requerida marcada como primera, el comando de la condición y la nota del
      gate. `:97-113`: el id encadenado por nombre y la nota de shell POSIX.
      **Evidencia**: el banco corre el bloque de contraste con un `gh` falso y ve
      `rulesets/4242` en el segundo y el tercer comando.
- [x] 5.3 Formato: `prettier@3.9.6 --check` sobre los dos archivos del andamio y sobre los
      mismos después de `projects init` en un destino → `All matched files use Prettier code
      style!`.
- [x] 5.4 Lectura: `pruebas/docs/lo-que-lee-el-consumidor.test.mjs` verde (la página no usa
      términos del glosario sin explicar), y `pruebas/init/proteccion.test.mjs` verde (las
      anclas que reemplaza `projects init` siguen ahí).
- [ ] 5.5 La «fecha límite» de cada diferida que también exige el requirement «Branch
      protection documentada como paso manual». **Motivo**: no es ítem de este lote y el
      andamio no puede saber la fecha; el recuadro que la pediría lo reemplaza `projects
      init`. Queda para el lote que porte `dueno-del-contrato-documento`.

## 6. Documentación

- [x] 6.1 `docs/05-arrancar-tecnico.md`: la fase 1 deja de describir otra organización
      (`:340-381`: por tipo de cuenta, lista logins, remite a `projects init` y a
      `projects-doctor --valores`, `gh project list --owner <org>`); la postura de 5.1
      (`:73-83`), el párrafo del gemelo de `--ejemplo` (`:416-423`) y la fila de la tabla de
      fallos (`:930`) dicen lo que ahora hace la herramienta. Inventario de bloques sin
      cambios: `grep -c '^```powershell'` → 8, `grep -c '^```bash'` → 25.
- [x] 6.2 `docs/11-reglas-no-escritas.md`: regla 11 (`:499`), fila 24 del backlog (`:572`) y
      el comando de actionlint local en la regla 7 (`:365`).
- [x] 6.3 **Evidencia**: `node --test pruebas/docs/*.test.mjs` → `# tests 184 # pass 184`.
- [ ] 6.4 Los otros residuos del fork en `docs/05-arrancar-tecnico.md`: comandos contra la
      API de organizaciones sobre la cuenta del marco (fase 0:
      `gh api orgs/im-diego-ec/dependabot/...`, `.../installations`, `.../issue-types`; fase 6:
      `orgs/im-diego-ec/teams/po/repos/...`). **Motivo**: fuera del ítem del lote
      (`:340-363`). Medido: `gh api orgs/im-diego-ec/issue-types` y `.../installations` →
      `{"message":"Not Found",...,"status":"404"}`, rc 1, porque la cuenta es personal.
      Reportado como pendiente.

## 7. Cierre

- [x] 7.1 Suite completa:
      `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test` →
      `# tests 1574 # pass 1574 # fail 0`.
- [x] 7.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict` →
      `Totals: 36 passed, 0 failed`.
- [x] 7.3 Los cinco títulos ADDED no existen en ningún spec vivo ni en otro change
      (`grep -F -f` de los títulos sobre todos los `spec.md` fuera del change → sin
      coincidencias). No hay MODIFIED, REMOVED ni RENAMED.
- [x] 7.4 Fragmento del CHANGELOG en
      `.porte/changelog/25-el-arranque-no-supone-el-shell-ni-la-cuenta.md` (el porte no edita
      `CHANGELOG.md`).
- [ ] 7.5 Revisión adversarial con lentes independientes y aprobación del PO (el change toca
      `gobierno-contribucion`). **Motivo**: van en la pasada final del porte, como en los lotes
      anteriores del carril.
- [ ] 7.6 Las filas de los cinco requirements ADDED en `openspec/cobertura-de-requirements.md`.
      **Motivo**: van con el archive, y ese archivo lo toca en paralelo el lote 18.

## 8. Revisión adversarial del carril: lo que cazó y cómo se cerró

- [x] 8.1 La caché de actionlint no se volvía a verificar (FO-S7/H1, RV-H2): vivía en
      `os.tmpdir()` —en Linux, `/tmp`, compartido— y un acierto era `existsSync`, así que
      cualquier archivo en `<tmp>/projects-actionlint-<versión>/actionlint` se ejecutaba y
      la salida decía «definiciones de pipeline validas (actionlint 1.7.12 —el pin del CI—
      con shellcheck)». Contradecía el requirement («verificando la integridad del binario
      contra el release del que se baja»). **Rojo medido** antes del arreglo: con
      `TMPDIR=$T` y un binario plantado que imprime «BINARIO PLANTADO SIN VERIFICAR», la
      herramienta lo corrió → `BINARIO PLANTADO SIN VERIFICAR: -color -shellcheck=/opt/homebrew/bin/shellcheck`
      y `definiciones de pipeline validas ...`, rc 0. **Arreglo** en
      `herramientas/actionlint-local.mjs`: caché del usuario (`baseDeCache`: `~/Library/Caches`,
      `$XDG_CACHE_HOME` o `~/.cache`, `%LOCALAPPDATA%`), directorio y padre de quien corre
      la herramienta y sin escritura para otros (`desconfianza`; si no, no se usa y lo
      dice), y el sha256 del binario recién extraído de un tarball verificado guardado en
      `actionlint.sha256` y comparado en cada acierto (`binarioEnCache`); si falta o no
      coincide, la caché se descarta y se baja y verifica de nuevo. **Evidencia**:
      `pruebas/herramientas/actionlint-local.test.mjs` → `# pass 20 # fail 0` (cinco casos
      nuevos con un release de juguete, tar real y descarga inyectada: la segunda corrida
      no baja; un binario sin sha o con otro sha se reemplaza; un asset con otro sha es
      rojo, no deja caché y `main` sale 2; una caché escribible por otros o de otro uid no
      se usa). Cada mutación deja el banco en `# fail 1`: la comparación del sha anulada
      (`if (false)`), el acierto por `existsSync`, el acierto sin re-hashear, sin mirar
      dueño ni permisos y la caché de vuelta en `os.tmpdir()`. De punta a punta: el binario
      plantado en la caché nueva se descartó, se bajó el real (`bajando actionlint 1.7.12`) y
      sobre este repo → `definiciones de pipeline validas`, rc 0; la segunda corrida, sin
      bajar.
- [x] 8.2 `TIPO_CUENTA` no se validaba (FO-S13/H3): con «organización» con tilde —como lo
      escribe la propia herramienta en su prosa— o ausente, `projects-doctor --valores`
      decía «la cuenta es personal ... no hay equipos que comprobar» y salía 0 sin llamar a
      `gh`, y `projects init` armaba una organización con el CODEOWNERS de una cuenta
      personal. **Arreglo**: `problemasDeEleccion` (`herramientas/projects-init.mjs`) valida
      `TIPO_CUENTA` contra `TIPOS_DE_CUENTA` como ya hacía con `forma` y `plataforma`
      (ausente sigue valiendo `usuario`; mal escrito es error con la sugerencia); el doctor
      aplica la misma regla antes de comprobar y, en el caso `no-aplica`, dice lo que leyó
      («TIPO_CUENTA no está en el archivo, y ausente vale «usuario»» o «TIPO_CUENTA dice
      «usuario»») y que no se le preguntó a GitHub. **Evidencia**, rojo primero: los tres
      casos nuevos (`pruebas/init/formas.test.mjs` y dos en
      `pruebas/init/equipos-del-po.test.mjs`) → `# fail 3` antes del arreglo; después,
      `# pass 26` y `# pass 16`. Por CLI: `--valores` con `"organización"` →
      `::error::el archivo de valores tiene 1 problema(s). No se escribio nada` con
      `¿Quisiste decir "organizacion"?`; el doctor sobre el mismo archivo → código 1 y cero
      llamadas a `gh`.

