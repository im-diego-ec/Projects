---
artefacto: design
dri: Builder 1
aprueba: "revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)"
estado: en-ejecucion
---

# Design — guardrail-deltas-por-version-exacta

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
| --- | --- | --- |
| `.github/workflows/marco-ci.yml` (la línea del job `deltas` y su comentario) | **Referenciado** | Es el workflow reusable: cada consumidor lo recibe en su pull request de bump, que es justo el canal que este change vuelve verdadero. No puede ser scaffold: la línea tiene que cambiar para todos a la vez, con la versión. |
| `pruebas/andamio/refs-propias.test.mjs` (nuevo) | Del repositorio del marco, no viaja | Mira los workflows **del marco**: la partición solo tiene sentido en el repo que los distribuye. Un consumidor no tiene referencias remotas propias que particionar. |
| `pruebas/andamio/pinado.test.mjs`, `pruebas/andamio/expresiones.mjs` | Del repositorio del marco, no viajan | Bancos y su evaluador compartido. |
| `AGENTS.md`, `.claude/skills/projects-release/SKILL.md`, `.github/workflows/claude.yml` | Del repositorio del marco, no viajan | La constitución de este repo, la skill con que se corta una versión y el prompt del asistente de este repo. Ninguno está en `plantilla/`. |
| `README.md`, `docs/15-forkear-el-marco.md` | Documentación | Se leen desde el repo del marco; no se copian. |
| `actions/constitucion/cableado.mjs` (un comentario) | Referenciado, sin cambio de comportamiento | Solo cambia un comentario que llamaba al tag «interno del marco». |

Nada de `plantilla/` cambia: el andamio ya pina todo por versión exacta.

## D1 — Pinar la línea, y no rehacer el job como en Rigel

Projects ya había pagado la parte cara en la 1.8.0: el job `deltas`, su partición por
`needs.cambios.outputs.es_distribuidor` y su cobro en el veredicto `marco-ok`. Lo que
faltaba era una línea: `@v1` → `@v1.9.6`, la versión más alta del CHANGELOG.

**Descartado: traer el job `guardrail_deltas` de Rigel.** Publica el check
`guardrail-deltas`; renombrar `deltas-openspec` le bloquearía los PRs a todo consumidor
que lo tenga como check requerido, con un error que no menciona al marco. Y su `if`
compara `github.repository` con un literal, que el paso «El marco no se auto-identifica
por un literal de su cuenta» de `.github/workflows/ci.yml` ya pone en rojo.

**Descartado: dejar la línea en `@v1` con el motivo actualizado**, que era lo que el
comentario de `marco-ci.yml` proponía. El motivo de la excepción desapareció en la
1.8.0; una excepción que se puede reducir y no se reduce deja el pin exacto del
consumidor como media verdad a propósito.

## D2 — La partición se evalúa; no se busca como texto

El banco de Rigel (`64fc6f8`) comprueba que el `if:` del job **contenga** la cadena de la
partición. Eso deja pasar `always() || <partición>`: la cadena está y el job corre
siempre. `pruebas/andamio/expresiones.mjs` ya evalúa condiciones de GitHub Actions para
los bancos del despliegue (change `el-despliegue-no-le-da-la-llave-al-fork`), así que
`refs-propias.test.mjs` evalúa la condición de cada job **dos veces**:

- con `es_distribuidor = 'true'` tiene que dar **no corre** (si no, el job resuelve la
  referencia durante el PR que corta la versión);
- con `es_distribuidor = 'false'` tiene que dar **corre** (si no, la pieza no corre en
  ningún lado: está apagada, no particionada).

Para eso el evaluador aprende las funciones de estado (`cancelled()`, `always()`,
`success()`, `failure()`), porque los dos jobs las usan. **Solo si el banco las declara**,
por un símbolo que ningún `if:` puede nombrar: sin la declaración, cualquier función
sigue lanzando, que es de lo que dependen los bancos del despliegue. Un contexto que el
banco no modela (`github`, `inputs`, `vars`) también lanza, y el banco lo lee como rojo:
una condición que no se entiende no se lee como particionada.

**Descartado: un parser de YAML.** El de `actions/constitucion/cableado.mjs` existe,
pero acoplaría un banco del marco al módulo de una action referenciada que cambia por
sus propios motivos. `jobsConCondiciones` ya lee por sangría, con la misma decisión y el
mismo motivo que `workflows.mjs`.

**Descartado: aceptar la partición en el `if:` de un paso.** No evita nada: «Set up job»
resolvió el `uses:` antes. Es uno de los fixtures del banco.

**La llamada a un reusable propio por referencia remota es roja siempre.** Una llamada
a un workflow reusable (`uses:` a nivel de job) se carga al armar la corrida y no en
«Set up job», según la documentación de los reusables, y este change no mide si una
condición de job alcanza para saltearla. Se elige el lado cerrado: el marco llama a su
reusable por ruta local (`ci.yml` → `./.github/workflows/marco-ci.yml`). Hoy no hay
ninguna.

## D3 — La otra mitad: cada pieza salteada corre por ruta local

Un job salteado en el marco es un job que el marco no corre. Si la misma pieza no corre
por ruta local en otro workflow del marco, se publica sin haber corrido nunca sobre el
árbol del propio marco ni con el código del PR que la cambia. Hoy las dos piezas
cumplen (`ci.yml` corre `./actions/constitucion` y `./actions/guardrail-deltas`), pero
nada lo exigía: si alguien borra el job `deltas` de `ci.yml`, el rojo que queda es el
de `ci-ok` por un `needs` roto, no uno que diga qué se perdió. El banco lo dice.

## D4 — `pinado.test.mjs` sin lista de excepciones

La lista tenía una entrada y un mecanismo (archivo, ref y action) para que una segunda
no heredara la exención. Con cero entradas, el mecanismo sería código muerto que invita
a volver a llenarlo. Se borra, y el comentario dice que el camino para una invocación
interna nueva es particionar su job.

La aserción que exigía «exactamente una invocación por `@v1` en `marco-ci.yml`» se
reemplaza por la contraria, con un control de no vacuidad (tiene que haber al menos una
invocación propia que clasificar). Rigel la reescribió en dos: la segunda exigía que su
tag móvil siguiera vivo en su andamio, para que el paso del release no quedara moviendo
un tag sin consumidor. En Projects el andamio pina todo exacto, así que esa segunda mitad
no tiene dónde apoyarse dentro del árbol: quien resuelve `v1` hoy son versiones ya
publicadas. Ver D5.

Y se agrega una lista de las formas **exactas** en que la prosa afirmaba el rol interno
de `v1` (seis superficies), comparadas sobre el texto normalizado —saltos de línea con
su marca de cita o de comentario aplanados— porque tres de las seis estaban partidas en
dos líneas. Límite declarado, el mismo del caso vecino «v1 se retiró»: es una lista de
frases que existieron, no un detector de la idea.

## D5 — El paso 5 del release: no se mueve por defecto, y la decisión queda pendiente

Con el árbol limpio, `v1` solo lo resuelven las versiones publicadas hasta la 1.9.6
(dentro de su `marco-ci.yml`). Moverlo ya no le sirve a ninguna línea del árbol: su
**único** efecto es cambiar el `guardrail-deltas` que corre en esos consumidores, sin
pull request. Tres opciones:

1. **Seguir moviéndolo en cada release** (lo que decía la skill). Mantiene la media
   verdad para todo consumidor que no haya hecho el bump, y la skill afirmaba que no
   pedía OK, contra `AGENTS.md`, que lista «Mover el tag `v1`» entre lo que pide OK
   humano.
2. **Congelarlo formalmente** (borrar el paso). Es lo que recomienda este design: es el
   estado real desde el 2026-09-01 y cierra la media verdad también para quien no hizo
   el bump. Pero es una decisión de distribución que `AGENTS.md` pone en ⚠️.
3. **No moverlo sin OK humano explícito, y dejar la decisión escrita.** Es lo que se
   implementa: no toma ninguna acción sobre el tag, coincide con el estado medido, y
   deja la decisión entre 1 y 2 a quien tiene que tomarla, con el comando que mide si
   moverlo cambiaría algo (`git diff` de `actions/guardrail-deltas` entre `v1` y el SHA
   que se corta).

**Borrar el tag** no es opción: les rompe el job `deltas-openspec` a los consumidores
pinados hasta la 1.9.6.

## Alternativas descartadas del diseño general

- **Pinar por SHA en vez de por versión.** El marco ya pina todo lo propio por versión
  exacta y el banco del pinado compara contra el CHANGELOG; un SHA rompería esa
  comparación y el paso 1 del release no lo movería.
- **Derivar el ref con `github.job_workflow_ref`.** `uses:` no admite expresiones.

## Qué lo hace cumplir solo, y qué no

**Falla solo:**

- `pruebas/andamio/pinado.test.mjs`: ningún `uses:` del marco por tag mayor móvil, sin
  excepciones; `marco-ci.yml` no invoca ninguna pieza propia por tag móvil (con control
  de no vacuidad); todo pin exacto es la versión más alta del CHANGELOG, así que el
  paso 1 del release no puede olvidar esta línea; y ninguna superficie repite las seis
  frases que afirmaban el rol interno.
- `pruebas/andamio/refs-propias.test.mjs`: toda referencia remota propia vive en un job
  que la condición **evaluada** saltea en el distribuidor y deja correr en un consumidor;
  cada pieza salteada corre por ruta local; fixtures con las siete formas (bien, en
  bloque, solo en el paso, `always() ||`, apagado en todos, reusable remoto, contexto no
  modelado) y dos que no son referencias (comentario y `echo`).
- El rojo está demostrado en los dos bancos: pinado con 4 de 8 casos rojos antes de
  pinar la línea; refs-propias con cuatro mutaciones del árbol real, y el resto del banco
  verde bajo dos de ellas (tasks.md, 1.x).

**No falla solo, y se dice:**

- **Que el paso 5 del release no mueva `v1`.** Es un acto humano sobre un tag remoto, y
  el CI no ve tags. Lo que sí queda es el procedimiento con su comprobación y su parada.
  La prueba de que un paso del release que depende de que alguien se acuerde no alcanza
  es este mismo change: el paso decía mover `v1` y no se ejecutó en siete versiones.
- **Que la condición de un job no dependa de contextos que el banco no modela.** Si
  depende, el banco se pone rojo (lado cerrado); lo que no hace es probar todos los
  valores posibles de esos contextos.
- **El ensayo contra un consumidor sigue sin ejercitar las piezas internas del SHA.**
  La skill `projects-validar-consumidor` pina `marco-ci.yml` al SHA, pero sus
  invocaciones internas van por versión exacta —antes, por `@v1`— y corren la versión
  publicada, no la del SHA. No cambia con este change y queda como hallazgo.

## Riesgos

- **El literal «hasta la 1.9.6» de la prosa** es verdad si la próxima versión publicada
  es la que lleva este change. Si se cortara otra antes, la frase tiene que moverse a esa
  versión; el barrido de `docs/` del paso 1 del release la encuentra con el `grep` de
  literales.
- **Integración con el porte del guardrail de deltas**, que endurece
  `actions/guardrail-deltas`: si ese cambio se publica en una versión donde además se
  mueve `v1`, les llega sin PR a los consumidores en la 1.9.6. El paso 5 nuevo lo evita
  si nadie lo saltea.

## Revisión

Este change no tiene builder par: el marco declara el desvío de un solo mantenedor
(decisión D8 del PO). Lo reemplaza una **revisión adversarial con lentes
independientes**, que se registra en `tasks.md` cuando ocurra. Hasta entonces el estado
es `en-ejecucion` y el change no se archiva.
