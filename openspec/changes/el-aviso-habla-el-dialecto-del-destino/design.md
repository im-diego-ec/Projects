---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — el-aviso-habla-el-dialecto-del-destino

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `actions/aviso-version/aviso-version.mjs` (dialecto, conversión, `::notice::`) | **referenciado** | Ya lo era: `actions/README.md` publica `uses: im-diego-ec/Projects/actions/aviso-version@vX.Y.Z`. La conversión vive en el script que viaja con la action; un repo que la use la recibe con el bump, sin copiar nada. |
| `actions/aviso-version/action.yml` (input `formato`) | **referenciado** | Es la línea de contrato del change: un input opcional nuevo. Ver la decisión 2. |
| `herramientas/aviso-entra-en-el-mensaje.mjs` (medir cada dialecto) | **canónico** | Mide el `CHANGELOG.md` del marco en su CI propio; no viaja. Hacerla referenciada le impondría a los consumidores la convención de «Para consumidores», que es del marco (decisión del lote 8, que se mantiene). |
| `.github/workflows/aviso-version.yml` (pasar la variable, advertir el secret) | **canónico** | Workflow propio del marco; nadie lo hereda. |
| `actions/aviso-version/pruebas/dialecto.test.mjs` y los cambios de `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs` | **canónico** | Bancos del marco, recogidos por los patrones que el CI ya tiene. |
| `actions/README.md` | **canónico** (documentación de lo referenciado) | Describe el contrato de la action: el input, su caso rojo, el `::notice::` y los límites. |

Nada es **scaffold** ni **regenerado**: ningún archivo de `plantilla/` cambia (el
andamio no invoca esta action) y ningún artefacto del CLI de OpenSpec se toca.

## Decisiones, con las alternativas descartadas

### 1. El dialecto es un parámetro, no una conversión incondicional

- **Elegida: input `formato` con un conjunto cerrado (`markdown`, `mrkdwn`).**
- **Descartada: convertir siempre a mrkdwn.** Es el arreglo obvio del síntoma de Slack
  y rompe a Teams y Discord, que renderizan Markdown. Rigel lo descartó por lo mismo
  (`8b073e0`).
- **Descartada: inferir el dialecto de la URL del webhook.** La action no conoce el
  destino a propósito —es lo que la hace pura y verificable sin credenciales—; inferirlo
  exigiría pasarle el secret.
- **Descartada: un tercer valor para Google Chat.** Entiende la negrita de mrkdwn. Un
  destino que hable otro dialecto es un change del marco, no una configuración, igual
  que un payload con otra forma (límite ya declarado en `action.yml`).

### 2. `formato` sin default en `action.yml`

- **Elegida: el input no declara `default`.** Vacío cae en `FORMATO_POR_DEFECTO` del
  script. Es la misma regla que el lote 8 fijó para `limite` —un valor, un lugar— y
  suma una razón propia: sin default en el YAML, un input vacío le dice al script que
  **nadie declaró el dialecto**, y el `::notice::` lo puede decir (decisión 6).
- **Descartada: `default: markdown`, como Rigel.** Con el literal en el YAML (y el
  `|| 'markdown'` del workflow), el script recibe siempre un valor y no puede distinguir
  «se eligió markdown» de «la preferencia quedó en otro lado». Es exactamente lo que le
  pasó a Rigel el 2026-09-02.

**Contrato:** input opcional nuevo → **MINOR**. AGENTS.md lo pone en «Pregunta primero»
(cambiar el contrato de un workflow reusable publicado), así que el release espera el
OK humano: tarea 8.4 abierta.

### 3. El encuadre acompaña al dialecto, también en el default

- **Elegida: el texto fijo que escribe el script pasa por `enfasis()`**, así que en
  `markdown` el encuadre usa `**` y en `mrkdwn` usa `*`.
- **Descartada: dejar el encuadre en `*` cuando no se declara nada**, para que el
  default no cambie ni un carácter. Es conservar el defecto: el mensaje por default
  seguiría mezclando dialectos, y un destino Markdown seguiría viendo el encuadre en
  itálica.

**Por qué no es BREAKING.** No cambia un input, un output, un job, un permiso ni un
check: cambia un texto. Medido sobre las 19 secciones del `CHANGELOG.md`, el mensaje
por default difiere del que arma el script del lote 8 **sólo** en su línea de encuadre
(+2 caracteres; hay dos, una por rama, y cada sección lleva una). Contra la 1.9.6
publicada difiere además en lo que cambió el lote 8, que su entrada nombra. Y
ningún consumidor real invoca la action. El único destino que lo nota es uno de Slack
que ya recibía el cuerpo con los asteriscos a la vista; su arreglo —declarar
`mrkdwn`— va escrito en «Para consumidores».

### 4. El código se aparta con un centinela, no partiendo el texto

- **Elegida: `apartarCodigo()`** reemplaza cada fragmento de código por un centinela
  (una corrida de NUL que el texto no contiene, con el índice adentro), traduce, y lo
  restaura. La apertura y el cierre de una negrita que envuelve código quedan en la
  misma cadena, y el código no participa de ningún emparejamiento.
- **Descartada: partir el texto por los spans de código** (la versión de Rigel hasta su
  2.4.0). Parte también las negritas que los envuelven, y el `**` huérfano se empareja
  con la negrita vecina. Medido acá con esa variante: **6 secciones sucias, 58 `**` a la
  vista**. Con el centinela: 0.
- **Descartada: que el código «gane la carrera del scan»** con una alternativa en la
  propia regex. Deja pasar el caso simétrico: una negrita que envuelve un span con `**`
  adentro se cierra contra el de adentro y reescribe lo que el consumidor copia.

### 5. El desenvuelto junta también la continuación de un ítem

- **Elegida: `desenvolverParrafos()` junta un párrafo de prosa y, además, cualquier
  línea que siga a un ítem de lista sin ser estructura.** En CommonMark esa línea es
  parte del párrafo del ítem (indentada o «perezosa»), así que juntarla no cambia lo
  que dice. No junta: el arranque de cada ítem, filas de tabla, citas, encabezados,
  reglas y líneas en blanco.
- **Descartada: el desenvuelto de Rigel**, que trata como estructura toda línea que siga
  a una viñeta. Su comentario lo declara como límite. En el `CHANGELOG.md` de Projects,
  escrito casi todo en viñetas envueltas, deja **7 secciones sucias con 27 negritas
  partidas por un salto de línea** (medido); con la elegida, 0.
- **Descartada: juntar también las citas.** Cada línea de una cita lleva su `>`; una
  cita del CHANGELOG suele ser una salida de comando o un texto citado donde el corte
  importa.

### 6. El dialecto se anuncia siempre, y el secret mal cargado se detecta donde se puede

- **Elegida, en la action: un `::notice::` en cada corrida** con el dialecto usado y si
  fue declarado o es el default («nadie lo declaró»), más una línea en el resumen.
- **Elegida, en el workflow del marco: un paso que compara `secrets.AVISO_VERSION_FORMATO`
  con `''`** y advierte con `::warning::` y el arreglo si existe. Al entorno entra sólo
  `true`/`false`, nunca el valor. No detiene el aviso: el release ya salió y el mensaje
  se manda igual, en el dialecto de la variable o el default.
- **Descartada: `::notice::` sólo cuando cae al default.** Un aviso que aparece a veces
  no se aprende a leer; y el caso declarado también sirve para confirmar.
- **Descartada: rojo cuando hay un secret con ese nombre.** Detendría el envío de un
  aviso que ya tiene un dialecto válido; el defecto es de configuración y su arreglo
  está fuera de la corrida.
- **Descartada: mirar el secret desde la action.** La action no recibe secretos a
  propósito; el que sabe dónde se declara la preferencia es el workflow que la usa.

### 7. Un dialecto desconocido es rojo

- **Elegida: `exit 1` con `::error::`**, nombrando el valor recibido, los válidos y el
  arreglo, **antes** de leer el CHANGELOG y **sin escribir payload**. Es configuración
  rota, no ausente: la misma línea que el workflow ya traza entre «no hay destino»
  (aviso) y «el destino rechaza» (rojo).
- **Descartada: caer al default con un `::warning::`.** Mandaría el aviso en un dialecto
  que nadie eligió; es el fail-open silencioso con un aviso encima.
- **Descartada: aceptar mayúsculas u ortografías cercanas.** Se recorta el espaciado
  (un YAML lo mete sin querer) y nada más: adivinar la intención deja pasar el typo.

### 8. La compuerta mide cada dialecto

- **Elegida: `medir()` itera `FORMATOS`, importado de la action.** Un hallazgo de recorte
  por (sección, dialecto); la ausencia de «Para consumidores» sigue siendo uno por
  sección, con los largos de cada dialecto. Si la action aprende un dialecto, la
  compuerta lo mide sin que nadie la edite.
- **Descartada: medir sólo el dialecto configurado en el repo.** La compuerta corre en el
  PR como script, sin las variables del workflow del aviso; y un verde que dependa de
  adivinar el destino es un verde a medias.

Las aserciones del banco de la compuerta que contaban **un** hallazgo de recorte pasan
a contar uno por dialecto, y los largos se leen por dialecto: es el cambio de la
compuerta, no una tolerancia nueva (explicado en el encabezado del banco).

### 9. La capability: `pipeline-entrega`, dos requirements ADDED

Mismo razonamiento que el lote 8 (su decisión 1): anunciar una versión es la última
etapa de la entrega. **No se modifica** el requirement «El aviso de la próxima versión se
mide en el pull request que lo escribe», que agrega el change del lote 8 y todavía no
está en el spec vivo: un MODIFIED sobre un requirement que no existe en
`openspec/specs/` no se puede archivar. La cobertura por dialecto va como requirement
propio. Títulos verificados a mano: ninguno existe en `openspec/specs/` ni en otro change.

### 10. El límite no se mueve

Sigue en 3500, en `LIMITE_POR_DEFECTO`. La conversión a mrkdwn **achica** el mensaje del
CHANGELOG de hoy (pierde asteriscos; no hay tablas en las secciones que se mandan):
`[No publicado]` normalizado por el parche del lote 8 mide 1459 en markdown y 1449 en
mrkdwn. Subirlo sigue esperando un destino medido.

## Qué hace cumplir esto solo

| Propiedad | Compuerta que falla sola |
|---|---|
| Un solo dialecto por mensaje, conversión que respeta el código, tablas y cortes, rojo ante un valor desconocido, `::notice::` | `actions/aviso-version/pruebas/dialecto.test.mjs` (job `pruebas-actions` del `ci.yml`) |
| El `CHANGELOG.md` real llega limpio en mrkdwn, sección por sección, con residuo declarado por `deepEqual` | El mismo banco: barrido de todas las versiones y de `[No publicado]`. Un PR que escriba algo que la conversión no sabe llevar se pone rojo |
| `formato` sin default en `action.yml`, llega al script; el workflow lo lee de Variables sin fallback y advierte el secret | El mismo banco, que además ejecuta el `run:` del paso del secret |
| La compuerta mide cada dialecto y su largo es el del payload real | `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs` y el paso de la compuerta en `changelog-en-el-pr` |

Cada banco se vio rojo contra el código anterior, y catorce mutaciones del código nuevo
se vieron rojas en el banco que les corresponde (evidencia en `tasks.md`).

## Residuo declarado

- **`RESIDUO_HISTORICO` está vacío**: hoy ninguna sección del `CHANGELOG.md` llega sucia
  en mrkdwn. La lista queda para que una excepción futura se declare y muera con su
  causa.
- **Un fragmento de código escrito a través de un corte de línea dentro de una cita**
  no se reconoce como código (la regex del span es de una sola línea, y las citas
  conservan su corte). A Rigel le ensucia una entrada; acá hoy ninguna. Si aparece, el
  barrido lo cobra.
- **La itálica de markdown (`*x*`) llega como negrita en mrkdwn.** Traducirla a `_x_`
  exige distinguirla de la negrita ya traducida; no está medida en el CHANGELOG como
  problema y no se resuelve acá.
- **Ninguna prueba renderiza el mensaje en un canal real**: el destino de Projects no
  está configurado. Lo que se verifica es el payload, que es lo que se envía.
- **El paso del workflow que mira el secret no se puede correr sin un dispatch real**:
  el banco ejecuta su `run:` con el entorno simulado y fija la forma del `env:`.
