---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-doble-clic-deja-un-repo

## 1. El rojo, antes del arreglo

- [x] 1.1 Medir el defecto sobre el árbol sin tocar. **Evidencia** (2026-09-17, desde
      el worktree, con `valores.json` de `--ejemplo`):
      ```
      $ node herramientas/projects-init.mjs --sin-herramientas --sin-arranque \
          --valores $S/valores.json --destino $S/people-agenda
      exit=0
      $ ls -a $S/people-agenda | grep -c '^\.git$'
      0
      $ grep -n "PUSH DIRECTO" salida.txt
      15:  EL ORDEN IMPORTA. Lo medido: el bootstrap va a main por PUSH DIRECTO y la
      ```
      Destino sin `.git` y la salida afirmando un envío directo.
- [x] 1.2 El banco nuevo escrito **antes** del arreglo, y rojo.
      **Evidencia**: `node --test pruebas/init/el-doble-clic-deja-un-repo.test.mjs` antes de
      crear el módulo → `ℹ fail 1` (el módulo no existe), y
      `node herramientas/projects-init.mjs … --repositorio` →
      `::error::argumento desconocido: --repositorio`.
- [x] 1.3 El caso rojo queda **en el banco**, permanente:
      `pruebas/init/el-doble-clic-deja-un-repo.test.mjs:194` («MUERDE: la invocacion
      de antes (sin --repositorio) deja una carpeta sin .git, y este banco lo ve»).

## 2. El módulo del repositorio

- [x] 2.1 `herramientas/projects-repositorio.mjs` (nuevo): `git init` + rama `main`
      por `symbolic-ref` (`:217`), aunque `init.defaultBranch` diga otra.
      **Evidencia**: `…deja-un-repo.test.mjs:209` exige `main` con un gitconfig que
      pide `otra-rama`.
- [x] 2.2 Primer guardado solo con identidad **configurada** y proyecto en verde;
      guardado con `-c user.useConfigOnly=true` (`:264`). **Evidencia**: `:327`
      (sin identidad no hay guardado) y `:423` (sin arranque no hay guardado). Medido
      que git inventa identidad: con `GIT_CONFIG_GLOBAL` vacío, `git commit` salió 0
      y `git var GIT_COMMITTER_IDENT` devolvió `Diego <diego@MacBook-Pro-de-Diego.local>`.
- [x] 2.3 Remoto solo con `gh` + sesión + nombre libre + «si» escrito (`:338`); la
      visibilidad de `.projects-respuestas.json` o preguntada. **Evidencia**: `:235`
      (camino feliz, `origin` y `main` publicado en un desnudo), `:265` (`--private`),
      `:277` (pregunta la visibilidad), `:292` (Enter/«no»/«tal vez» no crean nada),
      `:351` (sin gh), `:366` (sin sesión), `:380` (sin terminal), `:393` (nombre
      tomado, `:304`).
- [x] 2.4 Publicado se comprueba en el disco (`origin` + `refs/remotes/origin/main`
      igual a `HEAD`, `:113`), no por el código de salida de gh (`:356`).
      **Evidencia**: `:407` («MUERDE: un gh que sale 0 sin crear nada NO se da por
      subido»).
- [x] 2.5 Una historia ajena no se toca. **Evidencia**: `:441`.
- [x] 2.6 Sin shell en ningún sistema. **Evidencia**: `:581` audita el módulo (solo
      `shell: false`, sin `exec`/`execSync`/`spawn`/`spawnSync`).

## 3. La herramienta y los lanzadores

- [x] 3.1 `projects-init.mjs`: `--repositorio` y `--sin-remoto` en `BANDERAS`
      (`:358-359`), en el parser (`:3098-3104`) y en `--help`. **Evidencia**:
      `pruebas/init/quisiste-decir.test.mjs` (una sola lista) en verde.
- [x] 3.2 `projects-init.mjs`: el paso del repositorio después del arranque, con el
      motivo cuando no hay primer guardado (`:4075-4086`), y la pregunta por la
      terminal que trata el fin de la entrada como un no (`:3219`).
      **Evidencia**: `…deja-un-repo.test.mjs:209` y `:224` por la CLI.
- [x] 3.3 La lista final sale de medir: `lineasDelPrimerEnvio` (`projects-repositorio.mjs:379`),
      usada en `projects-init.mjs:4101`. **Evidencia**: `…deja-un-repo.test.mjs:515`
      (cuatro estados, incluido el checkout con el andamio sin guardar) y `:194`
      (la CLI sin la bandera dice «NO es un repositorio git»).
- [x] 3.4 La vista previa no promete «no se toca GitHub» con `--repositorio`
      (`projects-init.mjs:571-593`). **Evidencia**: `…deja-un-repo.test.mjs:603` y
      `pruebas/init/vista-previa.test.mjs` en verde.
- [x] 3.5 `arrancar.sh:43-52` y `arrancar.cmd:26-33`: `MODO_REPO` por defecto
      `--repositorio`, `--sin-remoto` aceptado, cualquier otra opción rechazada antes
      de preguntar; Paso 2 lo pasa (`arrancar.sh:142`, `arrancar.cmd:126`).
      **Evidencia**: `…deja-un-repo.test.mjs:567`; bash 3.2 de macOS medido con y sin
      argumentos (`M=a`, `M=b`, `no --otra` con exit 2); `bash -n` y `/bin/bash -n`
      en verde.

## 4. docs/04 en dos caminos

- [x] 4.1 Sección nueva «Dos caminos desde acá» (`docs/04-arrancar-acompanado.md:327`)
      con lo que hace la ventana, la pregunta y la línea de éxito citadas tal cual.
- [x] 4.2 Paso 2 «a mano» (`:385`): dice que el doble clic lo saltea; sin el `cd ..`
      inexistente; sin el «no crea repositorios» incondicional; nombra
      `/Projects-main` (el nombre de la carpeta del ZIP).
- [x] 4.3 Pasos 3 y 5 avisan que el doble clic ya los hizo (`:446`, `:623`); «Si te
      equivocaste» avisa que no se borre lo ya publicado (`:605`); el envío del Paso 9
      en tres casos (`:915`, `:929`).
- [x] 4.4 **Evidencia**: `…deja-un-repo.test.mjs:613` y `:619`; los bancos del carril
      sin jerga, de las cuatro promesas por paso y de enlaces en verde.

## 5. Verificación

- [x] 5.1 Mutaciones, una por guarda, cada una rompe exactamente su caso:
      ```
      lanzador sin "$MODO_REPO"            -> not ok 21 (lanzadores piden el repositorio)
      control de identidad apagado         -> not ok 9  (sin identidad NO se guarda)
      verificacion en disco apagada        -> not ok 14 (gh que sale 0 no se da por subido)
      Enter tomado como si                 -> not ok 7  (Enter o no: nada en GitHub)
      "subido" por refs y no por la corrida-> not ok 18 (la lista dice lo que se MIDIO)
      ```
- [x] 5.2 Banco completo: `find actions pruebas -name '*.test.mjs' -print0 | xargs -0
      node --test --test-reporter=tap` → `# tests 1476`, `# pass 1476`, `# fail 0`.
- [x] 5.3 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 33 passed, 0 failed (33 items)`. Títulos de los cuatro ADDED
      verificados a mano: ninguno existe en `openspec/specs/` ni en otro change.

## 6. Lo que no se pudo hacer acá

- [ ] 6.1 Correr `arrancar.cmd` en Windows con una persona contestando hasta el
      Paso 2. **Motivo**: la sesión corre en macOS. El banco de lanzadores lo ejecuta
      en `windows-latest` con la entrada cerrada, lo que cubre el bloque nuevo de
      opciones (antes del Paso 0) pero no el Paso 2. La lógica que ese paso invoca
      corre en Windows en este banco, con el `gh` inyectado.
- [ ] 6.2 El caso del `gh` falso **en el PATH** en Windows
      (`…deja-un-repo.test.mjs:463`, se saltea declarado con «APAGADO A PROPOSITO»). **Motivo**: en Windows gh es
      `gh.exe` y se lanza sin shell; un `gh.cmd` falso exigiría `shell: true`, que
      empeora la invocación real (DEP0190).
- [ ] 6.3 Validar contra un repo consumidor real antes de publicar (regla de
      `AGENTS.md`). **Motivo**: nada de esto viaja al pipeline de un consumidor; lo
      que corresponde es un arranque de punta a punta con doble clic en una máquina
      con `gh` real, que crea un repositorio de verdad y queda para la pasada de
      release, con OK humano.
- [ ] 6.4 Revisión adversarial registrada en este change. **Motivo**: va en la
      pasada final del porte, después de integrar los carriles.
