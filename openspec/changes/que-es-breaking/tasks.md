---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — que-es-breaking

Lote 10 del porte de Rigel. Mediciones del 2026-09-17 sobre la rama
`porte/w1-L4-aviso` (base `66b6f5a`, con los lotes 8 y 36 ya commiteados), con Node
24.19.0. Los scripts de medición son descartables y viven fuera del repo; lo que mide
cada uno está escrito en la evidencia.

## 0. Medir antes de tocar

- [x] 0.1 Las líneas que citaba el plan, contra el árbol. `AGENTS.md:142-143` (MINOR) y
      `:163-165` (el caso del endurecimiento) coincidían; `.github/PULL_REQUEST_TEMPLATE.md:50`
      y `:64` coincidían; `docs/02-glosario.md:51` coincidía. `.claude/skills/projects-release/SKILL.md:101-111`
      estaba corrido: con el lote 8 encima, la sección «Elegir el numero» era `:103-117`.
      `CHANGELOG.md:74` coincidía (viñeta de `:74-77`). Manda el árbol.
- [x] 0.2 El ejemplo del plan para «controles que viven en aviso para siempre» era
      `.github/workflows/ci.yml:596` (pines de terceros). Medido: ese aviso vive en el CI
      propio del marco y su motivo es otro (`:609`: «los SHA se resuelven con red»); no
      depende de esta regla. El ejemplo que sí depende es el desvío incompleto:
      `.github/workflows/marco-ci.yml:3494-3498` y `CHANGELOG.md:443` («Se estrena
      avisando y no en rojo por la regla de `AGENTS.md`»). Queda así en el proposal.
- [x] 0.3 La regla vieja, dónde vivía. `git grep` de sus frases fuera de `openspec/changes/`
      y del archive: `AGENTS.md:143,163-165`, `.github/PULL_REQUEST_TEMPLATE.md:50,64`,
      `.claude/skills/projects-release/SKILL.md:107,116`, `docs/02-glosario.md:51`,
      preámbulo de `CHANGELOG.md:22`. Cinco superficies. El resto de las apariciones son
      historia (entradas del CHANGELOG, changes abiertos que razonan con la regla de su
      día, `docs/16-auditoria-cierre-v1.md`, que el índice declara «Histórico») o
      comentarios de código que explican un aviso vigente (ver 5.2).
- [x] 0.4 El «hoy, nadie» de `CHANGELOG.md:74`. Falso según los hechos medidos del porte:
      `plantilla-sitio` (consumidor en `@v1.9.6`) trae `desplegar.yml`.
- [x] 0.5 Línea base de la suite: `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap | grep -E '^# (tests|pass|fail)'`
      → `# tests 1532 · # pass 1532 · # fail 0`.

## 1. Rojo primero

- [x] 1.1 `pruebas/ci-del-marco/que-es-breaking.test.mjs` (9 casos, nuevo), contra el árbol
      sin tocar: `# tests 9 · # pass 3 · # fail 6`. Los 3 verdes son los dos casos
      `MUERDE` (el parseo sobre textos sintéticos) y la comparación plantilla↔lista, que
      pasaba **vacía** porque las dos listas salían en cero; se le agregó la aserción de
      no vacío (`que-es-breaking.test.mjs`, caso «la plantilla de PR ofrece
      EXACTAMENTE…») y la guarda «la lista cerrada se lee…» ya la ponía roja. El caso de
      «ninguna superficie…» listó exactamente las cinco superficies de 0.3.
- [x] 1.2 `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs`: 9 casos nuevos al
      final, que usan solo `medir` y `main` (ya existentes) para que cada uno caiga por su
      razón. Contra la compuerta de `66b6f5a`: `# tests 35 · # pass 29 · # fail 6`. Los 3
      verdes son controles positivos (backticks exentos, jerga fuera de la sección, no
      acumular con falta de sección o texto de fábrica) y tienen que seguir verdes.

## 2. La regla

- [x] 2.1 `AGENTS.md:139-146`: MAJOR remite a la lista cerrada; MINOR admite la
      compuerta cuyo arreglo cabe en el repositorio del consumidor.
- [x] 2.2 `AGENTS.md:152-219` («Qué es BREAKING»): lista cerrada numerada de cinco casos
      (`:158-173`), el caso 5 en `:167`; las dos familias y la pregunta que decide; el
      arreglo en «Para consumidores» en el lenguaje de `docs/01-introduccion.md`; el
      andamio no es incompatible (`:192`); la nota con el incidente, la fecha, el origen
      en Rigel y por qué existe el banco (`:197`); «Ante la duda» con la pregunta
      (`:215`).
- [x] 2.3 `.github/PULL_REQUEST_TEMPLATE.md`: el comentario de cabecera deja de decir
      «cuando el tag v1 se mueva» (`:1-5`); el de impacto deja de decir `uses: ...@v1`
      (`:41-44`); `## ¿Es BREAKING?` (`:50`) con la pregunta que decide; las cinco
      casillas con la misma frase en negrita que `AGENTS.md` (`:67-71`); casilla nueva del
      checklist sobre el arreglo en «Para consumidores» (`:87`).
- [x] 2.4 `.claude/skills/projects-release/SKILL.md:103-133`: «Elegir el numero» deja de
      copiar la lista y remite a `AGENTS.md`, con la pregunta y la nota del cambio; la
      tabla de lo que cobra la compuerta del aviso suma la fila de la jerga (`:289-295`).
- [x] 2.5 `docs/02-glosario.md:51` (estreno) y `:55` (modo aviso), y
      `docs/11-reglas-no-escritas.md:44` (estado MODO AVISO): la regla nueva y la segunda
      razón para estrenar en aviso, con enlace a «Qué es BREAKING», caso 5.

## 3. La compuerta del lenguaje

- [x] 3.1 `herramientas/aviso-entra-en-el-mensaje.mjs`: importa `SIN_TRADUCCION`,
      `jergaDeOficio` y `jergaPorForma` de `pruebas/docs/lectura.mjs` (`:107`);
      `jergaEnParaConsumidores` (`:206`); el hallazgo `jerga-en-para-consumidores`
      (`:298`), excluyente con la falta de la sección y con el texto de fábrica,
      compatible con el recorte; su `::error::` con las palabras y el arreglo; la
      cabecera pasa de «TRES» a «CUATRO» cosas.
- [x] 3.2 `.github/workflows/ci.yml:1018-1027` (comentario, sin acentos), `:1040` (nombre
      del paso) y `:1110` (mensaje de `ci-ok`) nombran la cuarta causa.
      `actions/README.md` y el comentario de `actions/aviso-version/action.yml` que
      enumeran las causas, también: una enumeración que se queda atrás es el defecto que
      este lote persigue.
- [x] 3.3 Después del arreglo: `node --test pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs pruebas/ci-del-marco/placeholder-del-release.test.mjs`
      → `# tests 38 · # pass 38 · # fail 0`.
- [x] 3.4 Mutaciones del código nuevo, cada una contra el banco de la compuerta:
      sin el `push` del hallazgo → 6 rojos; lista recortada a 10 palabras → 1 rojo («la
      lista es LA…»); sin la regla de forma → 1 rojo (gerundio); midiendo el cuerpo
      entero y no la sección → 1 rojo («la jerga FUERA…»). Las cuatro, rojas.
- [x] 3.5 La compuerta muerde el texto real. Sobre el `CHANGELOG.md` de la rama con el
      parche del lote 8 **tal como estaba** y el de este lote aplicados:
      `::error file=CHANGELOG.md::la seccion [No publicado] dice su "### Para consumidores" con jerga de oficio: pipeline, merge.`
      y `exit=1`.

## 4. El CHANGELOG, que en esta rama no se edita

- [x] 4.1 `.porte/10-que-es-breaking.patch`: reescribe el preámbulo (la convención de
      secciones deja de decir «BREAKING para `@v1`», nombra la lista cerrada de
      `AGENTS.md` y «Para consumidores» para quien no es técnico) y la viñeta de
      `CHANGELOG.md:74-77` (deja de ser BREAKING: un cambio de andamio no le llega a
      ningún consumidor, y sí había uno con un sitio generado). Ninguna línea nueva
      arranca con `BREAKING`, así que el aviso deja de destacarla.
- [x] 4.2 `.porte/08-normalizar-changelog.patch` (lote 8, mismo carril): su «Para
      consumidores» decía «tu pipeline» y «en cada merge», que la compuerta de 3.1 pone
      rojo. Se reescriben esas dos frases y nada más: `diff` del parche viejo contra el
      nuevo, sin las líneas `index`, muestra solo esas dos líneas y los números de hunk
      corridos por la línea de más.
- [x] 4.3 Los dos parches aplican sobre el `CHANGELOG.md` de la rama (`1dbcac5`) en los
      dos órdenes, con el mismo resultado (`cmp` sin diferencias). Sobre ese resultado,
      `node herramientas/aviso-entra-en-el-mensaje.mjs` → `✓ … sin jerga de oficio … [No publicado] y [1.9.6]`,
      `exit=0`, `[No publicado]` armado en 1114 caracteres (1459 antes: la viñeta
      BREAKING ya no se destaca); y el preámbulo no contiene ninguna frase de
      `REGLA_VIEJA` y remite a `AGENTS.md`.
- [x] 4.4 El caso del banco que vigila el preámbulo queda `todo` mientras
      `.porte/10-que-es-breaking.patch` exista, y se vuelve exigible solo cuando `.porte/`
      desaparezca. Corrida: `⚠ el preambulo del CHANGELOG dice la misma regla # pendiente de aplicar .porte/10-que-es-breaking.patch al integrar`.
- [x] 4.5 Fragmento de CHANGELOG: `.porte/changelog/10-que-es-breaking.md` («Cambiado» y
      «Añadido», con «Para consumidores» en cada viñeta).
- [ ] 4.6 **Aplicar `.porte/10-que-es-breaking.patch` (después o antes del 08) y borrar
      `.porte/`.** Motivo: los carriles del porte no editan `CHANGELOG.md`; es de la
      pasada de integración. Hasta entonces el caso de 4.4 sigue `todo`.

## 5. Coherencia y lo que no se toca

- [x] 5.1 Mutaciones del banco de coherencia: un sexto caso solo en `AGENTS.md` → rojo
      «la plantilla de PR ofrece EXACTAMENTE…»; la plantilla sin el caso 5 → el mismo
      rojo; la frase vieja devuelta a la skill → rojo «ninguna superficie…». Las tres,
      rojas; archivos restaurados.
- [x] 5.2 No se tocan, con el motivo en el design (decisión 9):
      `marco-ci.yml:3494-3498` y `pruebas/marco-ci/permisos-compuerta.test.mjs:204-208`
      (motivo del aviso del desvío incompleto; su endurecimiento es del lote 38), los
      changes abiertos que citan la regla vieja, y `actions/constitucion/canonico/20-marco-version.md`,
      que ya es coherente con la regla nueva.
- [ ] 5.3 **Corregir el motivo escrito del aviso del desvío incompleto**
      (`marco-ci.yml:3494-3498`, `permisos-compuerta.test.mjs:204-208`,
      `CHANGELOG.md:443`), que sigue citando la regla vieja. Motivo: con la regla nueva
      su arreglo cabe en el repositorio del consumidor y podría ser rojo en un MINOR,
      pero el endurecimiento ya se anunció para la línea mayor y la D1 abre v2 una sola
      vez con todo junto: lo decide el lote 38, que es el que lo endurece.

## 6. Verificación

- [x] 6.1 `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap | grep -E '^# (tests|pass|fail|todo)'`
      → `# tests 1550 · # pass 1549 · # fail 0 · # todo 1` (el `todo` es 4.4). Salida del
      proceso: 0.
- [x] 6.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 35 passed, 0 failed (35 items)`.
- [x] 6.3 A mano: el delta es un solo `ADDED` en `pipeline-entrega`; su título no existe
      en el spec vivo ni en ningún change abierto (`grep -rn "Lo incompatible es una lista cerrada" openspec/`
      solo lo encuentra en este change). No hay `MODIFIED`, así que ningún escenario
      vigente puede perderse. `node actions/guardrail-deltas/check-openspec-deltas.mjs`
      → `✓ … ningún MODIFIED perdería escenarios`.
- [ ] 6.4 **Revisión adversarial con lentes independientes, registrada acá.** Motivo:
      el marco tiene un solo mantenedor (desvío D8); va en la pasada final del porte.
- [ ] 6.5 **Archive.** Motivo: va en la pasada final, después de 6.4.

## 7. Hallazgos de la revisión adversarial (2026-09-17)

- [x] 7.1 **FO-H3 — el `todo` que podía sobrevivir a la integración.** Rojo primero:
      `GITHUB_BASE_REF=main node --test pruebas/ci-del-marco/que-es-breaking.test.mjs`
      salía 0 con el preámbulo viejo. Ahora el caso usa `pendienteDelPorte`
      (`pruebas/ci-del-marco/carril-del-porte.mjs`) y un caso nuevo pone rojo `.porte/`
      camino a main. Con `GITHUB_BASE_REF=main`, los tres bancos del carril dan
      `ℹ fail 3` —el preámbulo, `.porte/` y la cita del desvío—; sin él, `ℹ fail 0` y
      `ℹ todo 2`. Mutación: `destinoEsMain` que nunca dice main → `ℹ fail 3`.
- [x] 7.2 **RV-L4-05 — la premisa en el spec vivo.** El recorrido suma
      `openspec/specs/*/spec.md` y `REGLA_VIEJA` suma «se consume por un tag móvil». Rojo
      primero: sin exención, `openspec/specs/calidad-codigo/spec.md: "se consume por un
      tag móvil"`. `PREMISAS_CON_DUENO` la exime mientras `la-ventana-se-cierra` esté
      activo, y otro caso exige que ese change la tenga como tarea abierta (se le agregó
      la 3.3). Mutación: el dueño apuntando a su carpeta de archive → `ℹ fail 1`.
- [x] 7.3 **RV-L4-06 — el tope entre backticks.** La compuerta importa
      `jergaEntreBackticks` y `TOPE_DE_JERGA_ENTRE_BACKTICKS`. Rojo primero: 3 casos
      nuevos rojos (la reproducción de 12 fragmentos, el borde del tope y el
      `::error::`). Mutación: tope apagado → `ℹ fail 3`. La skill, `actions/README.md` y
      el fragmento de CHANGELOG dicen el tope.
- [x] 7.4 **RV-L4-09 — la cita del desvío.** Banco
      `pruebas/ci-del-marco/aprueba-cita-lo-que-existe.test.mjs` (dos casos que muerden y
      uno sobre el árbol, `todo` en el carril) y la dependencia escrita en el proposal.
- [ ] 7.5 **Integrar después de `el-marco-declara-su-desvio-de-review` (carril L1)**, o
      junto con él. Hasta entonces el caso de 7.4 queda `todo` en el carril y es rojo en
      un PR a `main`.
