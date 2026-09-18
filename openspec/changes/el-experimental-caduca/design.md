---
artefacto: design
dri: Builder 1
aprueba: PO
informado: PO / Builder 2
estado: en-ejecucion
---

# Design — el-experimental-caduca

## Clasificación de distribución, pieza por pieza

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| Paso «Estado experimental con fecha de veredicto» del job `openspec` de `.github/workflows/marco-ci.yml` | **Referenciado** | Tiene que correr sobre el árbol del consumidor y corregirse una vez para todos. Como scaffold se copiaría una vez y cada proyecto quedaría con la versión del día que nació; como paso del reusable llega con el PR de bump. Va **dentro** del job `openspec` y no en un job nuevo: un job nuevo publica un check nuevo, y un check nuevo con nombre es superficie de contrato (`AGENTS.md`, «Qué es BREAKING»); el job `openspec` ya clona el árbol y ya tiene el permiso que hace falta. |
| Job `canonico-versionado` de `.github/workflows/ci.yml` | **Interno del marco (no viaja)** | Compara dos commits del repo que publica el canónico. En un consumidor no hay canónico que versionar. |
| Delta de `gobierno-contribucion` | **Canónico** | Es regla de gobierno de un change, y esa capability la gatea el PO. |
| Delta de `calidad-codigo` | **Canónico** | Es propiedad de la maquinaria de distribución del marco, igual que la del change `guardrail-deltas-por-version-exacta`. |
| `pruebas/marco-ci/caducidad-experimental.test.mjs`, `pruebas/ci-del-marco/canonico-versionado.test.mjs` | **Interno del marco** | Bancos. Corren en el job `pruebas-actions` del `ci.yml` del marco por el patrón `pruebas/**/*.test.mjs`. |
| `actions/constitucion/pruebas/huella-del-canonico.test.mjs` (mensaje) | **Interno del marco** | Vive bajo `actions/`, pero `pruebas/` no la ejecuta ningún consumidor. |
| `openspec/config.yaml` (una regla de `rules.proposal`) | **Interno del marco** | Es la configuración de OpenSpec de ESTE repo; `plantilla/` no trae `openspec/` (lo genera el CLI). |
| `openspec/changes/capa-descubrimiento/*` | **Canónico en vuelo** | Se le saca un requirement y cinco tareas, y se le corre la fecha. |

## D1 — El paso vive en el reusable y es inerte por declaración, no por presencia

**Decisión.** El paso lee `openspec/changes/` del consumidor y solo actúa sobre los
changes que **declaran** `experimental`. Un repo sin changes experimentales ve una
línea («el paso es inerte») y sale 0. Un repo sin `openspec/changes/` sale 0 diciendo
«nada que caducar»: la ausencia de `openspec/` ya la cobra «Exigir OpenSpec en el
repo», del mismo job, y dos rojos por un solo defecto no agregan información.

**Alternativa descartada: un job propio.** Publicaría un check nuevo, y un nombre de
check es contrato. El paso cabe en un job que ya clona el árbol, con el mismo permiso.

**Alternativa descartada: estrenarlo en modo aviso.** La decisión D1 del PO terminó con
el modo aviso como regla general. La excepción es un arreglo que queda fuera del árbol
del consumidor; este es una línea de frontmatter en el árbol.

## D2 — Las cinco reglas de Rigel se conservan, cada una con su modo de falla

1. **Dos rojos y no uno.** Declararse experimental sin fecha también falla: si no, la
   puerta de escape es no poner la fecha.
2. **Un veredicto escrito le gana a la fecha.** Un artefacto con `artefacto: veredicto`
   en el frontmatter cierra el experimento. Si vencer fuera rojo aunque el veredicto
   exista, el arreglo sería correr la fecha para siempre.
3. **Manda la fecha más temprana.** Con la más lejana, agregar un archivo con otra fecha
   correría el vencimiento sin que nadie lo decidiera. Consecuencia que se escribe en el
   mensaje: correr la fecha es correrla en **todos** los artefactos que la declaran.
4. **El `archive/` no se mira.** Es historia inmutable.
5. **La fecha entra por `HOY_ISO`, y el workflow no la setea.** Sin eso el banco depende
   del calendario. En una corrida real es el día UTC del runner. `HOY_ISO` no la puede
   fijar un consumidor: el `env` del workflow que llama no se propaga a un reusable.

**La frontera, fijada con un caso.** `veredicto_antes_de: D` vence al **terminar** el día
D: D todavía es verde y D+1 es rojo. Es la semántica de Rigel (`vence < HOY`), y la que
el plan del porte da por supuesta («queda en rojo el 2026-09-22» con una fecha del
2026-09-21). El requirement que venía en `capa-descubrimiento` decía «alcanza la fecha»,
que se leía como `<=`; el delta de acá lo dice sin ambigüedad y lo acompaña un escenario.

## D3 — Tres adaptaciones al lector, cada una con su caso rojo medido

Con el paso de Rigel copiado literal sobre el banco de este change, 13 de 17 casos
pasan y 4 fallan. Los cuatro son las adaptaciones:

- **Comentarios de YAML en el frontmatter.** En este repo los frontmatter los llevan
  (`experimental: true           # ver "El estado experimental" al final` en el proposal
  de `capa-descubrimiento`; `aprueba: … # …` en varios). El lector de Rigel toma el valor
  crudo: `true  # ver …` no es `true`, el change no cuenta como experimental y el paso
  imprime «ningún change activo se declara experimental: el paso es inerte» y sale 0
  **con la fecha vencida**. `capa-descubrimiento` se salvaba de casualidad, porque su
  `design.md` lo declara sin comentario. Ahora se saltean las líneas de comentario, se
  descarta el comentario al final de un valor y se quitan las comillas.
- **Un `experimental:` que no es booleano es rojo.** `experimental: sí` es alguien
  declarando el estado con otra palabra; tomarlo por falso deja al change sin fecha y sin
  rojo.
- **Una fecha con la forma correcta que no existe es roja.** `2026-13-01` pasa
  `AAAA-MM-DD` y compara bien como cadena; el lector de Rigel la aceptaría.

Y un cuarto, de salida: el verde **nombra** cada change experimental con su fecha, no
solo los cuenta. En el CI de Projects eso deja a la vista, en cada corrida, cuánto le
falta a `capa-descubrimiento`.

## D4 — El canónico: se conserva la huella y se le agrega la mitad que le falta

**El estado de partida.** Projects ya resolvió la clase con otra mecánica: la
`huella_canonico` de la última versión del manifiesto (commit `dad5566`, motivada por un
renombrado de `60-infra-*.md`). La huella es más fuerte que el diff de Rigel en dos
cosas: ve renombrados y no depende de la base del PR. Lo que no ve es el atajo que su
propio mensaje prohíbe: pegar la huella nueva sobre una entrada ya publicada.

**Decisión.** Un job en el `ci.yml` del marco que compara el manifiesto del ancestro
común del PR con el de la cabeza: toda entrada **publicada** del ancestro sigue en la
cabeza con la misma huella (o la misma ausencia de huella). Publicada = su número no es
mayor que el `## [X.Y.Z]` más alto del CHANGELOG **de la base del PR, tal como la trae
el evento**. Si el PR no
toca el manifiesto, el job es inerte y dice que el cuerpo lo cobra el banco de la huella.

**Por qué «publicada» y no «la última».** El plan del porte decía la regla de Rigel
adaptada: «si cambia la huella de la última versión respecto de la base, `versiones[]`
tiene que crecer». Esa regla pone rojo a un PR legítimo: la entrada de la versión que
todavía no salió se escribe antes del release con un número previsto (lo dice la `nota`
del manifiesto), y un segundo PR del mismo ciclo que toque el canónico la tiene que
actualizar. Medido con el script de Rigel sobre ese caso: sale 1, «el manifiesto sigue
con 2 entradas de versión». Y el porte ya tiene dos changes previstos que tocan el
canónico y piden ir juntos en una sola versión. Una versión pendiente no la recibió
ningún consumidor: reescribirla no le cambia el texto a nadie. Sobre una entrada
publicada, las dos reglas coinciden: mover el canónico exige que `versiones[]` crezca.

**Por qué «no mayor que el último publicado» y no «la nombra el CHANGELOG».** Si el
release olvida corregir el número previsto de la entrada (quedó `1.9.9` y salió
`1.10.0`), con «la nombra» esa entrada quedaría reescribible para siempre. Con el número,
queda congelada en cuanto sale cualquier versión posterior.

**Desde dónde se mide: el ancestro común para el manifiesto, la base del PR para el
CHANGELOG.** GitHub manda como base del PR la punta de `main` al momento del evento. Si la rama salió antes de
un release, esa punta trae una versión que la rama no tiene, y comparar contra ella
culpa al PR de «sacarla». Medido con el banco: con la base en la punta, el caso de la
rama atrasada que no toca el manifiesto sale **1**; con el ancestro común, 0. Lo que sí
se lee de la punta es el CHANGELOG, porque es lo más nuevo que se sabe de qué salió: si
`main` publicó la entrada pendiente que la rama reescribe, al mergear le cambiaría el
texto a quien la pinó, y eso es rojo con un mensaje que dice «actualizala con main». El
job del CHANGELOG compara contra la punta (dos puntos); acá no alcanzaba, porque allá el
error de esa forma es un verde de más y acá sería un rojo que no se entiende.

**Límite declarado (hallazgo FO-H5 de la revisión adversarial): «la punta» es la del
evento, no la del merge.** La base sale de `github.event.pull_request.base.sha`: la punta
de `main` cuando se abrió o se empujó por última vez el PR. Si `main` publica una versión
**después** de ese push, el verde de este check queda rancio —juzgó con un tope viejo—, y
re-correrlo reusa el mismo payload. Lo tapa en la práctica que el release edita la misma
entrada del manifiesto (un conflicto de merge obliga a actualizar la rama), pero no lo
cierra. Lo que lo cierra es que el ruleset de `main` exija ramas al día antes de mergear,
y eso es configuración de GitHub, fuera del árbol: queda como pendiente (tasks 5.6).
**Descartado: leer el CHANGELOG de `origin/main` recién traído.** Arreglaría el re-run,
que pasaría a ver la punta de ese momento, pero no el caso de fondo —nadie re-corre un
check verde—, y cambiaría la fuente del tope sin cerrar el hueco.

**Por qué el CHANGELOG y no los tags.** El CHANGELOG está en el árbol, se lee sin red y
es la misma fuente que ya usa `pruebas/andamio/pinado.test.mjs` para los pines. Los tags
exigen traerlos al clon y un banco con tags de juguete, y no agregan nada: el tag se crea
después del merge del PR que actualiza el CHANGELOG.

**Fail-open ruidoso.** Si el CHANGELOG de la base no nombra ninguna versión, el camino
conservador es tratar **todas** como publicadas, con un `::warning::`. Si el manifiesto
de cualquiera de los dos lados no se puede leer, o la base no resuelve, es rojo.

**Alternativa descartada: además de lo anterior, portar el job de Rigel tal cual, que
mira el diff del cuerpo.** El caso que él caza —cuerpo tocado, manifiesto intacto— acá
ya lo cobra el banco de la huella, sin depender de la base del PR; sumarlo serían dos
rojos por un solo defecto, y el segundo, además, rojo con la entrada pendiente.

**Alternativa descartada: meter la comparación en el banco de la huella.** Ese banco
corre sobre el árbol y no tiene la base del PR; darle red o historia lo convertiría en
algo que no se puede correr en local sin preparar el clon.

**Alternativa descartada: correr también en `push` a `main`.** Igual que el job del
CHANGELOG, se saltea en push: `main` no tiene todavía ruleset (medido en
`.github/proteccion-main.md`), así que un push directo no pasa por este check. Es el
mismo límite que ya declara el job del CHANGELOG, y lo cierra el ruleset, no este job.

## D5 — La fecha de `capa-descubrimiento` se corre en los seis artefactos

La decisión D3 del PO fija el 2026-10-15. Como manda la más temprana, se corre en los
seis artefactos que la declaran, con un comentario en la misma línea que apunta al
motivo, que vive en su `proposal.md` («Por qué se corrió la fecha del veredicto»). En
`piloto/pre-registro.md` se toca solo esa línea del frontmatter: los umbrales
pre-registrados no cambian y el commit original sigue siendo la evidencia de que se
escribieron antes de correr.

**Alternativa descartada: correrla solo en el proposal.** Con la regla de la más
temprana, las otras cinco seguirían mandando y el CI se pondría rojo el 2026-09-22.

## Permisos, auditados acción por acción

**Paso nuevo (job `openspec`, `contents: read`):** `[ -d ]`, `readdirSync` y
`readFileSync` leen el checkout; comparar cadenas y `console.log` no necesitan nada. Sin
red, sin `GITHUB_TOKEN`, sin `gh` ni `git`, sin escritura: no agrega un permiso. La tabla
está en el comentario del job.

**Job `canonico-versionado` (`contents: read`):** `actions/checkout` con
`fetch-depth: 0` y `persist-credentials: false` necesita `contents: read`;
`setup-node`, `git cat-file`, `git diff`, `git show` y `node -e` leen el clon local. No
llama a ninguna API. La tabla está en el comentario del job.

## Cómo se hace cumplir solo

| Propiedad | Check que falla solo |
|---|---|
| Un change experimental sin fecha, con fecha ilegible o vencida sin veredicto | paso «Estado experimental con fecha de veredicto» del job `openspec` de `marco-ci.yml`, en el CI de cada consumidor y en el del marco |
| El paso sigue haciendo lo que dice | `pruebas/marco-ci/caducidad-experimental.test.mjs` (17 casos, dos sobre los artefactos reales) |
| El paso no queda sin banco | `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs` (todo paso con `run:` citado por un banco o declarado como deuda) |
| Una versión publicada del canónico no se reescribe | job `canonico-versionado` del `ci.yml` del marco, esperado por `ci-ok` |
| El job sigue haciendo lo que dice y sigue cableado | `pruebas/ci-del-marco/canonico-versionado.test.mjs` (17 casos: uno sobre el manifiesto y el CHANGELOG reales, dos sobre una rama atrasada, uno sobre el cableado de `ci-ok`) |
| El cuerpo del canónico no cambia sin mover la huella | `actions/constitucion/pruebas/huella-del-canonico.test.mjs`, que ya existía |

**Lo que queda sin check, dicho.** El job `canonico-versionado` no corre en un push
directo a `main`, igual que el del CHANGELOG; lo cierra el ruleset de `main`, que hoy no
existe. Y el paso de caducidad no puede saber si un veredicto escrito es **bueno**: solo
que existe.
