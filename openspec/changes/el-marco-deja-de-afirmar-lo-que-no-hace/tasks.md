---
artefacto: tasks
dri: Builder 1
aprueba: "revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)"
estado: en-ejecucion
---

# Tasks — el-marco-deja-de-afirmar-lo-que-no-hace

Líneas medidas sobre el árbol de este change; las de antes, contra `0c535e1`. Cada
banco se escribió y se corrió **antes** del arreglo, y el rojo quedó anotado.

## 1. El artifact de la constitución se sube de verdad

- [x] 1.1 Banco `pruebas/andamio/artefacto-de-la-constitucion.test.mjs`: toda subida
      de artifact declara `include-hidden-files` (`:69`); `constitucion-al-dia` con
      `true` y `error` (`:81`). Contra el árbol sin arreglar:
      `# tests 4 · # pass 2 · # fail 2` (los dos casos de arriba).
- [x] 1.2 `plantilla/.github/workflows/ci.yml:140-141`: `include-hidden-files: true` e
      `if-no-files-found: error`, con el motivo en `:127-134`. Banco: `4/4`.
- [x] 1.3 El caso `:130` corre `constitucion.mjs` en modo escribir y después en modo
      verificar sobre un repo al día: sale 0 y el directorio que se sube queda con
      archivos, todos bajo rutas ocultas. Es la condición para que `error` no
      enrojezca un verde, medida y no leída del comentario de `constitucion.mjs:1580`.

## 2. La action de cobertura

- [x] 2.1 Rojo primero en `actions/cobertura-diff/pruebas/cobertura-diff.test.mjs`:
      el caso del archivo sin datos exige `coverage.include` (`:273`); dos casos del
      `.github/` con `package.json` raíz (`:682`, `:709`); el detector de consejos
      vencidos con su control (`:775`, `:783`). Contra el árbol sin arreglar:
      `# tests 38 · # pass 35 · # fail 3` — el del archivo sin datos, el de
      `.github/` (exit 1 por «sin ningun dato de cobertura») y el de los textos, que
      listó 13 lugares: `medir-cobertura-diff.mjs` 767, 1088, 1092, 1234, 1269, 1354,
      1362, 1863; `action.yml:17`; `actions/README.md` 457, 517, 524, 601.
- [x] 2.2 Los siete mensajes (`medir-cobertura-diff.mjs:1088`, `:1092`, `:1234`,
      `:1269`, `:1354`, `:1362`, `:1891`) y el comentario de `:767` nombran
      `coverage.include`; la cabecera de `action.yml:28-33` también, y corrige
      `vitest.config.base.ts` → `.mjs`; `actions/README.md:482-487`, el ejemplo de
      configuración y `:642`, igual.
- [x] 2.3 Exención de `.github/` en `medir-cobertura-diff.mjs:1765-1781`, con
      `::notice::` en `:1844-1848`. Sabotaje con el arreglo roto de Rigel («fuera de
      todo paquete», copia de respaldo y restaurado): `# tests 38 · # fail 1`, el
      caso `:682`. O sea que el banco distingue el arreglo bueno del inerte.
- [x] 2.4 `actions/README.md:562` documenta la exención y por qué es por ruta.
      `node --test actions/cobertura-diff/pruebas/*.test.mjs` → `# tests 96 · # pass 96`.

## 3. El paso del umbral lee código, no comentarios

- [x] 3.1 Banco `pruebas/marco-ci/umbral-del-andamio.test.mjs` (extrae el paso real
      del YAML). Contra el paso viejo: `# tests 4 · # pass 1 · # fail 3` — el
      `include:` comentado salía verde, la métrica comentada salía verde, y la
      configuración sin un solo comentario salía **roja** (pedía `all: true`).
- [x] 3.2 `.github/workflows/marco-ci.yml:2615-2624`: filtra las líneas de
      comentario y exige las cuatro métricas y `include: [`. Banco `4/4`.
- [x] 3.3 Deuda saldada en `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs`: con
      el banco escrito y la entrada todavía declarada, el banco puso rojos «la deuda declarada esta al dia» y
      «la deuda que queda sale por ::warning::» (`# fail 2`); sacada la entrada,
      `4/4` y `12 de 17 pasos con run: citados`.

## 4. La prosa del piso de permisos dice `startup_failure`

- [x] 4.1 `pruebas/andamio/piso-del-reusable.test.mjs:216-248`: las cinco formas del
      fail-open, fuera, y `startup_failure` nombrado en los tres archivos. Contra el
      árbol sin arreglar: `# fail 1`, con las cinco frases encontradas (la del
      ejemplo de `marco-ci.yml` recién después de que la normalización aprendió a
      unir `#   #`; su control está en `:221`).
- [x] 4.2 Reescritos `marco-ci.yml:57-66` (ejemplo que copian los consumidores),
      `:430-438` (el bloque del job `cambios`, que distingue el caso propio del
      llamador), `plantilla/.github/workflows/ci.yml:26-31` y `:60-63`, y
      `.github/workflows/ci.yml:32-37` y `:59-60`. Banco `6/6`. El encabezado del
      banco (`:33-38`) y `el-piso-del-reusable-se-mide/tasks.md` §3 apuntan acá.
- [ ] 4.3 Reproducir la medición en un PR propio de Projects (pedido temporal de un
      alcance en `marco-ci.yml` y reversión en el mismo PR, al estilo de Rigel
      `9ab7b24`/`b18889b`). **No se hizo:** exige abrir un PR experimental y mirar la
      corrida en GitHub, y esta sesión no escribe fuera del worktree ni configura
      GitHub. Mientras tanto la prosa cita la corrida 33971175258 de Rigel.

## 5. `@v1` no es el canal

- [x] 5.1 `FALSAS_DEL_CANAL` en `pruebas/andamio/pinado.test.mjs:400`, con su
      control de normalización. Contra el árbol sin arreglar: 8 frases en
      `marco-ci.yml`, `actions/README.md` (5), `plantilla/.github/workflows/ci.yml` y
      la skill de archivado del andamio.
- [x] 5.2 `actions/README.md:4`, la sección Versionado (`:30-53`), `:439`, `:715`, y
      las menciones de `@v1` que quedaban en `:826`, `:902` y `:1006`;
      `marco-ci.yml:42-44`; `plantilla/.github/workflows/ci.yml:7-8`;
      `plantilla/.claude/skills/projects-archive-change/SKILL.md:99`. La fecha de
      `v1` es medición: `git ls-remote --tags origin` registrado en el scratchpad del
      porte y `git rev-list -n1 v1` → `b673ad6`, el commit de `v1.8.0`.
      `pinado.test.mjs` → `9/9`.

## 6. El guardrail de deltas, dicho como es

- [x] 6.1 Medido el hueco real sobre un árbol de juguete (un spec vivo con «El
      sistema hace algo» y un change con un `ADDED` del mismo título):
      `openspec validate --all --strict` 1.9.0 → `2 passed, 0 failed`;
      `check-openspec-deltas.mjs` → exit 0; `aplicar-deltas.mjs dup --simulacro` →
      `ADDED "El sistema hace algo" YA existe en el spec vivo`, exit 1.
- [x] 6.2 Banco `pruebas/docs/huecos-del-guardrail-de-deltas.test.mjs`, que corre el
      guardrail sobre los dos casos y deriva de eso lo que la prosa puede decir.
      Contra el árbol sin arreglar: 5 frases falsas (en `AGENTS.md` y en las dos
      skills, dos por skill) y `AGENTS.md` sin nombrar el hueco del `ADDED`.
- [x] 6.3 `AGENTS.md:81-88`; las dos skills (`.claude/…/SKILL.md:139-146` y la fila
      `:404-405`; `plantilla/…/SKILL.md:163-171` y `:448-449`, con la tabla alineada);
      `actions/README.md:103-107`. Bancos `pruebas/docs/huecos-…` y
      `pruebas/andamio/skill-de-archive.test.mjs` → `8/8`.

## 7. El carril rápido nombra el pipeline que exime

- [x] 7.1 El paso ganó `name: Detectar el carril de docs` (`marco-ci.yml:564`), mismo
      `id`. Banco `pruebas/marco-ci/deteccion-del-carril.test.mjs`, que lee el default
      de `rutas_carril_docs` del YAML y corre el paso en modo push sobre repos de
      juguete. Con el nombre y sin el aviso: `# tests 4 · # pass 2 · # fail 2` (los
      dos casos que exigen el aviso; los controles negativos pasan).
- [x] 7.2 El aviso en `marco-ci.yml:646-664`: archivos no-markdown de un
      subdirectorio de `.github/` con `solo_docs=true`, hasta cinco nombrados, y el
      arreglo (`rutas_carril_docs` con `^\.github/[^/]*$`). El default no cambia, y el
      primer caso del banco lo fija. Banco `4/4`.
- [x] 7.3 Deuda «(sin name, id: detectar)» sacada de `cobertura-de-los-pasos.test.mjs`
      (sin eso, el banco la marcaba como fantasma).
- [ ] 7.4 Cambiar el default de `rutas_carril_docs`. **Fuera de este change a
      propósito:** es incompatible (un consumidor pasaría a correr el build en PRs que
      hoy lo saltean) y va con la línea `v2`, lote 38.

## 8. El logger no promete un filtro

- [x] 8.1 Banco `pruebas/andamio/el-log-no-promete-un-filtro.test.mjs`. Contra el
      árbol sin arreglar: `# tests 3 · # pass 1 · # fail 2`.
- [x] 8.2 `plantilla/api/src/lib/log.ts:10-18` y `log.test.ts:17-18`. Banco `3/3`.
- [ ] 8.3 Portar el predicado de niveles de Rigel y conectarlo a la verificación
      posterior al despliegue de cada adaptador. **No se hizo:** vive en
      `one-off-ecs`, que la decisión D4/D5 del PO deja fuera hasta que haya un
      consumidor sobre ECS, y la verificación posterior al despliegue no existe en
      Projects.

## 9. Coherencia y verificación

- [x] 9.1 `openspec/cobertura-de-requirements.md`: las citas por línea del `ci.yml`
      del andamio (+14) y de `actions/cobertura-diff/action.yml` (+1) corridas con el
      árbol; `pruebas/docs/cobertura-de-requirements.test.mjs` → `13/13`.
- [x] 9.2 Deltas: cuatro requirements `ADDED` (tres en `calidad-codigo`, uno en
      `pipeline-entrega`). Verificado a mano que ningún título existe ya:
      `grep -rn "### Requirement: <título>" openspec/` sin resultados para los cuatro.
      Ningún `MODIFIED`.
- [x] 9.3 Banco completo:
      `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap`
      → `# tests 1499 · # pass 1499 · # fail 0` (antes del change: 1474/1474).
- [x] 9.4 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 35 passed, 0 failed (35 items)`.
- [ ] 9.5 Probar contra un consumidor real antes de publicar (skill
      `projects-validar-consumidor`). **No se hizo:** esta sesión no escribe en los
      repos consumidores.
- [ ] 9.6 Revisión adversarial con lentes independientes, registrada en `design.md`,
      y archive, con una fila por cada requirement nuevo en
      `openspec/cobertura-de-requirements.md` (los cuatro `ADDED` recién existen en el
      spec vivo al archivar). **Pendiente:** va en la pasada final del porte.
- [ ] 9.7 Entrada del CHANGELOG. Escrita como fragmento en
      `.porte/changelog/05-el-marco-deja-de-afirmar-lo-que-no-hace.md`; se integra al
      `CHANGELOG.md` en la pasada final.
