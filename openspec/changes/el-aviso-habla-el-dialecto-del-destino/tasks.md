---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-aviso-habla-el-dialecto-del-destino

Lote 36 del porte de Rigel. Mediciones del 2026-09-17 sobre la rama
`porte/w1-L4-aviso` (base `489a463`, el lote 8 ya commiteado), con Node 24.19.0.
Los scripts de medición son descartables y viven fuera del repo; lo que mide cada uno
está escrito en la evidencia.

## 0. Medir antes de tocar

- [x] 0.1 El plan citaba `aviso-version.mjs:190` para la mezcla de dialectos; con el
      lote 8 encima, la línea real era `:253`
      (`partes.push("", "*Qué tiene que hacer un consumidor:*", "", consumidores.texto)`)
      y la rama sin sección en `:259`. Manda el árbol.
- [x] 0.2 Lo que hoy llegaría a un destino Slack. Armando el aviso de cada sección del
      `CHANGELOG.md` con la action de `489a463` y contando `**` fuera de código:
      `TOTAL {"dobles":870,"cruzan":15,"sucias":18,"tablas":0} entradas 19` — 18 de 19
      secciones sucias; la 1.0.0 es la única limpia.
- [x] 0.3 Las secciones que se mandan no traen tablas hoy (`filasTabla=0` en las 19),
      aunque el `CHANGELOG.md` tiene 15 líneas de tabla en otras subsecciones: la
      conversión de tablas se ejercita en el banco, no en el archivo real.

## 1. Rojo primero

- [x] 1.1 `actions/aviso-version/pruebas/dialecto.test.mjs` (33 casos, nuevo). Importa
      la action por namespace para que, contra el script viejo, cada caso caiga por su
      razón y no el archivo entero por un `import` faltante. Contra `489a463`
      (script, `action.yml`, workflow y compuerta restaurados de `HEAD`):
      `# tests 33 · # pass 4 · # fail 29`. Los 4 verdes fijan lo que ya se cumplía y no
      puede romperse: el default no convierte, no desenvuelve, no toca tablas ni una
      línea con barras que no es tabla.
- [x] 1.2 `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs`: 3 casos nuevos
      (mide cada dialecto de la action; entra en markdown y no en mrkdwn → un hallazgo
      del dialecto que no entra; el `::error::` lo nombra) y 9 aserciones adaptadas de
      «un hallazgo» a «uno por dialecto», con el motivo en el encabezado del banco.
      Contra la compuerta de `489a463`: `# tests 26 · # pass 15 · # fail 11`.

## 2. El dialecto en la action

- [x] 2.1 `FORMATOS` y `FORMATO_POR_DEFECTO` en `actions/aviso-version/aviso-version.mjs:99-100`;
      `validarFormato` en `:166` (vacío → default, espaciado recortado, desconocido →
      error con los válidos y el arreglo); `enfasis` en `:180`.
- [x] 2.2 `construirMensaje` valida primero (`:481`) y arma el encuadre con `enfasis`
      (`:519` y la rama sin sección), traduce cuerpo, sección y BREAKING con el mismo
      dialecto, y devuelve `dialecto`.
- [x] 2.3 Conversión: `apartarCodigo` (`:205`, centinela en vez de split), `aMrkdwn`
      (`:240`, dos pasadas), `tablasALista` (`:277`, sujeto en markdown y sin
      re-envolver una negrita), `desenvolverParrafos` (`:352`, junta también la
      continuación de un ítem).
- [x] 2.4 `main`: dialecto desconocido → `::error::` y `exit 1` antes de leer el
      CHANGELOG, sin payload (`:621`); `::notice::` en cada corrida con el dialecto y si
      fue declarado (`:677`); línea `- Dialecto:` en el resumen (`:734`).
- [x] 2.5 En `markdown`, el mensaje nuevo difiere del viejo sólo en el encuadre.
      Evidencia: armando las 19 secciones con los dos scripts y normalizando el
      encuadre viejo de `*` a `**`, `secciones con otra diferencia que el encuadre: 0`,
      cada una `+2`.

## 3. El contrato y el workflow

- [x] 3.1 `actions/aviso-version/action.yml:92`: input `formato`, `required: false`,
      **sin** `default`, con el motivo; `AVISO_FORMATO: ${{ inputs.formato }}` en `:143`;
      «DONDE ESTA EL ROJO» y «LIMITES DECLARADOS» al día (`:34`).
- [x] 3.2 `.github/workflows/aviso-version.yml:160`: `formato: ${{ vars.AVISO_VERSION_FORMATO }}`
      sin fallback; la variable documentada en el encabezado (`:41-47`).
- [x] 3.3 Paso `Revisar donde esta declarado el dialecto` (`:133`): `DIALECTO_EN_SECRETS`
      es `secrets.AVISO_VERSION_FORMATO != ''` (`:136`), así que al entorno sólo entra
      `true`/`false`. El banco ejecuta su `run:` con bash: con el secret y sin variable
      advierte «dialecto 'markdown', el default»; con los dos, «'mrkdwn', el de la
      variable»; sin secret, nada. Permisos: ninguno nuevo; el paso no llama a la API
      (auditado: sólo `echo` sobre dos variables de entorno).
- [x] 3.4 YAML parseado sin error:
      `python3 -c "import yaml; yaml.safe_load(open(...))"` sobre `action.yml` y
      `aviso-version.yml` → ok.
- [ ] 3.5 `actionlint` sobre `aviso-version.yml`. No está instalado en esta máquina
      (`which actionlint` → nada); lo corre el CI del marco.

## 4. La compuerta mide cada dialecto

- [x] 4.1 `herramientas/aviso-entra-en-el-mensaje.mjs`: importa `FORMATOS` (`:92`),
      `medir` arma cada dialecto con y sin techo (`:235`), un hallazgo de recorte por
      (sección, dialecto) y el `::error::` nombra el dialecto (`:360`); la ausencia de
      «Para consumidores» sigue siendo un hallazgo por sección, con los largos de cada
      dialecto.
- [x] 4.2 Sobre el `CHANGELOG.md` con el parche del lote 8 aplicado
      (`.porte/08-normalizar-changelog.patch`, en una copia): `exit=0`,
      `[No publicado]: armados markdown=1459 mrkdwn=1449` y
      `[1.9.6]: armados markdown=554 mrkdwn=550`. Sin el parche sigue roja por la
      sección ausente, que es el pendiente del lote 8 (6.3 de su `tasks.md`).

## 5. El barrido contra el CHANGELOG real

- [x] 5.1 Con el código nuevo, en mrkdwn: `TOTAL {"dobles":0,"cruzan":0,"sucias":0,"tablas":0} entradas 19`.
      `RESIDUO_HISTORICO` queda vacío y se compara con `deepEqual`.
- [x] 5.2 Con el parche del lote 8 aplicado: también `sucias: 0` en las 19.

## 6. Mutaciones: cada banco muerde

Cada mutación se aplicó sobre el código nuevo, se corrieron
`dialecto.test.mjs`, `aviso-version.test.mjs` y `aviso-entra-en-el-mensaje.test.mjs`
(100 casos) y se restauró desde una copia (`cmp` → sin diferencias).

- [x] 6.1 Split por código en vez de `apartarCodigo` (la versión de Rigel antes de
      `683343a`) → `# fail 5`, incluidos los dos barridos del CHANGELOG real. Esa
      variante sobre el archivo: `{"dobles":58,"cruzan":9,"sucias":6}`.
- [x] 6.2 Desenvuelto sin la continuación del ítem (el de Rigel) → `# fail 3`, incluidos
      los dos barridos. Sobre el archivo: `{"dobles":1,"cruzan":27,"sucias":7}`.
- [x] 6.3 Encuadre con `*` literal (el defecto de hoy) → `# fail 1`.
- [x] 6.4 Sin `::notice::` → `# fail 3`; notice que no distingue declarado → `# fail 1`.
- [x] 6.5 Dialecto desconocido cae al default → `# fail 2`.
- [x] 6.6 Tablas sin convertir → `# fail 4` (dos del banco del dialecto y dos de la
      compuerta, porque la tabla deja de crecer en mrkdwn).
- [x] 6.7 Compuerta que mide sólo markdown → `# fail 13`; que no pasa `formato` →
      `# fail 4`.
- [x] 6.8 `default: markdown` en `action.yml` → `# fail 1`; sin `AVISO_FORMATO` →
      `# fail 1`; `|| 'markdown'` en el workflow → `# fail 1`; sin el `::warning::` del
      secret → `# fail 1`; el VALOR del secret en el entorno → `# fail 1`.

## 7. Documentación

- [x] 7.1 `actions/README.md`: ejemplo con `formato: ${{ vars.AVISO_VERSION_FORMATO }}`
      (`:721`), párrafo del dialecto, fila `formato` en Inputs (`:750`), dos filas en
      «Qué pasa en cada caso» (`:769`), «Límites declarados» reescrito (ya no dice «no hay
      traducción»).
- [x] 7.2 Encabezados al día: `aviso-version.mjs` (variables de entorno),
      `aviso-entra-en-el-mensaje.mjs` y su banco («cada dialecto»). La decisión 4 del
      design del lote 8 («un solo dialecto») lleva una nota que la da por cerrada acá.
- [x] 7.3 Fragmento de CHANGELOG del lote:
      `.porte/changelog/36-el-aviso-habla-el-dialecto-del-destino.md`. `CHANGELOG.md`
      no se edita en los carriles del porte.

## 8. Verificación y cierre

- [x] 8.1 Banco completo:
      `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap`
      → `# tests 1532 · # pass 1532 · # fail 0` (antes del lote: 1496/1496). Un rojo
      intermedio de `superficie-exportada.test.mjs` —las exportaciones nuevas «sin
      importador»— era el banco nuevo sin rastrear (el check lee `git ls-files`); con el
      archivo en el índice, verde. `aMrkdwn`, que sólo aparecía nombrado en un
      comentario, ganó un caso propio (encabezados).
- [x] 8.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 34 passed, 0 failed (34 items)`; el change solo:
      `Change 'el-aviso-habla-el-dialecto-del-destino' is valid`.
- [x] 8.3 Deltas verificados a mano: sólo ADDED en `pipeline-entrega`, y ninguno de los
      dos títulos existe en `openspec/specs/` ni en otro change
      (`grep -rlF "Requirement: <título>" openspec` → 0 en los dos). No hay MODIFIED.
- [ ] 8.4 **OK humano sobre el input nuevo `formato`** antes del release. AGENTS.md pone
      «cambiar el contrato de un workflow reusable ya publicado» en «Pregunta primero», y
      el plan del porte marca este lote con `requiere_ok_humano`. Este lote no publica ni
      mueve tags; el OK gatea la integración y el release.
- [ ] 8.5 Revisión adversarial con lentes independientes, registrada en este change
      (desvío D8 del PO). Va en la pasada final del porte, antes del archive.
- [ ] 8.6 Validación contra un consumidor real y contra un canal real. Ningún consumidor
      invoca `aviso-version`, y el destino de Projects no está configurado
      (`AVISO_VERSION_DESTINO` no existe): lo verificado es el payload, que es lo que se
      envía. Queda para la skill `projects-validar-consumidor` en el release y para el
      día que se configure el destino.
- [ ] 8.7 Archive. No en este lote: va en la pasada final, después de 8.5.
- [ ] 8.8 **Integrar después de `el-marco-declara-su-desvio-de-review` (carril L1)**, o
      junto con él (revisión adversarial, RV-L4-09). El `aprueba:` de este change cita
      un desvío que esta rama no declara; la guarda que lo pone rojo en un PR a `main`
      llega con el arreglo del change `que-es-breaking`.

## 9. Hallazgos de la revisión adversarial (2026-09-17)

- [x] 9.1 **RV-L4-07 — el fragmento del CHANGELOG nombraba un solo cambio.** Decía que
      «Qué tiene que hacer un consumidor:» era «el único cambio del mensaje por
      default». Medido de nuevo armando las 19 secciones con el script de `fde8f4e`
      (el de la 1.9.6), el de `489a463` (lote 8) y el de este lote: contra el lote 8
      cambian las DOS líneas de encuadre (una por rama); contra la 1.9.6 cambia además
      el primer párrafo. El fragmento nombra las dos líneas y remite a la entrada del
      lote 8 para el resto; el proposal y el design dicen contra qué se midió.
- [x] 9.2 **RV-L4-08 — referencia a la tarea equivocada.** El design decía «tarea 8.2
      abierta» para el OK humano; es la 8.4 (la 8.2 es el `validate`, cerrada).
