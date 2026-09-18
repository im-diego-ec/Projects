---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-arranque-deja-su-friccion

Mediciones del 2026-09-18 en el worktree del carril L5 (main más los lotes 0b, 22, 23 y 25),
macOS arm64, Node 24.19.0, `gh` con sesión en una cuenta **personal**. Los dos bancos nuevos
se escribieron **antes** que su arreglo y se vieron en rojo.

## 1. Rojo primero

- [x] 1.1 Los dos bancos, sin ninguna pieza escrita:
      `node --test pruebas/init/registro-de-friccion.test.mjs pruebas/docs/comandos-compartidos.test.mjs`
      → `# tests 2 # pass 0 # fail 2`, los dos por `ERR_MODULE_NOT_FOUND`
      (`herramientas/registro-de-friccion.mjs` y `herramientas/comandos-compartidos.mjs`).
- [x] 1.2 El rojo que importa, con los dos módulos escritos y **sin** cablearlos: el caso
      «LA CONDICION DE TERMINO» → `salio 0 y NO dejo registro-de-friccion.md en el proyecto`;
      «ni el registro ni el archivo del medio…» → `plantilla/.gitignore no ignora
      registro-de-friccion.md`; y los tres casos del par real en rojo («EL PAR REAL», «MUERDE»
      y «la guia ya no afirma…»), porque ni `docs/12` ni la skill tenían la marca y `docs/12`
      todavía nombraba a `projects-archive-change`.

## 2. El registro de fricción (la herramienta)

- [x] 2.1 `herramientas/registro-de-friccion.mjs`: seis clases cerradas (`CLASES`, :60),
      `apartamiento` que rechaza clase desconocida y punto vacío (:71), `crearRegistro` (:81),
      `CLASE_DE_AVISO`/`claseDeAviso` (:105, :111), `vigilarAvisos` (:126), `cuerpo` con el
      vacío explícito y los repetidos contados (:183), `redactar` (:278), `repoDelRemoto`
      (:305), `comandoDelIssue` (:315), `escribirRegistro` (:321), el archivo intermedio
      (`escribirPendiente` :337, `leerPendiente` :342, `consumirPendiente` :356) y
      `ofrecerElIssue` (:399).
      **Evidencia**: los casos unitarios de `pruebas/init/registro-de-friccion.test.mjs`
      (clases, apartamiento, vacío, no-éxito-limpio, repetidos, consola vigilada, clase de un
      aviso, redacción, remoto, los cinco de envío y el archivo intermedio) en verde.
- [x] 2.2 Envío al marco con confirmación: sin terminal no hay llamadas a `gh`; Enter no es
      sí; con `si` → `gh issue create --repo <remoto> --title … --body-file <ruta>` y sin
      `--label`; `gh` ausente, sin sesión o con error → `::warning::` con el comando.
      **Evidencia**: `pruebas/init/registro-de-friccion.test.mjs:227`, `:237`, `:246`, `:261`,
      `:276` y `:285` en verde.

## 3. La condición de término (el cableado)

- [x] 3.1 `herramientas/projects-init.mjs`: `main` (:3674) carga el módulo con `import()`,
      abre el registro y vigila la consola hasta el `finally`; la corrida real vive en
      `correrLaHerramienta` (:3693). Fases en cada sección (`friccion.enFase`, :3734, :4051,
      :4260, :4285, :4292, :4460, :4570). `dejarElRegistroDeFriccion` (:4801) se llama en
      :4616, **antes** del bloque de `LISTO` (:4634). `versionDelMarco` (:697) sale de
      `encabezadoDeBitacora` para que la bitácora y el registro digan lo mismo.
      **Evidencia**: «LA CONDICION DE TERMINO…» (`:377`) en verde: sale 0, deja
      `registro-de-friccion.md` en el destino, la línea con la ruta va antes de `LISTO`, trae
      el apartamiento de `--sin-arranque` y el del asistente, consume el archivo intermedio y
      no contiene `people-agenda`, `Ejemplo-Org`, el destino, su carpeta ni el directorio
      personal.
- [x] 3.2 El asistente (`herramientas/projects-asistente.mjs`): `tropiezos` (:807) con los
      rechazos de opción (:920), de respuesta vacía (:942), de forma (:963) y las vueltas atrás
      (`ORDEN`, :975), sin lo escrito; `preguntadas` en el resultado (:1004); `reparto()`
      (:1015) calculado con `derivar()`. En `projects-init`, los tropiezos se anotan (:3869) y
      el archivo intermedio se escribe (:3952).
      **Evidencia**: `pruebas/init/registro-de-friccion.test.mjs:299` (los rechazos y la vuelta
      atrás, sin el correo ni la palabra escrita), `:321` (el reparto cubre todo lo requerido) y
      `:335` (el archivo intermedio) en verde.
- [x] 3.3 Una corrida que falla no deja registro ni consume lo del asistente; copiada sola,
      la herramienta avisa. **Evidencia**: `:415` y `:425` en verde.
- [x] 3.4 `plantilla/.gitignore:115-116` y `.gitignore:66`. **Evidencia**: `:452` en verde.
- [x] 3.5 `haySesion` exportada (`herramientas/projects-repositorio.mjs:157`), para que el
      envío use la misma regla de sesión que la creación del repositorio.

## 4. Los mutantes (cada uno aplicado sobre el árbol y revertido)

- [x] 4.1 La llamada a `dejarElRegistroDeFriccion` anulada → `# pass 20 # fail 2`
      («LA CONDICION DE TERMINO» con `salio 0 y NO dejo registro-de-friccion.md`, y «copiada
      SOLA»).
- [x] 4.2 La consola sin vigilar → primero `# fail 1`: **el caso de punta a punta seguía
      verde**, porque buscaba `--sin-arranque` y esa bandera aparece también en la línea
      «Banderas». Se endureció para exigir el apartamiento (`PASO_NO_APLICA` con su punto y lo
      que pasó) → `# fail 2`.
- [x] 4.3 `redactar` que no tapa nada → `# fail 2`.
- [x] 4.4 El caso vacío sin su encabezado → `# fail 1`.
- [x] 4.5 Restaurado → `# tests 22 # pass 22 # fail 0`.

## 5. Lo que el registro encontró en su primera corrida

- [x] 5.1 Corrida real de los dos procesos del lanzador —el asistente bajo una terminal
      simulada (`script -q /dev/null node herramientas/projects-init.mjs --asistente
      --solo-valores valores.json`, con un correo en `ORG`, una palabra en `forma` y `atras`)
      y después `--valores valores.json --destino proyecto --sin-arranque --sin-herramientas`
      sin terminal—: `rc=0`, el registro con **6** apartamientos (2 `PREGUNTA`, 1 `ORDEN`,
      1 `VALOR_INFERIDO`, 1 `SIN_COMPROBAR`, 1 `PASO_NO_APLICA`), el archivo intermedio
      consumido, y `grep -c` de la cuenta, el proyecto y la carpeta sobre el registro → `0`.
      Dos de esos apartamientos son **defectos de la herramienta que nadie había visto**:
      (a) la protección de `main` sale «NO se pudo medir (sin-repo: Not Found)» porque la sonda
      corre antes de que el repositorio exista en GitHub, y en el camino del doble clic el
      repositorio se crea **después**: todo doble clic la reporta sin medir; (b) para una cuenta
      que no existe, el aviso del tipo de cuenta dice «hace falta `gh` con la sesión abierta»
      con la sesión abierta. Quedan en la tarea 7.2.

## 6. Los comandos compartidos

- [x] 6.1 `herramientas/comandos-compartidos.mjs`: `MARCA` (:44), `PARES` (:49),
      `bloquesMarcados` con el fin de línea como única excepción (:60), `compararComandos`
      (:100), `veredicto` con el arreglo escrito (:116); sin argumentos compara todos los pares.
- [x] 6.2 El par real marcado: `docs/12-upgrade-openspec.md:69` y
      `.claude/skills/projects-adoptar/SKILL.md:252`; `docs/12` deja de afirmar que
      `projects-archive-change` usa el comando.
      **Evidencia**: `node herramientas/comandos-compartidos.mjs` → `comandos comparados … 1`,
      `rc=0`; `pruebas/docs/comandos-compartidos.test.mjs` → 10/10 en verde, con «MUERDE sobre
      el par real» (un byte cambiado en una copia de la guía sale 1 y nombra el id y la skill).

## 7. Documentación y verificación

- [x] 7.1 `docs/plantillas/registro-de-friccion.md` («Lo que ya no se llena a mano», con la
      tabla de las seis clases), `docs/05-arrancar-tecnico.md` («Cómo evoluciona este
      documento»), `docs/04-arrancar-acompanado.md` (al lado de la bitácora) y la fila del
      índice en `docs/README.md`. **Evidencia**: `node --test pruebas/docs/*.test.mjs` →
      `# tests 194 # pass 194 # fail 0`.
- [ ] 7.2 Los dos defectos de la tarea 5.1 —(a) medir la protección después de crear el
      repositorio en el camino del doble clic, y (b) distinguir «la cuenta no existe» de «no hay
      sesión» en el aviso del tipo de cuenta—. **No se hacen en este change**: son cambios de
      comportamiento de otras piezas de `projects-init` y cada uno pide su propio rojo. Quedan
      como hallazgos para un change siguiente.
- [ ] 7.3 Correrlo en Windows. El banco nuevo está en `pruebas/init/`, que el CI corre en
      `windows-latest`; en esta sesión solo se corrió en macOS.
- [ ] 7.4 Revisión adversarial con lentes independientes y fila de
      `openspec/cobertura-de-requirements.md`: en la pasada de archive.
- [x] 7.5 Verificación final: `find actions pruebas -name '*.test.mjs' -print0 | xargs -0
      node --test` → `# tests 1606 # pass 1606 # fail 0`;
      `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict` →
      `Totals: 37 passed, 0 failed (37 items)`. Los títulos de los dos requirements ADDED se
      buscaron a mano en `openspec/specs/` y en los demás changes: no existen.
- [x] 7.6 Un cambio que la suite completa cazó y que el banco nuevo no: el import estático
      del módulo rompía los 10 casos de `pruebas/init/projects-init.test.mjs` que copian la
      herramienta sola a un clon parcial (`ERR_MODULE_NOT_FOUND` antes de la primera línea).
      Arreglado con `import()` y aviso (D7 del design), y fijado con el caso «copiada SOLA».
