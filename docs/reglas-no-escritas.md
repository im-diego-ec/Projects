# Reglas no escritas

Este archivo existe porque las reglas más caras del marco eran justamente
las que ningún archivo declaraba. Se practicaban, se transmitían en review
y en Slack, y sobrevivían mientras las mismas tres personas siguieran acá.
Cada una se compró con un incidente, una corrida perdida o una discusión
que no queremos repetir. Acá quedan escritas por primera vez.

**La premisa del marco**: un ritual que alguien debe recordar **no cuenta
como enforcement**. Solo cuentan los checks que fallan solos. Por eso cada
regla se registra con su estado real y, cuando todavía no es automática,
con la forma concreta de volverla automática. La suma de esas formas es el
[backlog de automatización](#backlog-de-automatización) del marco, y es un
producto del documento, no un apéndice.

## Cómo leer los estados

| Estado | Significa |
|---|---|
| 🟢 **AUTOMÁTICO** | Un check falla solo cuando alguien se aparta. No requiere que nadie se acuerde. |
| 🟡 **SEMIAUTOMÁTICO** | El marco lo empuja (plantilla, scaffold, hook local) pero se puede evadir sin que nada se ponga rojo. |
| 🔴 **DISCIPLINA** | Hoy depende de que una persona se acuerde. Es deuda declarada, no una preferencia. |

Y desde el 2026-08-21 hay un estado más, que no es un grado intermedio de los
otros tres sino una cosa distinta:

| Estado | Significa |
|---|---|
| 🟠 **MODO AVISO** | Existe un check, corre, mira y **anota** — y está declarado que **no es compuerta**. Se usa cuando la propiedad que la regla promete no se puede decidir con lo que el check puede leer, y la medición lo demuestra. Un 🟠 **no** es un 🟡: el 🟡 se puede evadir en silencio, el 🟠 avisa siempre y dice qué parte no acredita. |

**Por qué existe este estado.** Un check que se pone rojo por una propiedad que
no puede decidir se lee como compuerta sin serlo, y eso es peor que no tenerlo:
el verde de la corrida siguiente se interpreta como prueba. El estado nació con
dos residuos medidos (A01 y A16, las filas 15 y 16 del backlog) después de que
cuatro rondas cerraran los casos citados y la clase se abriera una capa más
adentro cada vez. La salida está habilitada por el change `rojo-primero`, ya en
main: *una regla sin compuerta sigue siendo válida, pero deja de leerse como si
estuviera enforzada*.

**La regla del 🟠**, para que no se vuelva un lugar donde esconder cosas:

1. El residuo se nombra **en la salida del propio paso**, con su medición, en
   toda corrida — **incluida la que sale verde**. Si sólo se nombrara cuando el
   check sospecha, no se nombraría nunca en los casos donde el check no sospecha,
   que son exactamente los falsos verdes.
2. Lo que el check **sí** verifica completo sigue siendo rojo. Bajar todo a aviso
   «por prolijidad» es cambiar de tema.
3. El agujero se fija como **caso de banco que afirma el agujero**, para que el
   día que se cierre el banco se caiga y se vea en el diff.

---

## 1. Tests ROJOS primero

**La regla.** El test se escribe **antes** del cambio y **debe verse
fallar**. No "se escribieron tests"; el rojo se evidencia y se registra:
en qué corrida, con qué mensaje de error. En el `tasks.md` del change eso
se anota junto a la tarea:

> `[x] 2.2 HECHO: 5 tests — ROJO evidenciado en CI (run 30670720618):
> carrera de reservas simultáneas, ambas 201 (double-booking real)`

En migraciones de datos el "test rojo" es la **verificación de invariantes
que hoy no se cumple**: se corre antes, falla, y esa es la prueba de que
mide lo que dice medir.

**Por qué.** Un test escrito después del arreglo prueba que el código hace
lo que hace. Solo el rojo previo prueba que el test **puede fallar** — que
no está afirmando `true == true` con pasos de más. En el proyecto piloto el
rojo previo cazó cosas que el arreglo solo, verde de entrada, habría
ocultado: una carrera real de doble reserva que devolvía dos 201, un
`0.10 × 3 = 0.30000000000000004` que vivía en las agregaciones y no en la
lectura individual, un endpoint que aceptaba identidad por el body del
request. Y en varios casos el rojo **cambió el diagnóstico**: el defecto no
estaba donde el diseño creía.

**Estado**: 🔴 DISCIPLINA. CI ve el verde final; no puede ver un rojo que
ocurrió antes. La evidencia hoy es una frase escrita a mano.

**Cómo volverla automática.**
- Check de PR: si el PR toca código de comportamiento, el `tasks.md` del
  bloque debe traer la marca de rojo evidenciado **con enlace** a la
  corrida o al commit del test rojo. Es un grep con criterio, barato de
  escribir, y convierte la frase en un enlace verificable.
- Complemento con más valor y más costo: cobertura **por diff** (líneas
  nuevas sin test = rojo). No prueba el orden, pero cierra el hueco de
  "cambio sin test", que es el que más veces se cuela.

---

## 2. Spike de "bloque 0" antes de comprometerse con una dependencia

**La regla.** Cuando un plan depende de que algo externo se comporte de
cierta forma —una librería, un servicio administrado, un runtime, una
integración— **el bloque 0 del `tasks.md` es un spike que lo prueba**, en
laboratorio o en el ambiente de desarrollo, **antes** de escribir la
primera línea del plan real. El spike tiene tres salidas posibles:
**VIABLE**, **VIABLE con hallazgos** (se anotan y modifican el plan), o
**plan B** (que se declara en el design *antes* de necesitarlo). El
resultado se escribe en la tarea, con fecha.

Cuando el spike descubre un contrato que hay que preservar, **se queda como
test permanente**. En el piloto uno de ellos verificaba que cierto punto de
enganche de una librería fuera observable; quedó como test propio, de modo
que un upgrade que rompa esa observabilidad se pone rojo en vez de degradar
en silencio a un comportamiento peor.

**Por qué.** El costo de descubrir que la suposición era falsa crece con lo
que ya construiste encima. Los spikes del piloto devolvieron, entre otros:
que la configuración de test necesitaba una opción sin la cual el DOM se
filtraba entre tests; que la URL "obvia" de un ambiente rompía todos los
requests por CORS y la buena era otra; que la suposición de un cambio de
contrato de fechas era **falsa** y el contrato que sí cambiaba era el de
dinero. Ninguno de los tres se descubre leyendo documentación.

Y hay un beneficio secundario que se nota tarde: el spike va **primero
porque es el riesgo más incierto**, no porque sea lo más fácil. Ordenar el
trabajo por incertidumbre en vez de por comodidad es lo que hace que las
malas noticias lleguen el día 1 y no el día 9.

**Estado**: 🟡 SEMIAUTOMÁTICO. La plantilla de `tasks.md` del marco trae el
bloque 0 y la costumbre está instalada, pero nada impide borrarlo.

**Cómo volverla automática.**
- Check de OpenSpec: si el `design.md` declara una dependencia nueva o un
  riesgo con plan B, el `tasks.md` **debe** tener bloque 0 con al menos una
  tarea. Es una relación estructural entre dos artefactos que ya se
  validan: cabe en el mismo guardrail.
- Convención de nombre para las ramas de spike (`feat/<change>-b0-spike`)
  para que el rastro exista aunque el spike se descarte.

---

## 3. Fail-open RUIDOSO

**La regla.** Cuando una detección automática falla o queda en duda, el
sistema **hace el trabajo completo y avisa**. Nunca omite en silencio.
Concretamente, en cualquier lógica de "esto se puede saltar porque...":

- la rama de duda va al camino **caro y seguro** (correr todo, desplegar
  todo, verificar todo);
- **y emite un `::warning::` con el motivo**. Sin aviso no hay fail-open,
  hay un agujero.

Es la contracara del fail-**closed** que gobierna la seguridad: en auth,
sin claim válido se rechaza. En optimizaciones del pipeline, ante la duda
se trabaja de más. La pregunta que decide cuál aplica es *¿qué pasa si me
equivoco en silencio?* — en seguridad, entra alguien; en el pipeline, se
saltea una verificación.

**Por qué.** El fail-open silencioso es peor que no tener la optimización:
te deja creyendo que la optimización funciona. Dos veces pasó lo mismo en
el piloto, con la misma forma:

- El carril rápido de docs nunca actuó durante días: el paso que listaba
  los archivos del PR daba 403 por un permiso faltante del token, el
  fail-open corría el CI completo y **nadie se enteró** porque no había
  aviso. Se descubrió mirando otra cosa.
- El reuso de verificación por tree hash falló en su debut por la misma
  causa (otro permiso faltante) y degradó a promoción completa. Esta vez se
  cazó rápido porque alguien sabía que el tree **sí** coincidía y el reuso
  debía haber aplicado — o sea, se cazó por conocimiento humano, no por el
  sistema.

Los comentarios en los workflows del piloto conservan la lección textual:
*"RUIDOSO a propósito: el fallo era silencioso y el carril rápido nunca
actuó — el fail-open lo tapaba"*.

**Estado**: 🟡 SEMIAUTOMÁTICO. El patrón está escrito en los workflows del
marco y se revisa en review, pero nada verifica que una rama de degradación
nueva traiga su aviso.

**Cómo volverla automática.**
- Lint de workflows: toda rama de degradación (`|| echo`, `|| true`,
  `continue-on-error`, un `catch` que sigue) debe emitir `::warning::` o
  `::notice::` con motivo. Es un check de texto sobre `.github/workflows/`,
  determinista y barato.
- Contador de avisos: el job final del pipeline reporta cuántos fail-open
  se activaron en la corrida. Un fail-open que se activa **siempre** es un
  bug disfrazado de tolerancia — y solo se ve contándolos.

---

## 4. Toda acción manual sobre un ambiente va por botón, no por `curl`

**La regla.** Disparar un proceso interno, forzar un barrido, sembrar
datos, re-ejecutar un job: **cada una es un `workflow_dispatch` con su
botón en Actions**, con inputs descritos. Nunca un `curl` desde la terminal
de alguien, nunca un script personal, nunca "lo corro yo que tengo el
token".

Corolario del mismo principio: **desplegar es solo por el pipeline**, y
probar una rama en el ambiente de desarrollo es un dispatch eligiendo la
rama — no un build local empujado a mano.

**Por qué.** Cuatro cosas que el botón da gratis y el `curl` no:

1. **Rastro.** Queda quién lo disparó, cuándo, con qué inputs y qué
   respondió. En un post-mortem, "alguien corrió el barrido como a las 4"
   es lo que separa treinta minutos de diagnóstico de dos.
2. **Permisos acotados.** El job asume el rol del pipeline, con sus
   permisos justos y por tiempo limitado. El `curl` corre con las
   credenciales personales de quien lo tipea, que casi siempre pueden más.
3. **El secreto no pasa por la terminal de nadie.** El job lo resuelve en
   el runner y lo enmascara en el log; nunca queda en un historial de
   shell, en un portapapeles ni en un mensaje.
4. **Repetible por cualquiera.** El botón lo aprieta quien esté disponible,
   incluso quien no sabe la forma exacta del request. Un `curl` que solo
   una persona sabe armar es una dependencia de esa persona.

En el piloto el ambiente de desarrollo **no** tiene disparo automático por
schedule a propósito (mantener recursos despiertos 24/7 cuesta), así que
todas las pruebas de procesos programados salen de estos botones, con un
input opcional para simular la fecha y ver el resultado en el canal
sandbox.

**Estado**: 🟡 SEMIAUTOMÁTICO. El marco trae los workflows de dispatch y
los guards estructurales que impiden que el ambiente de desarrollo toque el
mundo real, pero nada impide que alguien con credenciales haga el `curl`.

**Cómo volverla automática.**
- Los secretos operativos viven **solo** donde el pipeline los alcanza, y
  ninguna persona tiene lectura directa: sin token en la máquina, el
  `curl` no existe como opción.
- Los endpoints internos exigen un token que solo el rol del pipeline puede
  resolver, y **loguean el origen** de cada llamada. Una invocación desde
  fuera del pipeline es visible en los logs, no solo desaconsejada.
- Regla de repo: ningún script del proyecto ejecuta llamadas contra un
  ambiente desplegado fuera de `.github/workflows/`; check de texto.

---

## 5. Invariantes como propiedades, no como números

**La regla.** Toda verificación que decide si una migración o un proceso
masivo continúa o aborta se escribe como **propiedad**, no como cantidad
esperada:

- ✅ *"todas las filas siguen teniendo dueño"*, *"los conteos por día
  coinciden en ambas direcciones"*, *"no hay huérfanas en las cuatro
  tablas"*, *"un puesto tiene exactamente una fila"*.
- ❌ *"deben quedar 41 usuarios"*, *"deben migrarse 90 reservas"*.

**Por qué.** Un número esperado es correcto exactamente durante el ensayo y
falso para siempre después: alguien crea un registro entre el ensayo y la
ejecución real, y el invariante aborta una migración perfectamente sana. Es
un falso rojo, que es el tipo de fallo que enseña al equipo a ignorar los
rojos. La propiedad, en cambio, vale en el ensayo, en producción y dentro
de seis meses.

Del lado contrario, la propiedad **sí** caza lo que importa: en el piloto,
una migración de tipos de fecha se validó comparando conteos por día **en
ambas direcciones** dentro de la misma transacción, y ahí apareció un bug
de precedencia de SQL (`EXCEPT`/`UNION ALL` asocian a la izquierda) que se
cazó **antes de commitear**, reescribiendo el invariante con dos tablas
temporales.

Dos corolarios operativos, del mismo linaje:

- El invariante corre **dentro de la transacción** y aborta el cambio si no
  se cumple. Verificar después de commitear es escribir un post-mortem.
- Los números medidos sí se registran (el ensayo de restore anotó "5 min el
  cluster, 5 min la instancia, ~20 min el borrado"), pero como **dato para
  planificar**, jamás como condición de aprobación.

**Estado**: 🔴 DISCIPLINA. Se revisa en review de migraciones.

**Cómo volverla automática.**
- Lint sobre archivos de migración: marcar comparaciones contra literales
  numéricos dentro de bloques de invariante o de asserts. Alto ruido si se
  aplica a todo el archivo, útil si se acota a los bloques marcados como
  invariante — lo que a su vez exige una convención de marcado, que es la
  mitad barata de la automatización.
- Plantilla de migración en el scaffold con la sección de invariantes ya
  escrita como propiedades y el bloque transaccional armado. El camino
  fácil tiene que ser el correcto.

---

## 6. Auditar los permisos del token de un job ANTES del estreno

**La regla.** Cuando un job nuevo llama a una API —o cuando un job
existente estrena una llamada nueva— se audita **acción por acción** contra
los permisos de su token o rol, **antes** de la primera corrida real. Cada
job declara sus `permissions` explícitamente; ninguno hereda el default.

**Por qué.** Es la lección más repetida del piloto: **tres apariciones**,
la última anotada textualmente en el workflow —*"TERCERA aparición de la
lección: cada llamada nueva de un job se audita contra los permisos de su
token ANTES del estreno"*—. Las tres veces el patrón fue idéntico: falta un
permiso, la API devuelve 403, y **el fail-open convierte el 403 en un
comportamiento degradado que parece normal**. Ver también la regla 3: estas
dos reglas son la misma lección vista desde los dos extremos, y por eso la
combinación es tan cara — el permiso faltante no rompe nada, solo apaga en
silencio la optimización que acabás de construir.

Segundo motivo, independiente: declarar `permissions` por job es el
principio de menor privilegio en el único lugar donde es barato. El default
de un token de CI puede tener bastante más de lo que ese job necesita, y
`contents: read` explícito no cuesta nada.

**Estado**: 🔴 DISCIPLINA, con una parte trivialmente automatizable que es
el mejor primer paso del backlog.

**Cómo volverla automática.**
- **Check duro y barato**: todo job de todo workflow declara un bloque
  `permissions:` explícito. Es un parse de YAML de veinte líneas y elimina
  la clase entera de "heredé lo que había".
- Los pasos que llaman a la API del proveedor **distinguen 403 de "no hay
  datos"**: un 403 es error de configuración y va a rojo o a `warning`
  nombrando el permiso faltante, jamás al mismo camino que "no encontré
  nada".
- Estreno en seco: el debut de un job nuevo corre primero en una rama, con
  su salida esperada declarada en el PR. Barato, y convierte el estreno en
  una verificación en vez de una apuesta.

---

## 7. Suite local antes del push

**La regla.** La suite corre **en la máquina** antes de cada push. CI es la
corrida **vinculante**, no el banco de pruebas.

**Por qué.** No es una cuestión de costo de minutos de CI: es de ciclo de
atención. Empujar para ver qué dice CI cuesta entre cinco y quince minutos
por iteración, durante los cuales el problema se enfría y quien esperaba el
pipeline queda detrás de tu cola. Un fallo trivial de lint descubierto en
CI cuesta un ciclo completo; el mismo fallo en local cuesta veinte
segundos.

Hay un segundo efecto, más importante: cuando CI es el banco de pruebas, la
historia del branch se llena de commits "fix ci", "otra vez", "ahora sí", y
esa historia es la que alguien va a leer dentro de un año buscando por qué
algo quedó así.

**Estado**: 🔴 DISCIPLINA pura. Ninguna máquina puede saber si corriste
algo antes de empujar.

**Cómo volverla automática.**
- Hook `pre-push` en el scaffold, instalado por el `setup` del proyecto vía
  `core.hooksPath` (versionado en el repo, no en `.git/`): corre lint +
  typecheck + la suite rápida. Se puede saltar con `--no-verify`, y está
  bien: el objetivo es que el camino fácil sea el correcto, no bloquear a
  quien sabe lo que hace.
- Un comando único y memorable (`pnpm verificar`) que corra **exactamente**
  lo que corre CI en el carril de código. Si el comando local y el de CI
  divergen, la regla se muere sola porque deja de servir.

---

## 8. Ramas siempre desde `main` actualizado

**La regla.** Una sola operación, atómica, sin excepciones:

```bash
git checkout main && git pull --ff-only && git checkout -b feat/<nombre>
```

Y antes de abrir el PR: **mirar la lista de commits**. Si aparece algo que
no escribiste, ramificaste desde el lugar equivocado o te falta un rebase.

**Por qué.** Ramificar desde una rama de trabajo, o desde un `main` de hace
tres días, produce PRs que arrastran commits ajenos. Eso rompe tres cosas a
la vez: el review (el revisor no distingue tu cambio del ruido), la
historia (el mismo cambio aparece dos veces) y la promoción (el pipeline
verifica un contenido que no es el que creés). En el modelo trunk-based del
[ADR 002](adr/002-trunk-based-promocion.md), donde `main` es la única rama
permanente y el reuso de verificación se decide **por el tree hash del
contenido**, una rama con base vieja es directamente un contenido distinto
del que se verificó.

**Estado**: 🟡 SEMIAUTOMÁTICO — y de las pocas que tienen un botón oficial
sin escribir código.

**Cómo volverla automática.**
- En el ruleset de `main`: **exigir que la rama esté al día antes de
  mergear** más **historia lineal**. Es configuración, no código, y elimina
  el modo de fallo más caro.
- Alias o script en el scaffold (`nueva-rama <nombre>`) que haga la
  secuencia completa: hace más cómodo hacerlo bien que hacerlo mal.

---

## 9. PRs con `Closes` desde la creación

**La regla.** Todo PR de bloque lleva **`Closes #<sub-issue>` en el cuerpo,
desde que se crea** — no agregado después, no en un comentario. La relación
bloque ↔ PR es 1:1. El `Closes` apunta **solo** al sub-issue; el issue
macro del change lo cierra únicamente el PR final.

La evidencia del bloque se comenta **en el sub-issue, antes del merge**; el
merge lo cierra solo. **Los sub-issues no se cierran a mano.**

**Por qué.** Porque un `ref #N` en texto plano **no enlaza nada**. Se ve
igual en el cuerpo del PR, parece que documenta la relación, y la sección
Development de ambos lados queda vacía: el tablero no refleja el trabajo, y
al cerrar el change hay que reconstruir a mano qué PR resolvió qué. Es un
error que se cometió y se corrigió en el piloto, cazado en review.

Y "desde la creación" no es cosmético: agregarlo después funciona para el
cierre, pero durante toda la vida del PR el tablero miente, que es
exactamente cuando alguien lo mira para saber qué está en curso.

**Estado**: 🔴 DISCIPLINA. Es, junto con la regla 6, el candidato más
barato del backlog.

**Cómo volverla automática.**
- Check de PR: el cuerpo debe contener `Closes #<n>` (con excepciones
  declaradas por etiqueta para el PR final de un change y para los de solo
  docs). Una expresión regular; el PR se pone rojo hasta que exista el
  enlace.
- Plantilla de PR en el scaffold con la línea `Closes #` ya puesta y vacía:
  cuesta más borrarla que completarla.

---

## 10. Convención de mensajes de commit

**La regla.** Cuatro elementos, en este orden:

```
tipo(alcance): qué cambió, en español y en indicativo (change <nombre>)
```

1. **Conventional commits**: `feat`, `fix`, `docs`, `chore`, `refactor`,
   con alcance entre paréntesis (`api`, `web`, `pipeline`, `openspec`,
   `infra`, `marco`).
2. **En español**, y describiendo el **efecto**, no la operación. No
   *"actualiza el archivo de specs"* sino *"los specs dejan de describir un
   pipeline que nadie corre"*. El asunto se lee como una afirmación sobre
   el sistema después del commit.
3. **El change entre paréntesis al final** cuando el commit pertenece a un
   change de OpenSpec: `(change carril-docs-completo)`. Es lo que permite
   reconstruir un change desde el log sin abrir el archive.
4. **Atribución de quién cazó el error**, cuando corresponde:
   `(cazado por <handle>)`, `(aporte de <handle>)`, `(corrección de
   <handle>)`. Va en el asunto, no escondida en el cuerpo.

Ejemplos del piloto, con los handles parametrizados:

```
fix(pipeline): serializar Deploy — dev compartido no se pisa (cazado por {{BUILDER_1}})
feat(pipeline): reuso de verificacion por tree hash (aporte de {{BUILDER_1}})
fix(openspec): el scenario conserva su titulo — el guardrail de deltas cazo el retitulado como perdida
docs(openspec): carril-docs-completo cerrado y archivado — 2/2, estreno en un acto
```

**Por qué.** El log es el índice de búsqueda que más se usa y el único que
nunca se desactualiza. Un asunto que dice el efecto contesta *"¿cuándo
empezó a pasar esto?"* con un `git log --oneline`; uno que dice la
operación obliga a abrir el diff.

La atribución merece su propio párrafo porque es la parte que parece
opcional y no lo es. Reconocer en el log a quien cazó el problema hace tres
cosas: le da valor visible a revisar en serio (el review deja de ser un
trámite), deja rastro de **cómo** se encontró el fallo —dato de oro para
el post-mortem y para decidir qué automatizar—, y separa culpa de crédito
en la dirección correcta: **acá se nombra a quien encuentra, nunca a quien
introduce**. Es la misma regla del post-mortem sin culpas, aplicada al
día a día.

**Estado**: 🔴 DISCIPLINA (los elementos 1 a 3; el 4 es cultura y no se
automatiza — ni debería).

**Cómo volverla automática.**
- `commitlint` con la configuración del marco (tipos y alcances
  permitidos), corriendo en el hook `commit-msg` local **y** como check
  sobre los commits del PR. Cubre el elemento 1 por completo.
- Check de OpenSpec: si la rama es de un change, los commits deben citar el
  change entre paréntesis. Cubre el 3.
- El 2 y el 4 no se automatizan: viven en el review y en esta página.

---

## Backlog de automatización

Ordenado por relación valor/costo. Los primeros tres son días-hombre de
una tarde entre todos y cierran las clases de error más caras.

| # | Check a construir | Cierra la regla | Costo | Estado hoy |
|---|---|---|---|---|
| 1 | Todo job declara `permissions:` explícito | 6 | bajo | 🔴 |
| 2 | El cuerpo del PR contiene `Closes #<n>` | 9 | bajo | 🔴 |
| 3 | Ruleset: rama al día antes de mergear + historia lineal | 8 | bajo (config) | 🟡 |
| 4 | `commitlint` en hook y en PR | 10 | bajo | 🔴 |
| 5 | Hook `pre-push` versionado + `pnpm verificar` idéntico a CI | 7 | bajo | 🔴 |
| 6 | Lint de workflows: toda degradación emite `::warning::` | 3 | medio | 🟡 (el lint ya existe: `actionlint` + `shellcheck` en el job `higiene`; falta la regla propia del `::warning::`) |
| 7 | Los pasos que llaman a la API distinguen 403 de "sin datos" | 3 y 6 | medio | 🔴 |
| 8 | Guardrail OpenSpec: `design` con dependencia nueva ⇒ `tasks` con bloque 0 | 2 | medio | 🟡 |
| 9 | Check de PR: rojo evidenciado con enlace en el `tasks.md` | 1 | medio | 🔴 |
| 10 | Cobertura por diff (líneas nuevas sin test) | 1 | alto | 🔴 |
| 11 | Plantilla de migración con invariantes de propiedad + lint de literales | 5 | alto | 🔴 |
| 12 | Contador de fail-open activados por corrida | 3 | medio | 🔴 |
| 13 | Un cambio a la definición del pipeline NO puede viajar por el carril rápido | — | bajo | 🔴 |
| 14 | Publicar una versión del marco AVISA a los consumidores | — | bajo | 🔴 |
| 15 | **A01** — que el rojo de la compuerta LLEGUE al check requerido | — | alto | 🟠 |
| 16 | **A16** — que un permiso de allowlist no autorice descargar sin pinar | — | alto | 🟠 |
| ~~20~~ | ~~«El CHANGELOG es obligatorio en el PR que introduce el cambio» esta enunciado y no tiene check~~ **CERRADO el 2026-08-23**: el job `changelog-en-el-pr` del `ci.yml` del marco exige que un PR que toque `actions/`, `.github/workflows/`, `plantilla/` o `herramientas/` toque tambien `CHANGELOG.md`, con el arreglo en el mensaje. Se estreno en ROJO y no en aviso, contra lo que esta fila proponia: la regla del modo aviso protege a los CONSUMIDORES de un rojo que nadie les anuncio, y este check vive en el ci.yml de Projects — no viaja a ninguno. Un aviso dirigido a quien lo escribio no avisa nada. Banco: `pruebas/ci-del-marco/changelog-en-el-pr.test.mjs`, 8 casos, que EXTRAE el script del YAML en vez de copiarlo, e incluye el rojo, el fail-closed cuando la base no resuelve, y que un diff vacio no se reporte como exito |
| 19 | El pin interno del marco se repite en veintiun lugares en vez de derivarse | Desde que `v1` dejo de ser el canal, `marco-ci.yml` referencia a sus actions hermanas por version exacta, y la version aparece tambien en `actions/README.md`, el andamio y las skills. Son **veintiun** literales en siete archivos que el release tiene que mover juntos (contados el 2026-08-22 con el grep que declara la skill del release; la fila decia catorce). NO es disciplina —`pruebas/andamio/pinado.test.mjs` se pone rojo si uno queda atras— pero sigue siendo repeticion, y el rojo llega en el PR de release y no antes. La version derivada existe y no se hizo por no poder verificar su contrato desde esta maquina: GitHub expone `github.job_workflow_ref` a un workflow reusable y `GITHUB_ACTION_REF` a una composite action, las dos con el ref con el que se resolvieron, asi que un paso podria emitir el pin en vez de repetirlo. Requiere confirmar el formato exacto de esas variables contra la documentacion antes de depender de ellas |
| 18 | El check del pin del andamio mira `uses:`, no la prosa | `pruebas/andamio/pinado.test.mjs` verifica que ningun `uses:` del marco apunte a `@v1` y que todo pin exacto sea la version mas alta del CHANGELOG. La PROSA queda fuera a proposito: un primer intento la incluia y se puso rojo con cuatro hallazgos que eran todos correctos —el `grep -nE` de la verificacion de la skill de adopcion, el `sed -E` de projects-validar-consumidor, un `@vX.Y.Z` de documentacion y un marcador `@<version exacta>`—. Distinguir un ref inventado de un regex citado en prosa no es decidible con un escaneo de texto, y un check que se pone rojo cuando la documentacion esta BIEN escrita ensena a ignorarlo. Consecuencia: un `@v1` en la prosa del andamio lo caza el review, no el check. La version derivada exige que el andamio no escriba refs en prosa: que cada mencion sea una transclusion del pin real, y para eso hace falta un paso de render que hoy no existe |
| 17 | La exencion de este check para lo GENERADO es por extension, no por origen | El paso de ejecutores pinados exime `.md` y `.mdc` por pathspec. Un artefacto generado no es codigo que alguien pueda arreglar —el marco ya tiene esa regla escrita para el formateador— pero la exencion adivina el origen por la extension del archivo. Una superficie de agente nueva que renderice a `.txt` o `.toml` vuelve a caer. Medido el 2026-08-21: `.cursor/rules/00-marco.mdc` puso en rojo a proyecto-origen con la prosa de la propia regla del pin citando `npx --yes openspec` como contraejemplo. La version derivada exige que `actions/constitucion` publique sus rutas como output y que el paso las reciba entre jobs. Se intento filtrar por el SELLO del artefacto y una prueba del banco lo rechazo con razon: «el sello lo valida UNA sola pieza», y dos lugares interpretando el mismo sello es el defecto de las 12 contra 64 posiciones hex de esta semana |

> **Sobre la fila 13**, que nació de un incidente doble el 2026-08-19: el carril
> rápido trata la definición del pipeline como "no se sirve en runtime" y la
> deja pasar sin ejecutar nada. Consecuencia: **un cambio a cómo corre la
> verificación viaja por el carril que no corre la verificación**. Pasó dos
> veces el mismo día —el arreglo del job de E2E y después sus dos correcciones—
> y las dos veces el defecto se descubrió recién con un disparo manual. No es
> un caso raro: es estructural, y el síntoma es siempre el mismo, un verde que
> no verificó nada. La corrección probable es acotar el patrón del carril para
> que la definición del pipeline quede fuera, no agregar un check nuevo.

> **Sobre la fila 14.** El CHANGELOG y el release son superficie de **consulta**,
> no de notificación. Con `@v1` móvil, un consumidor recibe comportamiento nuevo
> —incluido un check que lo pone en rojo— **sin haber leído nunca nada**. Pasó el
> 2026-08-19: al mover `v1`, el segundo consumidor quedó a un push de un rojo que
> nadie le anunció. Con dos consumidores se tapa con un mensaje a mano; con cinco
> no. El aviso es barato: la entrada del CHANGELOG **ya escribe por versión** qué
> tiene que hacer un consumidor — solo falta empujarla al canal del área en vez de
> esperar que alguien la busque.

> **Sobre la fila 15 (A01)**, declarada en 🟠 MODO AVISO el 2026-08-21 por
> decisión del Builder 1. El modo `cableado` de `actions/constitucion` verifica cinco
> condiciones, y la quinta promete que *un rojo de la compuerta impide que `ci-ok`
> salga verde*. Eso es una propiedad de un **CAMINO** —del job de la compuerta,
> por cada eslabón de `needs`, hasta el check run cuyo nombre exige el ruleset— y
> lo que el check verifica es un **patrón sintáctico sobre un NODO**.
>
> **La medición**, con oráculo semántico independiente: **70 falsos verdes sobre
> 2928 casos generados**, una sola clase. Su representante más corto es un paso de
> `ci-ok` con `if: needs.<job>.result == 'success'`: el patrón exige que algún paso
> vivo CONSULTE `needs.<job>.result`, y ese `if` lo nombra — pero cuando la
> constitución falla el `if` es falso, **el paso se saltea, el job concluye
> `success`** y el rojo no llega al check requerido. O sea: la compuerta se
> satisface **salteándose**.
>
> **Qué queda enforzado y qué no.** El corte es por clase de veredicto, no por
> caso: los hechos del **grafo** siguen siendo rojos (que exista el check run del
> veredicto, que cuelgue de la compuerta por `needs`, que declare `if: always()`,
> que ningún nodo del camino lave el rojo con `continue-on-error` o un `if`
> constante falso, más las condiciones 1 a 4: rastreada, primer nivel, modo
> verificar, disparada en el camino del cambio). Lo que baja a aviso es «ningún
> paso vivo consulta el `result`», que se decide **leyendo** el texto de los pasos:
> es la regla cuyo lado de aceptación quedó refutado, y una regla así no puede
> presentar su lado de rechazo como compuerta. Un primer corte que mandaba toda la
> condición 5 al aviso apagaba las seis ortografías del `continue-on-error` del
> veredicto y el caso del eslabón que lava el rojo — medido, 15 casos del banco en
> rojo — y se descartó por eso.
>
> **Cómo se cierra.** No con una lectura más fina: la salida estructural es que el
> **veredicto lo emita el marco** en vez del `run:` de cada consumidor. Mientras el
> texto que decide viva en el shell de cada repo, cerrarlo exige decidir el
> comportamiento de un shell arbitrario. Fijado en
> `actions/constitucion/pruebas/modo-aviso-camino.test.mjs`.

> **Sobre la fila 16 (A16)**, declarada en 🟠 MODO AVISO el 2026-08-21 por decisión
> del Builder 1. El paso «Ejecutores de paquetes pinados» exige que todo ejecutor que
> DESCARGA lleve su paquete con versión exacta, y dentro de un allowlist de agente
> ponía rojo lo indeterminado. El problema es que el alfabeto compara el gestor y
> su subcomando **por igualdad exacta** contra tokens que traen la puntuación del
> lenguaje anfitrión.
>
> **La medición** del 2026-08-21, cinco entradas que escriben el **mismo** permiso:
>
> | Entrada del allowlist | Exit | Anotaciones |
> |---|---|---|
> | `Bash(npm *)` | 0 | 0 |
> | `Bash(pnpm *)` | 0 | 0 |
> | `Bash(yarn *)` | 0 | 0 |
> | `Bash(bun *)` | 0 | 0 |
> | `Bash(npx *)` | 1 | 1 |
>
> Misma herramienta, **una ortografía de diferencia**. Con el comodín PEGADO
> (`:*`) el recorte lo saca y la entrada se lee; con el comodín SEPARADO por un
> espacio no hay nada que recortar, el token que sigue al gestor no es ninguno de
> sus subcomandos, no hay ocurrencia y la línea sale muda. Un ejecutor **directo**
> no tiene subcomando, así que ahí el comodín cae en el lugar del paquete y sí se
> lee: de ahí la asimetría.
>
> **Qué queda enforzado y qué no.** Un paquete **legible** sin versión exacta
> sigue siendo rojo — ahí vive la forma en que el problema apareció de verdad,
> `Bash(npx --yes openspec:*)` con el squatter de `openspec`, y sigue midiendo
> exit 1. Lo **indeterminado** pasa a aviso con el residuo nombrado: poner rojo
> sólo la ortografía que este lector alcanza es enforzar una ortografía y llamarla
> compuerta.
>
> **Cómo se cierra.** No agrandando la lista de ortografías, que es lo que
> fracasó cuatro veces: el comodín de un allowlist es la puntuación de un LENGUAJE
> DE PATRONES, no de una línea de comandos, así que la entrada hay que leerla como
> patrón —«qué comandos autoriza esto»— y no como invocación. Fijado en
> `pruebas/marco-ci/casos/ejecutores.md` (los dos casos
> `residuo-comodin-separado-*`) y en el corpus generado con la clase `residuo`.

**Cómo se cierra una fila**: el check se construye en Projects (referenciado,
para que llegue a todos los proyectos de una), la regla cambia de estado en
esta página, y la fila sale de la tabla. Una fila que lleva meses acá es
una regla que el marco decidió no hacer cumplir — y eso es una decisión
válida, pero que se toma a propósito y no por olvido.

---

## Lo que YA es automático

Para no confundir deuda con vacío. Estas reglas **no** están en la lista de
arriba porque un check ya falla solo cuando alguien se aparta:

> Dónde vive cada uno, para no leer de más: la validación estricta de OpenSpec,
> el guardrail de deltas y el veredicto que reporta en los dos carriles los trae
> Projects como pieza **referenciada** (`marco-ci.yml` y las composite actions), y
> un proyecto los hereda con `uses: ...@v1` sin escribir nada. El resto es
> **contrato del marco** —lo especifica `openspec/specs/`— y lo ejecuta el
> pipeline de cada proyecto. La protección de `main` es un acto humano
> deliberado y su estado real se documenta en cada repo
> (`.github/proteccion-main.md`).

- Lint sin warnings (`--max-warnings=0`), typecheck, suites y build en CI.
- `openspec validate --all --strict` en todo PR y push, en los dos carriles.
- Guardrail de deltas: un `MODIFIED` que omite escenarios vigentes no pasa.
- El check requerido reporta en **ambos** carriles (código y docs), así que
  un PR de solo docs puede mergearse y uno de código no puede escaparse.
- Review cruzado: CODEOWNERS asigna al par que no escribió el cambio.
- `main` protegida: solo avanza por PR.
- Deploys serializados con cola, nunca cancelados. **Dejó de ser prosa y pasó
  a ser contrato** (`despliegue-ci`, change `marco-se-cumple-solo`), pero su
  check automático todavía no existe: la serialización se configura en el
  workflow de despliegue, que el marco aún no provee. Llega con el esqueleto de
  entrega, cuyo design ya está decidido: la mecánica de cada compuerta sube al
  marco como pieza referenciada y la topología queda en el proyecto, verificada
  estáticamente. Hasta entonces es contrato verificable en revisión, no check — y por
  eso figura acá con asterisco en vez de contarse como cerrado.
- Producción solo por promoción: sin smoke y E2E de dev en verde, el deploy
  a producción no arranca.
- `verificar-prod` al final del deploy, con aviso al canal de alertas.
- Guard estructural de ambiente: el modo real de las integraciones exige
  ambiente de producción, así que el de desarrollo no puede contactar
  usuarios reales aunque alguien se equivoque.
- Dependabot semanal con la política de merge por tipo de bump.

---

## Cómo entra una regla nueva acá

El ciclo completo, que es también el ciclo de vida del marco:

1. **Un incidente o un review** deja una lección.
2. El **post-mortem** la escribe como regla en su sección *Lecciones*
   (plantilla en [plantillas/postmortem.md](plantillas/postmortem.md)).
3. La regla **aterriza en un archivo**: la constitución del repo si es una
   frontera, un [ADR](adr/) si es estructural, un runbook si es operativa,
   **o esta página si es una práctica sin lugar propio**.
4. Se le asigna **estado** (🟢/🟡/🔴) y, si no es 🟢, su fila en el backlog.
5. Cuando el check existe, **la regla sale del backlog** y se anota en
   [lo que ya es automático](#lo-que-ya-es-automático).

Una lección que se queda en el paso 1 se olvida en dos semanas. Una que
llega al 3 sobrevive a la memoria del equipo. Una que llega al 5 sobrevive
al equipo.
